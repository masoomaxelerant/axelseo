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
            max_depth=0,
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
