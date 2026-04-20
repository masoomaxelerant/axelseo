"""Canonical URL detector."""

from __future__ import annotations

from axelseo_auditor.config import AuditConfig
from axelseo_auditor.detectors.base import IssueDetector
from axelseo_auditor.models import SEOIssue, Severity
from axelseo_crawler.models import CrawledPage


class CanonicalDetector(IssueDetector):
    """Flags pages missing a canonical URL, especially when duplicate content is likely."""

    def detect(self, pages: list[CrawledPage], config: AuditConfig) -> list[SEOIssue]:
        issues = []
        for page in pages:
            if page.error or page.status_code >= 400:
                continue
            if not page.canonical_url:
                issues.append(SEOIssue(
                    page_url=page.final_url,
                    severity=Severity.CRITICAL,
                    category="canonical",
                    message="Page is missing a canonical URL.",
                    how_to_fix="Add a <link rel='canonical' href='...'> tag pointing to the "
                    "preferred version of this page. This tells search engines which URL "
                    "to index when duplicate or near-duplicate content exists (e.g. "
                    "with/without trailing slash, www vs non-www, query parameters).",
                ))
        return issues
