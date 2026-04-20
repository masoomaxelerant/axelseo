"""SEO scoring algorithm.

Produces a 0–100 SEO score based on weighted issue counts.

Scoring methodology
-------------------
We start at 100 and deduct points per issue, capped at 0.

Deductions (per issue):
  - Critical:  5 points each (capped at 50 total from criticals)
  - Warning:   2 points each (capped at 30 total from warnings)
  - Info:      0.5 points each (capped at 10 total from infos)

This means:
  - A site with 10 critical issues scores at most 50 on SEO.
  - Warnings alone can't drop the score below 20.
  - Info issues are cosmetic; they only shave off up to 10 points.

The final SEO score is rounded to the nearest integer.

For Lighthouse categories (performance, accessibility, best practices),
we average the Lighthouse scores across sampled pages.
"""

from __future__ import annotations

from axelseo_auditor.models import (
    AuditResult,
    CoreWebVitals,
    LighthousePageResult,
    Scores,
    Severity,
    SummaryStats,
)
from axelseo_crawler.models import CrawledPage


def compute_seo_score(result: AuditResult) -> float:
    """Compute the custom SEO score from detected issues."""
    critical_count = result.critical_count
    warning_count = result.warning_count
    info_count = result.info_count

    critical_deduction = min(critical_count * 5, 50)
    warning_deduction = min(warning_count * 2, 30)
    info_deduction = min(info_count * 0.5, 10)

    score = 100 - critical_deduction - warning_deduction - info_deduction
    return max(0.0, round(score, 1))


def compute_lighthouse_scores(results: list[LighthousePageResult]) -> Scores:
    """Average Lighthouse category scores across sampled pages."""
    if not results:
        return Scores()

    n = len(results)
    return Scores(
        performance=round(sum(r.performance for r in results) / n, 1),
        accessibility=round(sum(r.accessibility for r in results) / n, 1),
        best_practices=round(sum(r.best_practices for r in results) / n, 1),
        seo=round(sum(r.seo for r in results) / n, 1),
    )


def compute_core_web_vitals(results: list[LighthousePageResult]) -> CoreWebVitals:
    """Aggregate Core Web Vitals from Lighthouse results (median of samples)."""
    if not results:
        return CoreWebVitals()

    lcp_values = [r.lcp_ms for r in results if r.lcp_ms is not None]
    inp_values = [r.inp_ms for r in results if r.inp_ms is not None]
    cls_values = [r.cls for r in results if r.cls is not None]

    def median(vals: list[float]) -> float | None:
        if not vals:
            return None
        s = sorted(vals)
        mid = len(s) // 2
        if len(s) % 2 == 0:
            return (s[mid - 1] + s[mid]) / 2
        return s[mid]

    lcp = median(lcp_values)
    inp = median(inp_values)
    cls = median(cls_values)

    return CoreWebVitals(
        lcp_ms=round(lcp, 1) if lcp is not None else None,
        inp_ms=round(inp, 1) if inp is not None else None,
        cls=round(cls, 4) if cls is not None else None,
        lcp_rating=_rate_lcp(lcp) if lcp is not None else None,
        inp_rating=_rate_inp(inp) if inp is not None else None,
        cls_rating=_rate_cls(cls) if cls is not None else None,
    )


def compute_summary_stats(pages: list[CrawledPage], result: AuditResult) -> SummaryStats:
    """Compute aggregate statistics from crawled pages."""
    ok_pages = [p for p in pages if p.status_code < 400 and not p.error]

    total_words = 0
    total_images = 0
    images_no_alt = 0
    total_internal = 0
    total_external = 0
    total_load = 0.0
    no_title = 0
    no_meta = 0
    no_h1 = 0
    https = 0
    http = 0

    from urllib.parse import urlparse

    for page in ok_pages:
        total_words += len(page.html.split()) if page.html else 0
        total_images += len(page.images)
        images_no_alt += sum(1 for img in page.images if not img.alt)
        total_internal += sum(1 for l in page.links if l.is_internal)
        total_external += sum(1 for l in page.links if not l.is_internal)
        total_load += page.performance.load_time_ms
        if not page.title:
            no_title += 1
        if not page.meta_description:
            no_meta += 1
        if not any(h.level == 1 for h in page.headings):
            no_h1 += 1
        parsed = urlparse(page.final_url)
        if parsed.scheme == "https":
            https += 1
        else:
            http += 1

    n = len(ok_pages) or 1
    pages_with_issues = len({i.page_url for i in result.issues if i.page_url})

    return SummaryStats(
        total_pages=len(pages),
        pages_with_issues=pages_with_issues,
        avg_load_time_ms=round(total_load / n, 1),
        total_word_count=total_words,
        avg_word_count=round(total_words / n, 1),
        total_images=total_images,
        images_without_alt=images_no_alt,
        total_internal_links=total_internal,
        total_external_links=total_external,
        pages_without_title=no_title,
        pages_without_meta_desc=no_meta,
        pages_without_h1=no_h1,
        https_pages=https,
        http_pages=http,
    )


def _rate_lcp(ms: float) -> str:
    if ms <= 2500:
        return "good"
    elif ms <= 4000:
        return "needs-improvement"
    return "poor"


def _rate_inp(ms: float) -> str:
    if ms <= 200:
        return "good"
    elif ms <= 500:
        return "needs-improvement"
    return "poor"


def _rate_cls(val: float) -> str:
    if val <= 0.1:
        return "good"
    elif val <= 0.25:
        return "needs-improvement"
    return "poor"
