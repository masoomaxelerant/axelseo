"""Content quality detectors."""

from __future__ import annotations

from axelseo_auditor.config import AuditConfig
from axelseo_auditor.detectors.base import IssueDetector
from axelseo_auditor.models import SEOIssue, Severity
from axelseo_crawler.models import CrawledPage


class ThinContentDetector(IssueDetector):
    """Flags pages with very little text content."""

    def detect(self, pages: list[CrawledPage], config: AuditConfig) -> list[SEOIssue]:
        issues = []
        for page in pages:
            if page.error or page.status_code >= 400:
                continue
            # Approximate word count from rendered HTML text
            word_count = len(page.html.split()) if page.html else 0
            if word_count < config.thin_content_threshold:
                issues.append(SEOIssue(
                    page_url=page.final_url,
                    severity=Severity.WARNING,
                    category="thin_content",
                    message=f"Thin content — approximately {word_count} words "
                    f"(minimum recommended: {config.thin_content_threshold}).",
                    how_to_fix="Add more substantive content to this page. Search engines favor "
                    "pages with comprehensive, useful content. Consider expanding with "
                    "FAQs, detailed descriptions, or supporting information relevant to "
                    "the page's topic.",
                    context={"word_count": word_count},
                ))
        return issues
