"""Schemas for GSC integration endpoints."""

import uuid
from datetime import datetime
from typing import Any

from pydantic import BaseModel


class GSCAuthUrlResponse(BaseModel):
    auth_url: str
    state: str


class GSCConnectRequest(BaseModel):
    client_id: uuid.UUID
    gsc_property: str


class GSCPropertyItem(BaseModel):
    site_url: str
    permission_level: str


class GSCConnectionResponse(BaseModel):
    id: uuid.UUID
    client_id: uuid.UUID
    gsc_property: str
    connected_by: str
    last_fetch_at: datetime | None
    created_at: datetime

    model_config = {"from_attributes": True}


class GSCKeywordRow(BaseModel):
    query: str
    clicks: int
    impressions: int
    ctr: float
    position: float


class GSCPageRow(BaseModel):
    page: str
    clicks: int
    impressions: int
    ctr: float
    position: float


class GSCSnapshotResponse(BaseModel):
    date_range_start: str
    date_range_end: str
    top_queries: list[dict[str, Any]]
    top_pages: list[dict[str, Any]]
    opportunity_queries: list[dict[str, Any]]
    device_breakdown: dict[str, Any]
    country_breakdown: list[dict[str, Any]]
    fetched_at: datetime

    model_config = {"from_attributes": True}
