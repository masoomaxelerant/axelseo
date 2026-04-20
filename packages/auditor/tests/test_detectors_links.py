"""Tests for link detectors."""

from axelseo_auditor.config import AuditConfig
from axelseo_auditor.detectors.links import (
    BrokenLinkDetector,
    ExcessiveLinksDetector,
    GenericAnchorTextDetector,
    OrphanPageDetector,
    RedirectChainDetector,
)
from axelseo_auditor.models import Severity

config = AuditConfig()


class TestBrokenLinks:
    def test_detects_404(self, page_broken):
        issues = BrokenLinkDetector().detect([page_broken], config)
        assert len(issues) == 1
        assert issues[0].severity == Severity.CRITICAL
        assert "404" in issues[0].message

    def test_no_issue_200(self, good_page):
        assert BrokenLinkDetector().detect([good_page], config) == []


class TestRedirectChain:
    def test_detects_long_chain(self, page_redirect_chain):
        issues = RedirectChainDetector().detect([page_redirect_chain], config)
        assert len(issues) == 1
        assert issues[0].severity == Severity.CRITICAL
        assert "3 hops" in issues[0].message

    def test_no_chain(self, good_page):
        assert RedirectChainDetector().detect([good_page], config) == []


class TestOrphanPage:
    def test_detects_orphan(self):
        from axelseo_crawler.models import LinkInfo
        from tests.conftest import _make_page

        # page_a links to page_b but not to orphan
        page_a = _make_page(
            url="https://example.com/a",
            final_url="https://example.com/a",
            depth=1,
            links=[LinkInfo(href="https://example.com/b", anchor_text="B", is_internal=True)],
        )
        page_b = _make_page(
            url="https://example.com/b",
            final_url="https://example.com/b",
            depth=1,
            links=[LinkInfo(href="https://example.com/a", anchor_text="A", is_internal=True)],
        )
        orphan = _make_page(
            url="https://example.com/orphan",
            final_url="https://example.com/orphan",
            depth=2,
            links=[],
        )
        issues = OrphanPageDetector().detect([page_a, page_b, orphan], config)
        assert len(issues) == 1
        assert issues[0].page_url == "https://example.com/orphan"

    def test_homepage_exempt(self):
        from tests.conftest import _make_page

        homepage = _make_page(depth=0, links=[])
        issues = OrphanPageDetector().detect([homepage], config)
        assert issues == []


class TestExcessiveLinks:
    def test_detects_too_many(self, page_excessive_links):
        issues = ExcessiveLinksDetector().detect([page_excessive_links], config)
        assert len(issues) == 1
        assert issues[0].severity == Severity.WARNING
        assert "150" in issues[0].message

    def test_normal_count_ok(self, good_page):
        assert ExcessiveLinksDetector().detect([good_page], config) == []


class TestGenericAnchorText:
    def test_detects_generic(self, page_generic_anchors):
        issues = GenericAnchorTextDetector().detect([page_generic_anchors], config)
        assert len(issues) == 1
        assert issues[0].severity == Severity.INFO
        assert "2" in issues[0].message  # "click here" and "read more"
