"""Tests for title and meta description detectors."""

from axelseo_auditor.config import AuditConfig
from axelseo_auditor.detectors.meta import (
    DuplicateMetaDescriptionDetector,
    DuplicateTitleDetector,
    MetaDescriptionLengthDetector,
    MissingMetaDescriptionDetector,
    MissingTitleDetector,
    TitleLengthDetector,
)
from axelseo_auditor.models import Severity

config = AuditConfig()


class TestMissingTitle:
    def test_detects_missing(self, page_missing_title):
        issues = MissingTitleDetector().detect([page_missing_title], config)
        assert len(issues) == 1
        assert issues[0].severity == Severity.CRITICAL
        assert issues[0].category == "title"

    def test_no_issue_when_present(self, good_page):
        issues = MissingTitleDetector().detect([good_page], config)
        assert issues == []

    def test_skips_error_pages(self, page_broken):
        issues = MissingTitleDetector().detect([page_broken], config)
        assert issues == []


class TestMissingMetaDescription:
    def test_detects_missing(self, page_missing_meta):
        issues = MissingMetaDescriptionDetector().detect([page_missing_meta], config)
        assert len(issues) == 1
        assert issues[0].severity == Severity.CRITICAL

    def test_no_issue_when_present(self, good_page):
        issues = MissingMetaDescriptionDetector().detect([good_page], config)
        assert issues == []


class TestDuplicateTitle:
    def test_detects_duplicates(self, good_page):
        from tests.conftest import _make_page

        page2 = _make_page(
            url="https://example.com/other",
            final_url="https://example.com/other",
            title=good_page.title,
        )
        issues = DuplicateTitleDetector().detect([good_page, page2], config)
        assert len(issues) == 2  # one issue per page
        assert all(i.severity == Severity.CRITICAL for i in issues)

    def test_no_duplicates(self, good_page):
        from tests.conftest import _make_page

        page2 = _make_page(
            url="https://example.com/unique",
            final_url="https://example.com/unique",
            title="Different Unique Title",
        )
        issues = DuplicateTitleDetector().detect([good_page, page2], config)
        assert issues == []


class TestDuplicateMetaDescription:
    def test_detects_duplicates(self, good_page):
        from tests.conftest import _make_page

        page2 = _make_page(
            url="https://example.com/dupe",
            final_url="https://example.com/dupe",
            meta_description=good_page.meta_description,
        )
        issues = DuplicateMetaDescriptionDetector().detect([good_page, page2], config)
        assert len(issues) == 2


class TestTitleLength:
    def test_too_long(self, page_long_title):
        issues = TitleLengthDetector().detect([page_long_title], config)
        assert len(issues) == 1
        assert issues[0].severity == Severity.WARNING
        assert "too long" in issues[0].message

    def test_too_short(self):
        from tests.conftest import _make_page

        page = _make_page(title="Hi")
        issues = TitleLengthDetector().detect([page], config)
        assert len(issues) == 1
        assert "too short" in issues[0].message

    def test_good_length(self, good_page):
        issues = TitleLengthDetector().detect([good_page], config)
        assert issues == []


class TestMetaDescriptionLength:
    def test_too_long(self):
        from tests.conftest import _make_page

        page = _make_page(meta_description="x" * 200)
        issues = MetaDescriptionLengthDetector().detect([page], config)
        assert len(issues) == 1
        assert "too long" in issues[0].message

    def test_too_short(self):
        from tests.conftest import _make_page

        page = _make_page(meta_description="Short desc")
        issues = MetaDescriptionLengthDetector().detect([page], config)
        assert len(issues) == 1
        assert "too short" in issues[0].message
