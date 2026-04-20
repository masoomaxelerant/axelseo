"""Tests for scoring algorithm."""

from axelseo_auditor.models import (
    AuditResult,
    CoreWebVitals,
    LighthousePageResult,
    SEOIssue,
    Severity,
)
from axelseo_auditor.scoring import (
    compute_core_web_vitals,
    compute_lighthouse_scores,
    compute_seo_score,
)


def _issue(severity: Severity) -> SEOIssue:
    return SEOIssue(
        page_url="https://example.com",
        severity=severity,
        category="test",
        message="test",
        how_to_fix="test",
    )


class TestSEOScore:
    def test_perfect_score_no_issues(self):
        result = AuditResult()
        assert compute_seo_score(result) == 100.0

    def test_criticals_deduct_5_each(self):
        result = AuditResult(issues=[_issue(Severity.CRITICAL)] * 3)
        assert compute_seo_score(result) == 85.0  # 100 - 15

    def test_criticals_capped_at_50(self):
        result = AuditResult(issues=[_issue(Severity.CRITICAL)] * 20)
        assert compute_seo_score(result) == 50.0  # 100 - 50 (capped)

    def test_warnings_deduct_2_each(self):
        result = AuditResult(issues=[_issue(Severity.WARNING)] * 5)
        assert compute_seo_score(result) == 90.0  # 100 - 10

    def test_warnings_capped_at_30(self):
        result = AuditResult(issues=[_issue(Severity.WARNING)] * 50)
        assert compute_seo_score(result) == 70.0  # 100 - 30 (capped)

    def test_info_deducts_half_point(self):
        result = AuditResult(issues=[_issue(Severity.INFO)] * 6)
        assert compute_seo_score(result) == 97.0  # 100 - 3

    def test_info_capped_at_10(self):
        result = AuditResult(issues=[_issue(Severity.INFO)] * 100)
        assert compute_seo_score(result) == 90.0  # 100 - 10 (capped)

    def test_mixed_issues(self):
        result = AuditResult(issues=[
            _issue(Severity.CRITICAL),    # -5
            _issue(Severity.WARNING),     # -2
            _issue(Severity.INFO),        # -0.5
        ])
        assert compute_seo_score(result) == 92.5

    def test_score_floors_at_zero(self):
        result = AuditResult(
            issues=(
                [_issue(Severity.CRITICAL)] * 10
                + [_issue(Severity.WARNING)] * 15
                + [_issue(Severity.INFO)] * 20
            )
        )
        # 100 - 50 - 30 - 10 = 10
        assert compute_seo_score(result) == 10.0


class TestLighthouseScores:
    def test_averages(self):
        results = [
            LighthousePageResult(
                url="https://a.com", performance=80, accessibility=90,
                best_practices=85, seo=95,
            ),
            LighthousePageResult(
                url="https://b.com", performance=60, accessibility=70,
                best_practices=75, seo=85,
            ),
        ]
        scores = compute_lighthouse_scores(results)
        assert scores.performance == 70.0
        assert scores.accessibility == 80.0
        assert scores.best_practices == 80.0
        assert scores.seo == 90.0

    def test_empty_returns_zeros(self):
        scores = compute_lighthouse_scores([])
        assert scores.performance == 0.0


class TestCoreWebVitals:
    def test_median_calculation(self):
        results = [
            LighthousePageResult(
                url="https://a.com", performance=0, accessibility=0,
                best_practices=0, seo=0,
                lcp_ms=2000, inp_ms=100, cls=0.05,
            ),
            LighthousePageResult(
                url="https://b.com", performance=0, accessibility=0,
                best_practices=0, seo=0,
                lcp_ms=4000, inp_ms=300, cls=0.2,
            ),
            LighthousePageResult(
                url="https://c.com", performance=0, accessibility=0,
                best_practices=0, seo=0,
                lcp_ms=3000, inp_ms=150, cls=0.1,
            ),
        ]
        cwv = compute_core_web_vitals(results)
        assert cwv.lcp_ms == 3000.0  # median of [2000, 3000, 4000]
        assert cwv.inp_ms == 150.0   # median of [100, 150, 300]
        assert cwv.cls == 0.1        # median of [0.05, 0.1, 0.2]
        assert cwv.lcp_rating == "needs-improvement"
        assert cwv.inp_rating == "good"
        assert cwv.cls_rating == "good"

    def test_cwv_ratings(self):
        results = [
            LighthousePageResult(
                url="https://slow.com", performance=0, accessibility=0,
                best_practices=0, seo=0,
                lcp_ms=5000, inp_ms=600, cls=0.3,
            ),
        ]
        cwv = compute_core_web_vitals(results)
        assert cwv.lcp_rating == "poor"
        assert cwv.inp_rating == "poor"
        assert cwv.cls_rating == "poor"
