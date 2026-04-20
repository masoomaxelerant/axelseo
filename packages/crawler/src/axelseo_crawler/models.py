"""Pydantic models for crawl results."""

from __future__ import annotations

from datetime import UTC, datetime
from typing import Any

from pydantic import BaseModel, Field


class RedirectHop(BaseModel):
    url: str
    status_code: int


class HeadingTag(BaseModel):
    level: int  # 1–6
    text: str


class ImageInfo(BaseModel):
    src: str
    alt: str | None = None
    width: str | None = None
    height: str | None = None
    loading: str | None = None


class LinkInfo(BaseModel):
    href: str
    anchor_text: str
    rel: str | None = None
    is_internal: bool = False


class OpenGraphMeta(BaseModel):
    title: str | None = None
    description: str | None = None
    image: str | None = None
    url: str | None = None
    type: str | None = None
    site_name: str | None = None


class TwitterCardMeta(BaseModel):
    card: str | None = None
    title: str | None = None
    description: str | None = None
    image: str | None = None
    site: str | None = None


class PagePerformance(BaseModel):
    load_time_ms: float = 0.0
    page_weight_bytes: int = 0
    resource_count: int = 0


class CrawledPage(BaseModel):
    """All SEO-relevant data extracted from a single page."""

    url: str
    final_url: str
    status_code: int
    redirect_chain: list[RedirectHop] = Field(default_factory=list)
    depth: int = 0

    # Content
    html: str = ""
    rendered_dom: str = ""
    title: str | None = None
    meta_description: str | None = None
    meta_robots: str | None = None
    canonical_url: str | None = None

    # Structure
    headings: list[HeadingTag] = Field(default_factory=list)
    images: list[ImageInfo] = Field(default_factory=list)
    links: list[LinkInfo] = Field(default_factory=list)

    # Social / structured data
    open_graph: OpenGraphMeta | None = None
    twitter_card: TwitterCardMeta | None = None
    schema_org: list[dict[str, Any]] = Field(default_factory=list)

    # Headers
    response_headers: dict[str, str] = Field(default_factory=dict)

    # Performance
    performance: PagePerformance = Field(default_factory=PagePerformance)

    # Screenshot
    screenshot_path: str | None = None

    # Timing
    crawled_at: datetime = Field(default_factory=lambda: datetime.now(UTC))
    error: str | None = None


class CrawlSummary(BaseModel):
    """Aggregated results from a complete crawl."""

    start_url: str
    pages_crawled: int = 0
    pages_skipped: int = 0
    pages_failed: int = 0
    total_links_found: int = 0
    internal_links: int = 0
    external_links: int = 0
    broken_links: list[str] = Field(default_factory=list)
    redirect_chains: list[list[RedirectHop]] = Field(default_factory=list)
    errors: list[dict[str, str]] = Field(default_factory=list)
    started_at: datetime = Field(default_factory=lambda: datetime.now(UTC))
    finished_at: datetime | None = None
    elapsed_seconds: float = 0.0
