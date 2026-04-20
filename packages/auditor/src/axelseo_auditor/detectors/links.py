"""Link-related detectors: broken links, redirect chains, orphan pages, anchor text."""

from __future__ import annotations

from axelseo_auditor.config import AuditConfig
from axelseo_auditor.detectors.base import IssueDetector
from axelseo_auditor.models import SEOIssue, Severity
from axelseo_crawler.models import CrawledPage

# Generic anchor text patterns that provide no SEO value
_GENERIC_ANCHORS = {
    "click here", "read more", "learn more", "here", "more", "link",
    "this", "go", "see more", "continue", "details", "view",
}


class BrokenLinkDetector(IssueDetector):
    """Flags pages that returned 4xx/5xx status codes (broken internal links)."""

    def detect(self, pages: list[CrawledPage], config: AuditConfig) -> list[SEOIssue]:
        issues = []
        # Build a set of broken URLs from the crawl
        broken_urls = {p.final_url for p in pages if p.status_code >= 400}

        # Find which pages link to broken URLs
        for page in pages:
            if page.status_code >= 400:
                issues.append(SEOIssue(
                    page_url=page.final_url,
                    severity=Severity.CRITICAL,
                    category="broken_link",
                    message=f"Page returns HTTP {page.status_code}.",
                    how_to_fix="Fix or remove this page. If the content has moved, set up a "
                    "301 redirect to the new URL. Update any internal links pointing here.",
                    context={"status_code": page.status_code},
                ))
        return issues


class RedirectChainDetector(IssueDetector):
    def detect(self, pages: list[CrawledPage], config: AuditConfig) -> list[SEOIssue]:
        issues = []
        for page in pages:
            if len(page.redirect_chain) > config.max_redirect_hops:
                chain_str = " → ".join(
                    f"{hop.url} ({hop.status_code})" for hop in page.redirect_chain
                )
                issues.append(SEOIssue(
                    page_url=page.url,
                    severity=Severity.CRITICAL,
                    category="redirect_chain",
                    message=f"Redirect chain has {len(page.redirect_chain)} hops "
                    f"(max recommended: {config.max_redirect_hops}).",
                    how_to_fix="Shorten the redirect chain to a single hop. Each redirect adds "
                    "latency and dilutes link equity. Update internal links to point directly "
                    "to the final destination URL.",
                    context={"chain": chain_str, "hops": len(page.redirect_chain)},
                ))
        return issues


class OrphanPageDetector(IssueDetector):
    """Detects pages that no other crawled page links to internally."""

    def detect(self, pages: list[CrawledPage], config: AuditConfig) -> list[SEOIssue]:
        if len(pages) < 2:
            return []

        # Build a set of all URLs that are linked to internally
        linked_urls: set[str] = set()
        page_urls: set[str] = set()
        for page in pages:
            if page.status_code < 400:
                page_urls.add(page.final_url)
                for link in page.links:
                    if link.is_internal:
                        linked_urls.add(link.href)

        # Normalize for comparison
        from axelseo_crawler.url_utils import normalize_url
        linked_normalized = {normalize_url(u) for u in linked_urls}

        issues = []
        for page in pages:
            if page.status_code >= 400 or page.depth == 0:
                continue  # skip errors and homepage
            if normalize_url(page.final_url) not in linked_normalized:
                issues.append(SEOIssue(
                    page_url=page.final_url,
                    severity=Severity.WARNING,
                    category="orphan_page",
                    message="Orphan page — no internal links point to this page.",
                    how_to_fix="Add internal links to this page from relevant content pages, "
                    "the navigation, or a sitemap page. Orphan pages are harder for search "
                    "engines to discover and pass less link equity.",
                ))
        return issues


class ExcessiveLinksDetector(IssueDetector):
    def detect(self, pages: list[CrawledPage], config: AuditConfig) -> list[SEOIssue]:
        issues = []
        for page in pages:
            if page.error or page.status_code >= 400:
                continue
            count = len(page.links)
            if count > config.max_links_per_page:
                issues.append(SEOIssue(
                    page_url=page.final_url,
                    severity=Severity.WARNING,
                    category="excessive_links",
                    message=f"Page has {count} links (recommended max: {config.max_links_per_page}).",
                    how_to_fix="Reduce the number of links on this page. Excessive links dilute "
                    "each link's equity and can signal low-quality content to search engines. "
                    "Prioritize the most important links and consider consolidating navigation.",
                    context={"link_count": count},
                ))
        return issues


class GenericAnchorTextDetector(IssueDetector):
    """Flags links using non-descriptive anchor text like 'click here' or 'read more'."""

    def detect(self, pages: list[CrawledPage], config: AuditConfig) -> list[SEOIssue]:
        issues = []
        for page in pages:
            if page.error or page.status_code >= 400:
                continue
            generic = [
                link for link in page.links
                if link.anchor_text.strip().lower() in _GENERIC_ANCHORS
            ]
            if generic:
                issues.append(SEOIssue(
                    page_url=page.final_url,
                    severity=Severity.INFO,
                    category="generic_anchor_text",
                    message=f"{len(generic)} link(s) use generic anchor text.",
                    how_to_fix="Replace generic anchor text ('click here', 'read more') with "
                    "descriptive text that tells users and search engines what the linked "
                    "page is about. Example: 'Read our SEO guide' instead of 'read more'.",
                    context={
                        "examples": [
                            {"text": l.anchor_text, "href": l.href}
                            for l in generic[:5]
                        ]
                    },
                ))
        return issues


class ExternalLinksNoOpenerDetector(IssueDetector):
    """Flags external links missing rel='noopener'."""

    def detect(self, pages: list[CrawledPage], config: AuditConfig) -> list[SEOIssue]:
        issues = []
        for page in pages:
            if page.error or page.status_code >= 400:
                continue
            missing = [
                link for link in page.links
                if not link.is_internal and link.rel and "noopener" not in (link.rel or "")
            ]
            if missing:
                issues.append(SEOIssue(
                    page_url=page.final_url,
                    severity=Severity.INFO,
                    category="external_noopener",
                    message=f"{len(missing)} external link(s) missing rel='noopener'.",
                    how_to_fix="Add rel='noopener' (or rel='noopener noreferrer') to external links "
                    "that open in a new tab. This is a security best practice that prevents "
                    "the linked page from accessing your window object.",
                    context={"count": len(missing)},
                ))
        return issues
