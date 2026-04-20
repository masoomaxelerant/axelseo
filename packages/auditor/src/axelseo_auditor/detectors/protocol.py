"""Protocol/security detectors."""

from __future__ import annotations

from urllib.parse import urlparse

from axelseo_auditor.config import AuditConfig
from axelseo_auditor.detectors.base import IssueDetector
from axelseo_auditor.models import SEOIssue, Severity
from axelseo_crawler.models import CrawledPage


class HttpsDetector(IssueDetector):
    """Flags pages served over HTTP instead of HTTPS."""

    def detect(self, pages: list[CrawledPage], config: AuditConfig) -> list[SEOIssue]:
        issues = []
        for page in pages:
            if page.error:
                continue
            parsed = urlparse(page.final_url)
            if parsed.scheme == "http":
                issues.append(SEOIssue(
                    page_url=page.final_url,
                    severity=Severity.CRITICAL,
                    category="https",
                    message="Page is served over HTTP (not HTTPS).",
                    how_to_fix="Migrate to HTTPS by installing an SSL/TLS certificate. "
                    "HTTPS is a confirmed Google ranking signal. Set up 301 redirects "
                    "from HTTP to HTTPS and update all internal links.",
                ))
        return issues
