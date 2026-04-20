"""Integration tests for the main Auditor class."""

import pytest

from axelseo_auditor import AuditConfig, Auditor
from axelseo_auditor.models import Severity
from tests.conftest import _make_page


@pytest.mark.asyncio
async def test_perfect_page_minimal_issues():
    """A well-optimized page should have very few (or no) issues."""
    page = _make_page(depth=0)
    auditor = Auditor(AuditConfig(run_lighthouse=False))
    result = await auditor.analyze([page])

    # A "good" page might still get info-level issues (no breadcrumb, etc.)
    # but should have zero criticals
    assert result.critical_count == 0
    assert result.scores.seo >= 90


@pytest.mark.asyncio
async def test_problematic_page_many_issues():
    """A page missing everything should produce many critical issues."""
    page = _make_page(
        depth=1,
        title=None,
        meta_description=None,
        canonical_url=None,
        headings=[],
        images=[],
        links=[],
        open_graph=None,
        twitter_card=None,
        schema_org=[],
        html="tiny",
    )
    auditor = Auditor(AuditConfig(run_lighthouse=False))
    result = await auditor.analyze([page])

    assert result.critical_count >= 4  # title, meta, h1, canonical
    assert result.warning_count >= 2   # og, schema, thin content
    assert result.scores.seo < 80


@pytest.mark.asyncio
async def test_duplicate_detection_across_pages():
    """Duplicate titles and meta descriptions should be caught cross-page."""
    pages = [
        _make_page(
            url="https://example.com/a",
            final_url="https://example.com/a",
            title="Same Title",
            meta_description="Same description for every page on the site.",
        ),
        _make_page(
            url="https://example.com/b",
            final_url="https://example.com/b",
            title="Same Title",
            meta_description="Same description for every page on the site.",
        ),
    ]
    auditor = Auditor(AuditConfig(run_lighthouse=False))
    result = await auditor.analyze(pages)

    dup_title_issues = [i for i in result.issues if i.category == "duplicate_title"]
    dup_meta_issues = [i for i in result.issues if i.category == "duplicate_meta_description"]
    assert len(dup_title_issues) == 2  # one per page
    assert len(dup_meta_issues) == 2


@pytest.mark.asyncio
async def test_how_to_fix_always_present():
    """Every issue should have actionable how_to_fix guidance."""
    page = _make_page(
        title=None,
        meta_description=None,
        canonical_url=None,
        headings=[],
        open_graph=None,
        schema_org=[],
    )
    auditor = Auditor(AuditConfig(run_lighthouse=False))
    result = await auditor.analyze([page])

    for issue in result.issues:
        assert issue.how_to_fix, f"Issue {issue.category} missing how_to_fix"
        assert len(issue.how_to_fix) > 20, f"Issue {issue.category} how_to_fix too short"


@pytest.mark.asyncio
async def test_summary_stats():
    """Summary stats should be computed from page data."""
    pages = [
        _make_page(depth=0),
        _make_page(
            url="https://example.com/p2",
            final_url="https://example.com/p2",
            depth=1,
        ),
    ]
    auditor = Auditor(AuditConfig(run_lighthouse=False))
    result = await auditor.analyze(pages)

    assert result.summary.total_pages == 2
    assert result.summary.total_images == 2  # 1 per page
    assert result.summary.https_pages == 2
    assert result.summary.avg_load_time_ms == 1200.0


@pytest.mark.asyncio
async def test_custom_detector():
    """Users should be able to add custom detectors at runtime."""
    from axelseo_auditor.detectors.base import IssueDetector
    from axelseo_auditor.models import SEOIssue

    class CustomDetector(IssueDetector):
        def detect(self, pages, config):
            return [SEOIssue(
                page_url=None,
                severity=Severity.INFO,
                category="custom",
                message="Custom check passed",
                how_to_fix="Nothing to fix — this is a custom check.",
            )]

    auditor = Auditor(AuditConfig(run_lighthouse=False))
    auditor.add_detector(CustomDetector())
    result = await auditor.analyze([_make_page()])

    custom = [i for i in result.issues if i.category == "custom"]
    assert len(custom) == 1


@pytest.mark.asyncio
async def test_empty_pages_returns_empty_result():
    auditor = Auditor(AuditConfig(run_lighthouse=False))
    result = await auditor.analyze([])
    assert result.scores.seo == 0
    assert result.issues == []
