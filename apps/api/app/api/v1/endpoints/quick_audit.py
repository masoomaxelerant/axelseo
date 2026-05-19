"""Public quick audit endpoint — no auth required.

Runs a single-page SEO check and returns results directly.
Does NOT save to the database. Used for the homepage free audit.
"""

import asyncio

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, HttpUrl

from app.core.logging import get_logger
from app.core.config import settings

logger = get_logger(__name__)
router = APIRouter()


class QuickAuditRequest(BaseModel):
    url: HttpUrl


@router.post("/quick-audit")
async def quick_audit(payload: QuickAuditRequest):
    """Run a single-page SEO audit without authentication.

    Returns scores, top issues, and Core Web Vitals.
    No data is saved — anonymous users get results but can't persist them.
    """
    url = str(payload.url)
    logger.info("quick_audit.starting", url=url)

    try:
        # Run crawler on single page
        from axelseo_crawler import CrawlConfig, Crawler

        config = CrawlConfig(
            start_url=url,
            max_pages=1,
            max_depth=1,
            concurrency=1,
            requests_per_second=5.0,
            page_timeout_ms=15_000,
            respect_robots_txt=True,
            block_resources=True,
            take_screenshots=False,
        )

        crawled_pages = []
        async with Crawler(config) as crawler:
            async for page in crawler.crawl():
                crawled_pages.append(page)

        if not crawled_pages:
            raise HTTPException(status_code=400, detail="Could not fetch the page")

        # Run auditor (no Lighthouse for speed — use PSI API inline)
        from axelseo_auditor import AuditConfig, Auditor

        audit_config = AuditConfig(
            run_lighthouse=False,  # We'll call PSI separately below
        )
        auditor = Auditor(audit_config)
        audit_result = await auditor.analyze(crawled_pages)

        # Run PageSpeed Insights for scores (single page, both presets not needed for quick check)
        from axelseo_auditor.lighthouse import run_lighthouse

        psi_key = settings.psi_api_key or None
        lh_result = await run_lighthouse(url, timeout_seconds=60, preset="mobile", psi_api_key=psi_key)

        scores = {
            "seo": audit_result.scores.seo,
            "performance": lh_result.performance if lh_result else 0,
            "accessibility": lh_result.accessibility if lh_result else 0,
            "best_practices": lh_result.best_practices if lh_result else 0,
        }

        cwv = {
            "lcp_ms": lh_result.lcp_ms if lh_result else None,
            "inp_ms": lh_result.inp_ms if lh_result else None,
            "cls": lh_result.cls if lh_result else None,
        }

        # Build issue summary
        issues = audit_result.issues
        critical = sum(1 for i in issues if i.severity.value in ("critical", "error"))
        warning = sum(1 for i in issues if i.severity.value == "warning")
        info = sum(1 for i in issues if i.severity.value == "info")

        top_issues = [
            {"severity": i.severity.value, "category": i.category, "message": f"{i.message} — {i.how_to_fix}"}
            for i in issues[:15]
        ]

        logger.info("quick_audit.complete", url=url, seo=scores["seo"], issues=len(issues))

        return {
            "url": url,
            "scores": scores,
            "issues_summary": {
                "critical": critical,
                "warning": warning,
                "info": info,
                "total": len(issues),
            },
            "top_issues": top_issues,
            "cwv": cwv,
            "pages_crawled": 1,
        }

    except HTTPException:
        raise
    except Exception as e:
        logger.error("quick_audit.failed", url=url, error=str(e))
        raise HTTPException(status_code=500, detail=f"Audit failed: {str(e)}")


class QuickPdfRequest(BaseModel):
    url: str
    scores: dict
    issues_summary: dict
    top_issues: list
    cwv: dict


@router.post("/quick-audit/pdf")
async def quick_audit_pdf(payload: QuickPdfRequest):
    """Generate a PDF from quick audit results — no auth, no DB."""
    import subprocess, json, tempfile, os
    from fastapi.responses import Response

    def _cwv_rating(value: float, good: float, mid: float) -> str:
        if value <= good: return "good"
        if value <= mid: return "needs-improvement"
        return "poor"

    lcp = payload.cwv.get("lcp_ms") or 0
    inp = payload.cwv.get("inp_ms") or 0
    cls_val = payload.cwv.get("cls") or 0
    domain = payload.url.split("//")[1].split("/")[0] if "//" in payload.url else payload.url

    pdf_input = {
        "audit": {
            "id": "quick",
            "url": payload.url,
            "auditDate": __import__("datetime").datetime.now().isoformat(),
            "pagesCrawled": 1,
            "maxPages": 1,
            "scores": {
                "seo": payload.scores.get("seo", 0),
                "performance": payload.scores.get("performance", 0),
                "accessibility": payload.scores.get("accessibility", 0),
                "bestPractices": payload.scores.get("best_practices", 0),
            },
            "coreWebVitals": {
                "lcp": {"value": lcp, "rating": _cwv_rating(lcp, 2500, 4000)},
                "inp": {"value": inp, "rating": _cwv_rating(inp, 200, 500)},
                "cls": {"value": cls_val, "rating": _cwv_rating(cls_val, 0.1, 0.25)},
            },
            "issues": [
                {
                    "severity": "critical" if i.get("severity") in ("critical", "error") else i.get("severity", "info"),
                    "category": i.get("category", ""),
                    "message": i.get("message", "").split(" — ")[0],
                    "howToFix": i.get("message", "").split(" — ")[1] if " — " in i.get("message", "") else "",
                    "pagesAffected": 1,
                }
                for i in payload.top_issues
            ],
            "siteStructure": {"totalPages": 1, "maxDepth": 1, "brokenLinks": 0, "redirectChains": 0, "orphanPages": 0, "avgLoadTimeMs": 0},
            "keywords": [],
            "pages": [{"url": payload.url, "title": None, "statusCode": 200, "score": None, "loadTimeMs": 0, "issues": payload.issues_summary.get("total", 0)}],
        },
        "client": {"name": "Quick Audit", "domain": domain},
        "consultant": {"name": "AxelSEO", "email": "seo@axelerant.com", "title": "SEO Audit Tool"},
        "options": {"includeAppendix": False, "whitelabel": False},
    }

    with tempfile.NamedTemporaryFile(mode="w", suffix=".json", delete=False) as f:
        json.dump(pdf_input, f)
        json_path = f.name

    pdf_path = json_path.replace(".json", ".pdf")
    project_root = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", "..", "..", "..", ".."))
    pdf_gen_dir = os.path.join(project_root, "packages", "pdf-generator")

    try:
        proc = subprocess.run(
            ["npx", "ts-node", "src/cli.ts", json_path, "-o", pdf_path, "--no-appendix"],
            cwd=pdf_gen_dir,
            capture_output=True, text=True, timeout=120,
        )
        if proc.returncode != 0 or not os.path.exists(pdf_path):
            logger.error("quick_pdf.failed", stderr=proc.stderr[:500])
            raise HTTPException(status_code=500, detail="PDF generation failed")

        with open(pdf_path, "rb") as f:
            pdf_bytes = f.read()

        return Response(
            content=pdf_bytes,
            media_type="application/pdf",
            headers={"Content-Disposition": f'attachment; filename="axelseo-quick-{domain}.pdf"'},
        )
    finally:
        for path in [json_path, pdf_path]:
            if os.path.exists(path):
                os.unlink(path)
