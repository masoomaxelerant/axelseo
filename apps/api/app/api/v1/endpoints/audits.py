import uuid

from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import Response
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.auth import get_clerk_user_id
from app.core.database import get_db
from app.core.logging import get_logger
from app.models.audit import Audit
from app.schemas.audit import AuditCreate, AuditListResponse, AuditResponse

logger = get_logger(__name__)
router = APIRouter()


@router.post("/", response_model=AuditResponse, status_code=201)
async def create_audit(
    payload: AuditCreate,
    db: AsyncSession = Depends(get_db),
    clerk_user_id: str = Depends(get_clerk_user_id),
):
    logger.info("audit.creating", url=str(payload.url), user=clerk_user_id)

    audit = Audit(
        url=str(payload.url),
        project_id=payload.project_id,
        max_pages=payload.max_pages,
        status="pending",
        status_message="Audit queued, waiting to start...",
    )
    db.add(audit)
    await db.commit()
    await db.refresh(audit)

    try:
        from app.worker.tasks import run_audit
        task = run_audit.delay(str(audit.id))
        audit.celery_task_id = task.id
        await db.commit()
        await db.refresh(audit)
        logger.info("audit.queued", audit_id=str(audit.id), task_id=task.id)
    except Exception as e:
        logger.warning("audit.dispatch_failed", audit_id=str(audit.id), error=str(e))

    return audit


@router.get("/", response_model=list[AuditListResponse])
async def list_audits(
    project_id: uuid.UUID | None = None,
    db: AsyncSession = Depends(get_db),
    clerk_user_id: str = Depends(get_clerk_user_id),
):
    query = select(Audit).order_by(Audit.created_at.desc()).limit(50)
    if project_id:
        query = query.where(Audit.project_id == project_id)
    result = await db.execute(query)
    return result.scalars().all()


@router.get("/{audit_id}", response_model=AuditResponse)
async def get_audit(
    audit_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    clerk_user_id: str = Depends(get_clerk_user_id),
):
    result = await db.execute(select(Audit).where(Audit.id == audit_id))
    audit = result.scalar_one_or_none()
    if not audit:
        raise HTTPException(status_code=404, detail="Audit not found")
    return audit


@router.get("/{audit_id}/detail")
async def get_audit_detail(
    audit_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    clerk_user_id: str = Depends(get_clerk_user_id),
):
    """Full audit detail with issues and site structure stats."""
    from app.models.audit import AuditPage, PageIssue
    from sqlalchemy import func

    result = await db.execute(select(Audit).where(Audit.id == audit_id))
    audit = result.scalar_one_or_none()
    if not audit:
        raise HTTPException(status_code=404, detail="Audit not found")

    # Fetch issues
    issues_result = await db.execute(
        select(PageIssue).where(PageIssue.audit_id == audit_id)
    )
    issues = issues_result.scalars().all()

    # Fetch page stats
    pages_result = await db.execute(
        select(
            func.count(AuditPage.id).label("total"),
            func.avg(AuditPage.load_time_ms).label("avg_load"),
        ).where(AuditPage.audit_id == audit_id)
    )
    page_stats = pages_result.one()

    broken_count = (await db.execute(
        select(func.count()).where(AuditPage.audit_id == audit_id, AuditPage.status_code >= 400)
    )).scalar() or 0

    return {
        **{
            "id": str(audit.id),
            "project_id": str(audit.project_id) if audit.project_id else None,
            "url": audit.url,
            "status": audit.status,
            "status_message": audit.status_message,
            "pages_crawled": audit.pages_crawled,
            "max_pages": audit.max_pages,
            "score_performance": audit.score_performance,
            "score_accessibility": audit.score_accessibility,
            "score_best_practices": audit.score_best_practices,
            "score_seo": audit.score_seo,
            "lcp_ms": audit.lcp_ms,
            "inp_ms": audit.inp_ms,
            "cls": audit.cls,
            "celery_task_id": audit.celery_task_id,
            "created_at": audit.created_at.isoformat(),
            "completed_at": audit.completed_at.isoformat() if audit.completed_at else None,
        },
        "issues": [
            {
                "id": str(i.id),
                "page_url": i.page_url,
                "severity": i.severity,
                "category": i.category,
                "message": i.message,
            }
            for i in issues
        ],
        "site_structure": {
            "total_pages": page_stats.total or 0,
            "broken_links": broken_count,
            "avg_load_time_ms": round(page_stats.avg_load or 0, 1),
        },
    }


@router.get("/{audit_id}/pages")
async def get_audit_pages(
    audit_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    clerk_user_id: str = Depends(get_clerk_user_id),
):
    from app.models.audit import AuditPage
    result = await db.execute(
        select(AuditPage)
        .where(AuditPage.audit_id == audit_id)
        .order_by(AuditPage.id)
    )
    pages = result.scalars().all()
    return [
        {
            "url": p.url,
            "status_code": p.status_code,
            "title": p.title,
            "load_time_ms": p.load_time_ms,
        }
        for p in pages
    ]


@router.delete("/{audit_id}", status_code=204)
async def delete_audit(
    audit_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    clerk_user_id: str = Depends(get_clerk_user_id),
):
    result = await db.execute(select(Audit).where(Audit.id == audit_id))
    audit = result.scalar_one_or_none()
    if not audit:
        raise HTTPException(status_code=404, detail="Audit not found")
    await db.delete(audit)
    await db.commit()
    logger.info("audit.deleted", audit_id=str(audit_id), user=clerk_user_id)


@router.post("/{audit_id}/retry", response_model=AuditResponse)
async def retry_audit(
    audit_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    clerk_user_id: str = Depends(get_clerk_user_id),
):
    result = await db.execute(select(Audit).where(Audit.id == audit_id))
    audit = result.scalar_one_or_none()
    if not audit:
        raise HTTPException(status_code=404, detail="Audit not found")
    if audit.status not in ("failed", "completed"):
        raise HTTPException(status_code=400, detail="Can only retry failed or completed audits")

    # Reset audit state
    audit.status = "pending"
    audit.status_message = "Retrying audit..."
    audit.pages_crawled = 0
    audit.score_performance = None
    audit.score_accessibility = None
    audit.score_best_practices = None
    audit.score_seo = None
    audit.lcp_ms = None
    audit.inp_ms = None
    audit.cls = None
    audit.completed_at = None
    audit.celery_task_id = None

    await db.commit()
    await db.refresh(audit)

    # Dispatch new task
    try:
        from app.worker.tasks import run_audit
        task = run_audit.delay(str(audit.id))
        audit.celery_task_id = task.id
        await db.commit()
        await db.refresh(audit)
        logger.info("audit.retried", audit_id=str(audit_id), task_id=task.id)
    except Exception as e:
        logger.warning("audit.retry_dispatch_failed", audit_id=str(audit_id), error=str(e))

    return audit


@router.post("/{audit_id}/cancel", response_model=AuditResponse)
async def cancel_audit(
    audit_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    clerk_user_id: str = Depends(get_clerk_user_id),
):
    result = await db.execute(select(Audit).where(Audit.id == audit_id))
    audit = result.scalar_one_or_none()
    if not audit:
        raise HTTPException(status_code=404, detail="Audit not found")
    if audit.status not in ("pending", "crawling", "analyzing"):
        raise HTTPException(status_code=400, detail="Audit is not in progress")

    # Revoke the Celery task if possible
    if audit.celery_task_id:
        try:
            from app.worker import celery_app
            celery_app.control.revoke(audit.celery_task_id, terminate=True)
        except Exception as e:
            logger.warning("audit.revoke_failed", audit_id=str(audit_id), error=str(e))

    audit.status = "failed"
    audit.status_message = "Audit cancelled by user"
    await db.commit()
    await db.refresh(audit)

    logger.info("audit.cancelled", audit_id=str(audit_id), user=clerk_user_id)
    return audit


@router.get("/{audit_id}/export-pdf")
async def export_audit_pdf(
    audit_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    clerk_user_id: str = Depends(get_clerk_user_id),
):
    """Generate and return a PDF report for the audit."""
    from app.models.audit import AuditPage, PageIssue

    result = await db.execute(select(Audit).where(Audit.id == audit_id))
    audit = result.scalar_one_or_none()
    if not audit:
        raise HTTPException(status_code=404, detail="Audit not found")
    if audit.status != "completed":
        raise HTTPException(status_code=400, detail="Audit must be completed to export PDF")

    # Fetch issues
    issues_result = await db.execute(select(PageIssue).where(PageIssue.audit_id == audit_id))
    issues = issues_result.scalars().all()

    # Fetch pages
    pages_result = await db.execute(select(AuditPage).where(AuditPage.audit_id == audit_id).limit(50))
    pages = pages_result.scalars().all()

    # Build PDF input
    import subprocess, json, tempfile, os

    pdf_input = {
        "audit": {
            "id": str(audit.id),
            "url": audit.url,
            "auditDate": audit.created_at.isoformat(),
            "pagesCrawled": audit.pages_crawled,
            "maxPages": audit.max_pages,
            "scores": {
                "seo": audit.score_seo or 0,
                "performance": audit.score_performance or 0,
                "accessibility": audit.score_accessibility or 0,
                "bestPractices": audit.score_best_practices or 0,
            },
            "coreWebVitals": {
                "lcp": {"value": audit.lcp_ms or 0, "rating": "good" if (audit.lcp_ms or 0) <= 2500 else "needs-improvement" if (audit.lcp_ms or 0) <= 4000 else "poor"},
                "inp": {"value": audit.inp_ms or 0, "rating": "good" if (audit.inp_ms or 0) <= 200 else "needs-improvement" if (audit.inp_ms or 0) <= 500 else "poor"},
                "cls": {"value": audit.cls or 0, "rating": "good" if (audit.cls or 0) <= 0.1 else "needs-improvement" if (audit.cls or 0) <= 0.25 else "poor"},
            },
            "issues": [
                {"severity": "critical" if i.severity == "error" else i.severity, "category": i.category, "message": i.message.split(" — ")[0], "howToFix": i.message.split(" — ")[1] if " — " in i.message else "", "pagesAffected": 1}
                for i in issues[:50]
            ],
            "siteStructure": {"totalPages": audit.pages_crawled, "maxDepth": 5, "brokenLinks": 0, "redirectChains": 0, "orphanPages": 0, "avgLoadTimeMs": 0},
            "keywords": [],
            "pages": [
                {"url": p.url, "title": p.title, "statusCode": p.status_code or 200, "score": None, "loadTimeMs": p.load_time_ms or 0, "issues": 0}
                for p in pages
            ],
        },
        "client": {"name": "Client", "domain": audit.url.split("//")[1].split("/")[0] if "//" in audit.url else audit.url},
        "consultant": {"name": "AxelSEO", "email": "seo@axelerant.com", "title": "SEO Consultant"},
        "options": {"includeAppendix": True, "whitelabel": False},
    }

    # Write JSON and call the PDF generator CLI
    with tempfile.NamedTemporaryFile(mode="w", suffix=".json", delete=False) as f:
        json.dump(pdf_input, f)
        json_path = f.name

    pdf_path = json_path.replace(".json", ".pdf")
    try:
        proc = subprocess.run(
            ["npx", "ts-node", "src/cli.ts", json_path, "-o", pdf_path],
            cwd=os.path.join(os.path.dirname(__file__), "../../../../../packages/pdf-generator"),
            capture_output=True, text=True, timeout=60,
        )
        if proc.returncode != 0 or not os.path.exists(pdf_path):
            logger.error("pdf.generation_failed", stderr=proc.stderr[:500])
            raise HTTPException(status_code=500, detail="PDF generation failed")

        with open(pdf_path, "rb") as f:
            pdf_bytes = f.read()

        domain = audit.url.split("//")[1].split("/")[0] if "//" in audit.url else "report"
        return Response(
            content=pdf_bytes,
            media_type="application/pdf",
            headers={"Content-Disposition": f'attachment; filename="axelseo-{domain}-{audit.created_at.strftime("%Y%m%d")}.pdf"'},
        )
    finally:
        for path in [json_path, pdf_path]:
            if os.path.exists(path):
                os.unlink(path)
