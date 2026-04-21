"""Pydantic models for audit results, issues, and scores."""

from __future__ import annotations

from enum import Enum
from typing import Any

from pydantic import BaseModel, Field


class Severity(str, Enum):
    CRITICAL = "critical"
    WARNING = "warning"
    INFO = "info"


class SEOIssue(BaseModel):
    """A single SEO issue detected on a page or across the site."""

    page_url: str | None = None  # None for site-wide issues
    severity: Severity
    category: str
    message: str
    how_to_fix: str
    context: dict[str, Any] = Field(default_factory=dict)


class LighthousePageResult(BaseModel):
    """Lighthouse scores and metrics for a single page."""

    url: str
    performance: float
    accessibility: float
    best_practices: float
    seo: float
    lcp_ms: float | None = None
    fcp_ms: float | None = None
    inp_ms: float | None = None
    cls: float | None = None
    tbt_ms: float | None = None
    speed_index_ms: float | None = None


class Scores(BaseModel):
    """Aggregate audit scores (0-100)."""

    performance: float = 0.0
    accessibility: float = 0.0
    best_practices: float = 0.0
    seo: float = 0.0


class CoreWebVitals(BaseModel):
    """Aggregate Core Web Vitals from Lighthouse samples."""

    lcp_ms: float | None = None
    inp_ms: float | None = None
    cls: float | None = None
    lcp_rating: str | None = None   # good / needs-improvement / poor
    inp_rating: str | None = None
    cls_rating: str | None = None


class SummaryStats(BaseModel):
    """Aggregate statistics across all crawled pages."""

    total_pages: int = 0
    pages_with_issues: int = 0
    avg_load_time_ms: float = 0.0
    total_word_count: int = 0
    avg_word_count: float = 0.0
    total_images: int = 0
    images_without_alt: int = 0
    total_internal_links: int = 0
    total_external_links: int = 0
    pages_without_title: int = 0
    pages_without_meta_desc: int = 0
    pages_without_h1: int = 0
    https_pages: int = 0
    http_pages: int = 0


class AuditResult(BaseModel):
    """Complete result of an SEO audit."""

    scores: Scores = Field(default_factory=Scores)
    issues: list[SEOIssue] = Field(default_factory=list)
    core_web_vitals: CoreWebVitals = Field(default_factory=CoreWebVitals)
    lighthouse_results: list[LighthousePageResult] = Field(default_factory=list)
    desktop_scores: Scores = Field(default_factory=Scores)
    desktop_core_web_vitals: CoreWebVitals = Field(default_factory=CoreWebVitals)
    desktop_lighthouse_results: list[LighthousePageResult] = Field(default_factory=list)
    summary: SummaryStats = Field(default_factory=SummaryStats)

    @property
    def critical_count(self) -> int:
        return sum(1 for i in self.issues if i.severity == Severity.CRITICAL)

    @property
    def warning_count(self) -> int:
        return sum(1 for i in self.issues if i.severity == Severity.WARNING)

    @property
    def info_count(self) -> int:
        return sum(1 for i in self.issues if i.severity == Severity.INFO)
