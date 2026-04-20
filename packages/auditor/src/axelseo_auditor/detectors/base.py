"""Base interface for issue detectors.

Every detector implements the same contract:
  - `detect(pages, config)` → list of SEOIssue objects

Detectors are stateless. They receive the full list of crawled pages so they
can perform both per-page and cross-page analysis (e.g. duplicate detection).
"""

from __future__ import annotations

from abc import ABC, abstractmethod

from axelseo_auditor.config import AuditConfig
from axelseo_auditor.models import SEOIssue
from axelseo_crawler.models import CrawledPage


class IssueDetector(ABC):
    """Protocol for SEO issue detectors."""

    @abstractmethod
    def detect(self, pages: list[CrawledPage], config: AuditConfig) -> list[SEOIssue]:
        """Analyze pages and return detected issues."""
        ...
