"""Heading tag detectors (H1 presence, count, hierarchy, title match)."""

from __future__ import annotations

from axelseo_auditor.config import AuditConfig
from axelseo_auditor.detectors.base import IssueDetector
from axelseo_auditor.models import SEOIssue, Severity
from axelseo_crawler.models import CrawledPage


class MissingH1Detector(IssueDetector):
    def detect(self, pages: list[CrawledPage], config: AuditConfig) -> list[SEOIssue]:
        issues = []
        for page in pages:
            if page.error or page.status_code >= 400:
                continue
            h1s = [h for h in page.headings if h.level == 1]
            if not h1s:
                issues.append(SEOIssue(
                    page_url=page.final_url,
                    severity=Severity.CRITICAL,
                    category="missing_h1",
                    message="Page is missing an H1 tag.",
                    how_to_fix="Add a single H1 tag that clearly describes the page's main topic. "
                    "The H1 is the most important on-page heading signal for search engines.",
                ))
        return issues


class MultipleH1Detector(IssueDetector):
    def detect(self, pages: list[CrawledPage], config: AuditConfig) -> list[SEOIssue]:
        issues = []
        for page in pages:
            if page.error or page.status_code >= 400:
                continue
            h1s = [h for h in page.headings if h.level == 1]
            if len(h1s) > 1:
                issues.append(SEOIssue(
                    page_url=page.final_url,
                    severity=Severity.CRITICAL,
                    category="multiple_h1",
                    message=f"Page has {len(h1s)} H1 tags (should have exactly 1).",
                    how_to_fix="Use only one H1 per page. Multiple H1 tags dilute the main topic signal. "
                    "Demote secondary headings to H2 or H3.",
                    context={"h1_texts": [h.text for h in h1s]},
                ))
        return issues


class TitleH1DuplicateDetector(IssueDetector):
    """Flags pages where the H1 exactly matches the title — missed keyword opportunity."""

    def detect(self, pages: list[CrawledPage], config: AuditConfig) -> list[SEOIssue]:
        issues = []
        for page in pages:
            if not page.title or page.status_code >= 400:
                continue
            h1s = [h for h in page.headings if h.level == 1]
            if not h1s:
                continue
            if h1s[0].text.strip().lower() == page.title.strip().lower():
                issues.append(SEOIssue(
                    page_url=page.final_url,
                    severity=Severity.WARNING,
                    category="title_h1_match",
                    message="H1 tag is identical to the title tag.",
                    how_to_fix="Differentiate the H1 from the title tag. The title tag targets "
                    "search result snippets while the H1 speaks to on-page visitors. "
                    "Use a variation that includes secondary keywords or a different angle.",
                ))
        return issues


class HeadingHierarchyDetector(IssueDetector):
    """Detects heading level skips (e.g. H1 → H3 without an H2)."""

    def detect(self, pages: list[CrawledPage], config: AuditConfig) -> list[SEOIssue]:
        issues = []
        for page in pages:
            if page.error or page.status_code >= 400 or not page.headings:
                continue

            levels = [h.level for h in page.headings]
            skips = []
            for i in range(1, len(levels)):
                if levels[i] > levels[i - 1] + 1:
                    skips.append(f"H{levels[i - 1]} → H{levels[i]}")

            if skips:
                issues.append(SEOIssue(
                    page_url=page.final_url,
                    severity=Severity.WARNING,
                    category="heading_hierarchy",
                    message=f"Heading hierarchy skips levels: {', '.join(skips)}.",
                    how_to_fix="Maintain a sequential heading hierarchy (H1 → H2 → H3). "
                    "Skipping levels confuses screen readers and reduces the semantic "
                    "value of your heading structure for search engines.",
                    context={"skips": skips},
                ))
        return issues
