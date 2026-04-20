import uuid

from fastapi import APIRouter, Depends, HTTPException
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

    # Dispatch Celery task
    try:
        from app.worker.tasks import run_audit
        task = run_audit.delay(str(audit.id))
        audit.celery_task_id = task.id
        await db.commit()
        await db.refresh(audit)
        logger.info("audit.queued", audit_id=str(audit.id), task_id=task.id)
    except Exception as e:
        # If Celery/Redis is down, still return the audit — it stays in "pending"
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
