import uuid
from datetime import datetime

from sqlalchemy import DateTime, Float, ForeignKey, Integer, String, Text, func
from sqlalchemy.dialects.postgresql import JSON, UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base


class Audit(Base):
    __tablename__ = "audits"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    project_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("projects.id"), nullable=True
    )
    url: Mapped[str] = mapped_column(String(2048))
    status: Mapped[str] = mapped_column(String(50), default="pending")
    status_message: Mapped[str | None] = mapped_column(Text, nullable=True)
    pages_crawled: Mapped[int] = mapped_column(Integer, default=0)
    max_pages: Mapped[int] = mapped_column(Integer, default=500)

    # Lighthouse aggregate scores (0-100)
    score_performance: Mapped[float | None] = mapped_column(Float, nullable=True)
    score_accessibility: Mapped[float | None] = mapped_column(Float, nullable=True)
    score_best_practices: Mapped[float | None] = mapped_column(Float, nullable=True)
    score_seo: Mapped[float | None] = mapped_column(Float, nullable=True)

    # Core Web Vitals
    lcp_ms: Mapped[float | None] = mapped_column(Float, nullable=True)
    inp_ms: Mapped[float | None] = mapped_column(Float, nullable=True)
    cls: Mapped[float | None] = mapped_column(Float, nullable=True)

    # Celery task tracking
    celery_task_id: Mapped[str | None] = mapped_column(String(255), nullable=True)

    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    completed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)

    project = relationship("Project", back_populates="audits")
    pages = relationship("AuditPage", back_populates="audit", cascade="all, delete-orphan")
    issues = relationship("PageIssue", back_populates="audit", cascade="all, delete-orphan")
    report = relationship("Report", back_populates="audit", uselist=False)


class AuditPage(Base):
    __tablename__ = "audit_pages"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    audit_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("audits.id"))
    url: Mapped[str] = mapped_column(String(2048))
    status_code: Mapped[int | None] = mapped_column(Integer, nullable=True)
    title: Mapped[str | None] = mapped_column(Text, nullable=True)
    meta_description: Mapped[str | None] = mapped_column(Text, nullable=True)
    h1: Mapped[str | None] = mapped_column(Text, nullable=True)
    canonical: Mapped[str | None] = mapped_column(String(2048), nullable=True)
    word_count: Mapped[int | None] = mapped_column(Integer, nullable=True)
    load_time_ms: Mapped[float | None] = mapped_column(Float, nullable=True)
    lighthouse_data: Mapped[dict | None] = mapped_column(JSON, nullable=True)
    schema_types: Mapped[list | None] = mapped_column(JSON, nullable=True)

    audit = relationship("Audit", back_populates="pages")


class PageIssue(Base):
    __tablename__ = "page_issues"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    audit_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("audits.id"))
    page_url: Mapped[str] = mapped_column(String(2048))
    severity: Mapped[str] = mapped_column(String(20))  # error, warning, info
    category: Mapped[str] = mapped_column(String(100))
    message: Mapped[str] = mapped_column(Text)

    audit = relationship("Audit", back_populates="issues")
