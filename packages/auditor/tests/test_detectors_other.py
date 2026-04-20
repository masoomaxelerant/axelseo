"""Tests for protocol, canonical, content, and structured data detectors."""

from axelseo_auditor.config import AuditConfig
from axelseo_auditor.detectors.canonical import CanonicalDetector
from axelseo_auditor.detectors.content import ThinContentDetector
from axelseo_auditor.detectors.protocol import HttpsDetector
from axelseo_auditor.detectors.structured_data import (
    MissingBreadcrumbSchemaDetector,
    MissingOpenGraphDetector,
    MissingSchemaOrgDetector,
    MissingTwitterCardDetector,
)
from axelseo_auditor.models import Severity

config = AuditConfig()


class TestHttps:
    def test_detects_http(self, page_http):
        issues = HttpsDetector().detect([page_http], config)
        assert len(issues) == 1
        assert issues[0].severity == Severity.CRITICAL

    def test_https_ok(self, good_page):
        assert HttpsDetector().detect([good_page], config) == []


class TestCanonical:
    def test_detects_missing(self, page_no_canonical):
        issues = CanonicalDetector().detect([page_no_canonical], config)
        assert len(issues) == 1
        assert issues[0].severity == Severity.CRITICAL

    def test_canonical_present_ok(self, good_page):
        assert CanonicalDetector().detect([good_page], config) == []


class TestThinContent:
    def test_detects_thin(self, page_thin_content):
        issues = ThinContentDetector().detect([page_thin_content], config)
        assert len(issues) == 1
        assert issues[0].severity == Severity.WARNING
        assert "Thin content" in issues[0].message

    def test_sufficient_content_ok(self, good_page):
        assert ThinContentDetector().detect([good_page], config) == []


class TestMissingOpenGraph:
    def test_detects_missing(self, page_no_og):
        issues = MissingOpenGraphDetector().detect([page_no_og], config)
        assert len(issues) == 1
        assert issues[0].severity == Severity.WARNING

    def test_og_present_ok(self, good_page):
        assert MissingOpenGraphDetector().detect([good_page], config) == []


class TestMissingSchemaOrg:
    def test_detects_missing(self, page_no_schema):
        issues = MissingSchemaOrgDetector().detect([page_no_schema], config)
        assert len(issues) == 1
        assert issues[0].severity == Severity.WARNING

    def test_schema_present_ok(self, good_page):
        assert MissingSchemaOrgDetector().detect([good_page], config) == []


class TestMissingTwitterCard:
    def test_detects_missing(self, page_no_twitter):
        issues = MissingTwitterCardDetector().detect([page_no_twitter], config)
        assert len(issues) == 1
        assert issues[0].severity == Severity.INFO

    def test_tc_present_ok(self, good_page):
        assert MissingTwitterCardDetector().detect([good_page], config) == []


class TestMissingBreadcrumb:
    def test_detects_no_breadcrumb(self, good_page):
        from tests.conftest import _make_page

        page2 = _make_page(
            url="https://example.com/p2",
            final_url="https://example.com/p2",
            schema_org=[{"@type": "WebPage"}],
        )
        issues = MissingBreadcrumbSchemaDetector().detect([good_page, page2], config)
        assert len(issues) == 1
        assert issues[0].severity == Severity.INFO
        assert issues[0].page_url is None  # site-wide issue

    def test_breadcrumb_present(self):
        from tests.conftest import _make_page

        page = _make_page(schema_org=[{"@type": "BreadcrumbList"}])
        page2 = _make_page(
            url="https://example.com/p2",
            final_url="https://example.com/p2",
        )
        issues = MissingBreadcrumbSchemaDetector().detect([page, page2], config)
        assert issues == []
