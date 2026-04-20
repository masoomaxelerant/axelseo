"""Google Search Console data — stores fetched keyword and coverage data per client."""

import uuid
from datetime import datetime

from sqlalchemy import DateTime, Float, ForeignKey, Integer, String, Text, func
from sqlalchemy.dialects.postgresql import JSON, UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base


class GSCConnection(Base):
    """Tracks a GSC property connection for a client."""

    __tablename__ = "gsc_connections"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    client_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("clients.id"), unique=True
    )
    gsc_property: Mapped[str] = mapped_column(String(512))  # e.g. "sc-domain:example.com"
    encrypted_refresh_token: Mapped[str] = mapped_column(Text)
    connected_by: Mapped[str] = mapped_column(String(255))  # Clerk user ID
    last_fetch_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    client = relationship("Client", backref="gsc_connection", uselist=False)
    keyword_snapshots = relationship(
        "GSCKeywordSnapshot", back_populates="connection", cascade="all, delete-orphan"
    )


class GSCKeywordSnapshot(Base):
    """Point-in-time keyword data fetched from GSC."""

    __tablename__ = "gsc_keyword_snapshots"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    connection_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("gsc_connections.id")
    )
    # Date range this snapshot covers
    date_range_start: Mapped[str] = mapped_column(String(10))  # "2026-01-20"
    date_range_end: Mapped[str] = mapped_column(String(10))    # "2026-04-20"

    # Aggregated data stored as JSON arrays
    top_queries: Mapped[list] = mapped_column(JSON, default=list)       # [{query, clicks, impressions, ctr, position}]
    top_pages: Mapped[list] = mapped_column(JSON, default=list)         # [{page, clicks, impressions, ctr, position}]
    opportunity_queries: Mapped[list] = mapped_column(JSON, default=list)  # queries ranked 11-20
    device_breakdown: Mapped[dict] = mapped_column(JSON, default=dict)  # {mobile: {clicks, impressions}, desktop: {...}}
    country_breakdown: Mapped[list] = mapped_column(JSON, default=list) # [{country, clicks, impressions}]

    # Coverage data
    indexed_pages: Mapped[int | None] = mapped_column(Integer, nullable=True)
    excluded_pages: Mapped[int | None] = mapped_column(Integer, nullable=True)
    coverage_errors: Mapped[int | None] = mapped_column(Integer, nullable=True)

    fetched_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    connection = relationship("GSCConnection", back_populates="keyword_snapshots")
