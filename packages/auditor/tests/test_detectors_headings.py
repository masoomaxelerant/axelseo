"""Tests for heading detectors."""

from axelseo_auditor.config import AuditConfig
from axelseo_auditor.detectors.headings import (
    HeadingHierarchyDetector,
    MissingH1Detector,
    MultipleH1Detector,
    TitleH1DuplicateDetector,
)
from axelseo_auditor.models import Severity

config = AuditConfig()


class TestMissingH1:
    def test_detects_missing(self, page_missing_h1):
        issues = MissingH1Detector().detect([page_missing_h1], config)
        assert len(issues) == 1
        assert issues[0].severity == Severity.CRITICAL

    def test_no_issue_when_present(self, good_page):
        assert MissingH1Detector().detect([good_page], config) == []


class TestMultipleH1:
    def test_detects_multiple(self, page_multiple_h1):
        issues = MultipleH1Detector().detect([page_multiple_h1], config)
        assert len(issues) == 1
        assert issues[0].severity == Severity.CRITICAL
        assert "2" in issues[0].message

    def test_single_h1_ok(self, good_page):
        assert MultipleH1Detector().detect([good_page], config) == []


class TestTitleH1Duplicate:
    def test_detects_match(self, page_h1_matches_title):
        issues = TitleH1DuplicateDetector().detect([page_h1_matches_title], config)
        assert len(issues) == 1
        assert issues[0].severity == Severity.WARNING

    def test_different_text_ok(self, good_page):
        assert TitleH1DuplicateDetector().detect([good_page], config) == []


class TestHeadingHierarchy:
    def test_detects_skip(self, page_heading_skip):
        issues = HeadingHierarchyDetector().detect([page_heading_skip], config)
        assert len(issues) == 1
        assert "H1 → H3" in issues[0].message

    def test_proper_hierarchy_ok(self, good_page):
        assert HeadingHierarchyDetector().detect([good_page], config) == []
