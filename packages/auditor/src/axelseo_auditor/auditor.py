"""Main Auditor class — orchestrates detectors, Lighthouse, and scoring."""

from __future__ import annotations

import random

import structlog

from axelseo_auditor.config import AuditConfig
from axelseo_auditor.detectors import ALL_DETECTORS
from axelseo_auditor.lighthouse import run_lighthouse_batch
from axelseo_auditor.models import AuditResult, Scores
from axelseo_auditor.scoring import (
    compute_core_web_vitals,
    compute_lighthouse_scores,
    compute_seo_score,
    compute_summary_stats,
)
from axelseo_crawler.models import CrawledPage

logger = structlog.get_logger(__name__)


class Auditor:
    """SEO auditor that analyzes crawled pages for issues and produces scores.

    Usage::

        config = AuditConfig(run_lighthouse=True, lighthouse_sample_size=5)
        auditor = Auditor(config)
        result = await auditor.analyze(pages)
    """

    def __init__(self, config: AuditConfig | None = None) -> None:
        self._config = config or AuditConfig()
        self._detectors = list(ALL_DETECTORS)

    def add_detector(self, detector) -> None:
        """Register a custom IssueDetector at runtime."""
        self._detectors.append(detector)

    async def analyze(self, pages: list[CrawledPage]) -> AuditResult:
        """Run full SEO analysis on a list of crawled pages.

        Steps:
          1. Run all issue detectors
          2. Optionally run Lighthouse on sampled pages
          3. Compute scores (SEO from issues, others from Lighthouse)
          4. Compute summary stats
        """
        if not pages:
            logger.warning("auditor.no_pages")
            return AuditResult()

        result = AuditResult()

        # Step 1: Run all detectors
        logger.info("auditor.detecting_issues", detectors=len(self._detectors), pages=len(pages))
        for detector in self._detectors:
            try:
                issues = detector.detect(pages, self._config)
                result.issues.extend(issues)
            except Exception as e:
                logger.error(
                    "auditor.detector_failed",
                    detector=type(detector).__name__,
                    error=str(e),
                )

        logger.info(
            "auditor.issues_found",
            critical=result.critical_count,
            warning=result.warning_count,
            info=result.info_count,
        )

        # Step 2: Lighthouse (if enabled)
        if self._config.run_lighthouse:
            sample_urls = self._select_lighthouse_sample(pages)

            psi_key = self._config.psi_api_key or None

            # Mobile
            logger.info("auditor.lighthouse_starting", sample_size=len(sample_urls), preset="mobile")
            lh_results = await run_lighthouse_batch(
                sample_urls, self._config.lighthouse_timeout_seconds, preset="mobile", psi_api_key=psi_key
            )
            result.lighthouse_results = lh_results
            if lh_results:
                lh_scores = compute_lighthouse_scores(lh_results)
                result.scores.performance = lh_scores.performance
                result.scores.accessibility = lh_scores.accessibility
                result.scores.best_practices = lh_scores.best_practices
                result.core_web_vitals = compute_core_web_vitals(lh_results)
                logger.info("auditor.lighthouse_mobile_done", pages=len(lh_results), perf=lh_scores.performance)

            # Desktop
            logger.info("auditor.lighthouse_starting", sample_size=len(sample_urls), preset="desktop")
            desktop_results = await run_lighthouse_batch(
                sample_urls, self._config.lighthouse_timeout_seconds, preset="desktop", psi_api_key=psi_key
            )
            result.desktop_lighthouse_results = desktop_results
            if desktop_results:
                ds = compute_lighthouse_scores(desktop_results)
                result.desktop_scores.performance = ds.performance
                result.desktop_scores.accessibility = ds.accessibility
                result.desktop_scores.best_practices = ds.best_practices
                result.desktop_core_web_vitals = compute_core_web_vitals(desktop_results)
                logger.info("auditor.lighthouse_desktop_done", pages=len(desktop_results), perf=ds.performance)

        # Step 3: SEO score from issue analysis (same for both modes)
        result.scores.seo = compute_seo_score(result)
        result.desktop_scores.seo = result.scores.seo

        # Step 4: Summary stats
        result.summary = compute_summary_stats(pages, result)

        logger.info(
            "auditor.complete",
            seo_score=result.scores.seo,
            total_issues=len(result.issues),
        )

        return result

    def _select_lighthouse_sample(self, pages: list[CrawledPage]) -> list[str]:
        """Select pages for Lighthouse analysis.

        Always includes the homepage (depth 0), then randomly samples from
        remaining valid pages.
        """
        valid = [p for p in pages if p.status_code < 400 and not p.error]
        if not valid:
            return []

        # Homepage first
        homepage = [p for p in valid if p.depth == 0]
        others = [p for p in valid if p.depth > 0]

        sample_urls: list[str] = []
        if homepage:
            sample_urls.append(homepage[0].final_url)

        remaining_slots = self._config.lighthouse_sample_size - len(sample_urls)
        if remaining_slots > 0 and others:
            sampled = random.sample(others, min(remaining_slots, len(others)))
            sample_urls.extend(p.final_url for p in sampled)

        return sample_urls
