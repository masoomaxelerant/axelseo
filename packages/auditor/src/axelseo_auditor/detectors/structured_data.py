"""Structured data and social meta tag detectors."""

from __future__ import annotations

from axelseo_auditor.config import AuditConfig
from axelseo_auditor.detectors.base import IssueDetector
from axelseo_auditor.models import SEOIssue, Severity
from axelseo_crawler.models import CrawledPage


class MissingOpenGraphDetector(IssueDetector):
    def detect(self, pages: list[CrawledPage], config: AuditConfig) -> list[SEOIssue]:
        issues = []
        for page in pages:
            if page.error or page.status_code >= 400:
                continue
            if not page.open_graph:
                issues.append(SEOIssue(
                    page_url=page.final_url,
                    severity=Severity.WARNING,
                    category="open_graph",
                    message="Page is missing Open Graph meta tags.",
                    how_to_fix="Add og:title, og:description, og:image, and og:url meta tags. "
                    "Open Graph tags control how your page appears when shared on Facebook, "
                    "LinkedIn, and other social platforms. This directly impacts click-through "
                    "rates from social shares.",
                ))
        return issues


class MissingSchemaOrgDetector(IssueDetector):
    def detect(self, pages: list[CrawledPage], config: AuditConfig) -> list[SEOIssue]:
        issues = []
        for page in pages:
            if page.error or page.status_code >= 400:
                continue
            if not page.schema_org:
                issues.append(SEOIssue(
                    page_url=page.final_url,
                    severity=Severity.WARNING,
                    category="schema_org",
                    message="Page has no Schema.org structured data (JSON-LD).",
                    how_to_fix="Add JSON-LD structured data relevant to the page content "
                    "(e.g. Organization, WebPage, Article, Product, FAQPage). Structured "
                    "data enables rich snippets in search results, which can significantly "
                    "improve click-through rates.",
                ))
        return issues


class MissingTwitterCardDetector(IssueDetector):
    def detect(self, pages: list[CrawledPage], config: AuditConfig) -> list[SEOIssue]:
        issues = []
        for page in pages:
            if page.error or page.status_code >= 400:
                continue
            if not page.twitter_card:
                issues.append(SEOIssue(
                    page_url=page.final_url,
                    severity=Severity.INFO,
                    category="twitter_card",
                    message="Page is missing Twitter Card meta tags.",
                    how_to_fix="Add twitter:card, twitter:title, twitter:description, and "
                    "twitter:image meta tags. If Open Graph tags are present, Twitter will "
                    "fall back to those, but explicit Twitter Card tags give you more control.",
                ))
        return issues


class MissingBreadcrumbSchemaDetector(IssueDetector):
    """Checks if any page in the site uses BreadcrumbList schema."""

    def detect(self, pages: list[CrawledPage], config: AuditConfig) -> list[SEOIssue]:
        has_breadcrumb = False
        for page in pages:
            for schema in page.schema_org:
                if isinstance(schema, dict):
                    schema_type = schema.get("@type", "")
                    if schema_type == "BreadcrumbList" or (
                        isinstance(schema_type, list) and "BreadcrumbList" in schema_type
                    ):
                        has_breadcrumb = True
                        break
            if has_breadcrumb:
                break

        if not has_breadcrumb and len(pages) > 1:
            return [SEOIssue(
                page_url=None,
                severity=Severity.INFO,
                category="breadcrumb_schema",
                message="Site has no BreadcrumbList structured data.",
                how_to_fix="Add BreadcrumbList JSON-LD schema to pages with hierarchical "
                "navigation. Breadcrumb rich snippets in search results show the page's "
                "position in the site hierarchy, improving user orientation and CTR.",
            )]
        return []
