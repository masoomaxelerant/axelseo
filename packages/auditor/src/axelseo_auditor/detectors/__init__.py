"""Issue detectors — each class implements the IssueDetector protocol.

To add a new detector: create a new class with a `detect` method matching the
IssueDetector protocol, then add it to ALL_DETECTORS.
"""

from axelseo_auditor.detectors.base import IssueDetector
from axelseo_auditor.detectors.canonical import CanonicalDetector
from axelseo_auditor.detectors.content import ThinContentDetector
from axelseo_auditor.detectors.headings import (
    HeadingHierarchyDetector,
    MissingH1Detector,
    MultipleH1Detector,
    TitleH1DuplicateDetector,
)
from axelseo_auditor.detectors.images import (
    ImageMissingAltDetector,
    ImageMissingDimensionsDetector,
)
from axelseo_auditor.detectors.links import (
    BrokenLinkDetector,
    ExcessiveLinksDetector,
    ExternalLinksNoOpenerDetector,
    GenericAnchorTextDetector,
    OrphanPageDetector,
    RedirectChainDetector,
)
from axelseo_auditor.detectors.meta import (
    DuplicateMetaDescriptionDetector,
    DuplicateTitleDetector,
    MetaDescriptionLengthDetector,
    MissingMetaDescriptionDetector,
    MissingTitleDetector,
    TitleLengthDetector,
)
from axelseo_auditor.detectors.protocol import HttpsDetector
from axelseo_auditor.detectors.structured_data import (
    MissingBreadcrumbSchemaDetector,
    MissingOpenGraphDetector,
    MissingSchemaOrgDetector,
    MissingTwitterCardDetector,
)

# All detectors — the auditor runs each one. Add new detectors here.
ALL_DETECTORS: list[IssueDetector] = [
    # Critical — title / meta
    MissingTitleDetector(),
    MissingMetaDescriptionDetector(),
    DuplicateTitleDetector(),
    DuplicateMetaDescriptionDetector(),
    # Critical — headings
    MissingH1Detector(),
    MultipleH1Detector(),
    # Critical — links / protocol
    BrokenLinkDetector(),
    RedirectChainDetector(),
    HttpsDetector(),
    CanonicalDetector(),
    # Warnings — length
    TitleLengthDetector(),
    MetaDescriptionLengthDetector(),
    # Warnings — images
    ImageMissingAltDetector(),
    ImageMissingDimensionsDetector(),
    # Warnings — headings
    TitleH1DuplicateDetector(),
    HeadingHierarchyDetector(),
    # Warnings — content / links
    ThinContentDetector(),
    OrphanPageDetector(),
    ExcessiveLinksDetector(),
    # Warnings — structured data
    MissingOpenGraphDetector(),
    MissingSchemaOrgDetector(),
    # Info
    MissingTwitterCardDetector(),
    MissingBreadcrumbSchemaDetector(),
    GenericAnchorTextDetector(),
    ExternalLinksNoOpenerDetector(),
]

__all__ = ["IssueDetector", "ALL_DETECTORS"]
