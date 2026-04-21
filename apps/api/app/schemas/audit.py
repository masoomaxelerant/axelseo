import uuid
from datetime import datetime

from pydantic import BaseModel, HttpUrl, field_validator


class AuditCreate(BaseModel):
    url: HttpUrl
    project_id: uuid.UUID | None = None
    max_pages: int = 500

    @field_validator("max_pages")
    @classmethod
    def validate_max_pages(cls, v: int) -> int:
        if v < 1 or v > 10000:
            raise ValueError("max_pages must be between 1 and 10,000")
        return v


class AuditResponse(BaseModel):
    id: uuid.UUID
    project_id: uuid.UUID | None
    url: str
    status: str
    status_message: str | None
    pages_crawled: int
    max_pages: int
    score_performance: float | None
    score_accessibility: float | None
    score_best_practices: float | None
    score_seo: float | None
    lcp_ms: float | None
    inp_ms: float | None
    cls: float | None
    celery_task_id: str | None
    created_at: datetime
    completed_at: datetime | None

    model_config = {"from_attributes": True}


class AuditListResponse(BaseModel):
    id: uuid.UUID
    url: str
    status: str
    pages_crawled: int
    score_seo: float | None
    created_at: datetime

    model_config = {"from_attributes": True}
