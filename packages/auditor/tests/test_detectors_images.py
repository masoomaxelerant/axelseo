"""Tests for image detectors."""

from axelseo_auditor.config import AuditConfig
from axelseo_auditor.detectors.images import (
    ImageMissingAltDetector,
    ImageMissingDimensionsDetector,
)
from axelseo_auditor.models import Severity

config = AuditConfig()


class TestImageMissingAlt:
    def test_detects_missing_alt(self, page_images_no_alt):
        issues = ImageMissingAltDetector().detect([page_images_no_alt], config)
        assert len(issues) == 1
        assert issues[0].severity == Severity.WARNING
        assert "2" in issues[0].message  # 2 images missing alt

    def test_all_images_have_alt(self, good_page):
        assert ImageMissingAltDetector().detect([good_page], config) == []


class TestImageMissingDimensions:
    def test_detects_missing_dims(self, page_images_no_dims):
        issues = ImageMissingDimensionsDetector().detect([page_images_no_dims], config)
        assert len(issues) == 1
        assert "CLS" in issues[0].message

    def test_all_images_have_dims(self, good_page):
        assert ImageMissingDimensionsDetector().detect([good_page], config) == []
