"""AxelSEO Auditor — SEO analysis engine with issue detection and scoring."""

from axelseo_auditor.auditor import Auditor
from axelseo_auditor.config import AuditConfig
from axelseo_auditor.models import AuditResult, SEOIssue

__all__ = ["Auditor", "AuditConfig", "AuditResult", "SEOIssue"]
__version__ = "0.1.0"
