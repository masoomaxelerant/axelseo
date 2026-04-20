"""Image-related SEO detectors."""

from __future__ import annotations

from axelseo_auditor.config import AuditConfig
from axelseo_auditor.detectors.base import IssueDetector
from axelseo_auditor.models import SEOIssue, Severity
from axelseo_crawler.models import CrawledPage


class ImageMissingAltDetector(IssueDetector):
    def detect(self, pages: list[CrawledPage], config: AuditConfig) -> list[SEOIssue]:
        issues = []
        for page in pages:
            if page.error or page.status_code >= 400:
                continue
            missing = [img for img in page.images if not img.alt]
            if missing:
                issues.append(SEOIssue(
                    page_url=page.final_url,
                    severity=Severity.WARNING,
                    category="image_alt",
                    message=f"{len(missing)} image(s) missing alt text.",
                    how_to_fix="Add descriptive alt attributes to all <img> tags. "
                    "Alt text helps search engines understand image content and is essential "
                    "for accessibility. Describe what the image shows in 5–15 words.",
                    context={
                        "count": len(missing),
                        "sources": [img.src for img in missing[:5]],
                    },
                ))
        return issues


class ImageMissingDimensionsDetector(IssueDetector):
    """Images without explicit width/height cause layout shift (CLS)."""

    def detect(self, pages: list[CrawledPage], config: AuditConfig) -> list[SEOIssue]:
        issues = []
        for page in pages:
            if page.error or page.status_code >= 400:
                continue
            missing = [
                img for img in page.images
                if not img.width or not img.height
            ]
            if missing:
                issues.append(SEOIssue(
                    page_url=page.final_url,
                    severity=Severity.WARNING,
                    category="image_dimensions",
                    message=f"{len(missing)} image(s) missing width/height attributes (CLS risk).",
                    how_to_fix="Add explicit width and height attributes to <img> tags, or use "
                    "CSS aspect-ratio. This prevents Cumulative Layout Shift (CLS) as images "
                    "load, which is a Core Web Vital that affects rankings.",
                    context={
                        "count": len(missing),
                        "sources": [img.src for img in missing[:5]],
                    },
                ))
        return issues
