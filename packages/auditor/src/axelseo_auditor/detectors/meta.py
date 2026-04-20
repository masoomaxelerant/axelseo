"""Title and meta description detectors."""

from __future__ import annotations

from collections import Counter

from axelseo_auditor.config import AuditConfig
from axelseo_auditor.detectors.base import IssueDetector
from axelseo_auditor.models import SEOIssue, Severity
from axelseo_crawler.models import CrawledPage


class MissingTitleDetector(IssueDetector):
    def detect(self, pages: list[CrawledPage], config: AuditConfig) -> list[SEOIssue]:
        issues = []
        for page in pages:
            if page.error or page.status_code >= 400:
                continue
            if not page.title:
                issues.append(SEOIssue(
                    page_url=page.final_url,
                    severity=Severity.CRITICAL,
                    category="title",
                    message="Page is missing a <title> tag.",
                    how_to_fix="Add a unique, descriptive <title> tag in the <head> section. "
                    "Keep it under 60 characters and include the primary keyword near the beginning.",
                ))
        return issues


class MissingMetaDescriptionDetector(IssueDetector):
    def detect(self, pages: list[CrawledPage], config: AuditConfig) -> list[SEOIssue]:
        issues = []
        for page in pages:
            if page.error or page.status_code >= 400:
                continue
            if not page.meta_description:
                issues.append(SEOIssue(
                    page_url=page.final_url,
                    severity=Severity.CRITICAL,
                    category="meta_description",
                    message="Page is missing a meta description.",
                    how_to_fix="Add a <meta name=\"description\" content=\"...\"> tag. "
                    "Write a compelling 120–160 character summary that includes target keywords "
                    "and encourages clicks from search results.",
                ))
        return issues


class DuplicateTitleDetector(IssueDetector):
    """Detects pages sharing the same title — cross-page analysis."""

    def detect(self, pages: list[CrawledPage], config: AuditConfig) -> list[SEOIssue]:
        title_map: dict[str, list[str]] = {}
        for page in pages:
            if page.title and page.status_code < 400:
                normalized = page.title.strip().lower()
                title_map.setdefault(normalized, []).append(page.final_url)

        issues = []
        for title, urls in title_map.items():
            if len(urls) > 1:
                for url in urls:
                    issues.append(SEOIssue(
                        page_url=url,
                        severity=Severity.CRITICAL,
                        category="duplicate_title",
                        message=f"Duplicate title found on {len(urls)} pages.",
                        how_to_fix="Each page should have a unique title tag that accurately describes "
                        "its specific content. Duplicate titles confuse search engines about which "
                        "page to rank for a given query.",
                        context={"duplicate_urls": urls, "title": title},
                    ))
        return issues


class DuplicateMetaDescriptionDetector(IssueDetector):
    """Detects pages sharing the same meta description."""

    def detect(self, pages: list[CrawledPage], config: AuditConfig) -> list[SEOIssue]:
        desc_map: dict[str, list[str]] = {}
        for page in pages:
            if page.meta_description and page.status_code < 400:
                normalized = page.meta_description.strip().lower()
                desc_map.setdefault(normalized, []).append(page.final_url)

        issues = []
        for desc, urls in desc_map.items():
            if len(urls) > 1:
                for url in urls:
                    issues.append(SEOIssue(
                        page_url=url,
                        severity=Severity.CRITICAL,
                        category="duplicate_meta_description",
                        message=f"Duplicate meta description found on {len(urls)} pages.",
                        how_to_fix="Write a unique meta description for each page. "
                        "Each description should summarize that specific page's content "
                        "and include relevant keywords.",
                        context={"duplicate_urls": urls},
                    ))
        return issues


class TitleLengthDetector(IssueDetector):
    def detect(self, pages: list[CrawledPage], config: AuditConfig) -> list[SEOIssue]:
        issues = []
        for page in pages:
            if not page.title or page.status_code >= 400:
                continue
            length = len(page.title)
            if length > config.max_title_length:
                issues.append(SEOIssue(
                    page_url=page.final_url,
                    severity=Severity.WARNING,
                    category="title_length",
                    message=f"Title tag is too long ({length} chars, max {config.max_title_length}).",
                    how_to_fix=f"Shorten the title to under {config.max_title_length} characters. "
                    "Google typically displays 50–60 characters in search results; "
                    "longer titles get truncated.",
                    context={"length": length, "title": page.title},
                ))
            elif length < config.min_title_length:
                issues.append(SEOIssue(
                    page_url=page.final_url,
                    severity=Severity.WARNING,
                    category="title_length",
                    message=f"Title tag is too short ({length} chars, min {config.min_title_length}).",
                    how_to_fix=f"Expand the title to at least {config.min_title_length} characters. "
                    "Short titles miss opportunities to include keywords and convey page purpose.",
                    context={"length": length, "title": page.title},
                ))
        return issues


class MetaDescriptionLengthDetector(IssueDetector):
    def detect(self, pages: list[CrawledPage], config: AuditConfig) -> list[SEOIssue]:
        issues = []
        for page in pages:
            if not page.meta_description or page.status_code >= 400:
                continue
            length = len(page.meta_description)
            if length > config.max_meta_desc_length:
                issues.append(SEOIssue(
                    page_url=page.final_url,
                    severity=Severity.WARNING,
                    category="meta_description_length",
                    message=f"Meta description is too long ({length} chars, max {config.max_meta_desc_length}).",
                    how_to_fix=f"Trim the meta description to under {config.max_meta_desc_length} characters. "
                    "Search engines truncate longer descriptions, cutting off your message.",
                    context={"length": length},
                ))
            elif length < config.min_meta_desc_length:
                issues.append(SEOIssue(
                    page_url=page.final_url,
                    severity=Severity.WARNING,
                    category="meta_description_length",
                    message=f"Meta description is too short ({length} chars, min {config.min_meta_desc_length}).",
                    how_to_fix=f"Expand the meta description to at least {config.min_meta_desc_length} characters. "
                    "A well-written description improves click-through rates from search results.",
                    context={"length": length},
                ))
        return issues
