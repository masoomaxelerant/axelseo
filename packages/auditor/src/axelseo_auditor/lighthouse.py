"""Lighthouse runner — with automatic fallback to PageSpeed Insights API.

Tries local Lighthouse CLI first (fastest, needs Node.js + Chrome).
If unavailable, falls back to Google's free PageSpeed Insights API
(no API key needed, rate-limited to ~25 req/min).
"""

from __future__ import annotations

import asyncio
import json
import shutil
from typing import Any

import httpx
import structlog

from axelseo_auditor.models import LighthousePageResult

logger = structlog.get_logger(__name__)

PSI_API_URL = "https://www.googleapis.com/pagespeedonline/v5/runPagespeed"


def _find_lighthouse() -> str | None:
    for cmd in ["lighthouse", "npx lighthouse"]:
        base = cmd.split()[0]
        if shutil.which(base):
            return cmd
    return None


async def run_lighthouse(
    url: str,
    timeout_seconds: int = 120,
    preset: str = "mobile",
) -> LighthousePageResult | None:
    """Run Lighthouse — tries local CLI first, falls back to PageSpeed Insights API."""
    # Try local Lighthouse first
    lh_cmd = _find_lighthouse()
    if lh_cmd:
        result = await _run_local_lighthouse(url, lh_cmd, timeout_seconds, preset)
        if result:
            return result

    # Fallback: PageSpeed Insights API (free, no API key needed)
    logger.info("lighthouse.using_psi_fallback", url=url, preset=preset)
    return await _run_pagespeed_insights(url, timeout_seconds, preset)


async def _run_local_lighthouse(
    url: str, lh_cmd: str, timeout_seconds: int, preset: str
) -> LighthousePageResult | None:
    """Run Lighthouse via local Node.js CLI."""
    cmd_parts = lh_cmd.split() + [
        url,
        "--output=json",
        "--chrome-flags=--headless --no-sandbox --disable-gpu",
        "--only-categories=performance,accessibility,best-practices,seo",
        "--quiet",
    ]
    if preset == "desktop":
        cmd_parts.append("--preset=desktop")

    logger.info("lighthouse.running_local", url=url, preset=preset)

    try:
        proc = await asyncio.create_subprocess_exec(
            *cmd_parts,
            stdout=asyncio.subprocess.PIPE,
            stderr=asyncio.subprocess.PIPE,
        )
        stdout, stderr = await asyncio.wait_for(
            proc.communicate(), timeout=timeout_seconds
        )

        if proc.returncode != 0:
            logger.warning("lighthouse.local_failed", url=url, preset=preset)
            return None

        data = json.loads(stdout.decode())
        return _parse_lighthouse_json(url, data)

    except asyncio.TimeoutError:
        logger.warning("lighthouse.local_timeout", url=url)
        return None
    except (json.JSONDecodeError, KeyError, TypeError) as e:
        logger.warning("lighthouse.local_parse_error", url=url, error=str(e))
        return None


async def _run_pagespeed_insights(
    url: str, timeout_seconds: int, preset: str
) -> LighthousePageResult | None:
    """Fetch Lighthouse data from Google's PageSpeed Insights API (free, no key needed)."""
    strategy = "DESKTOP" if preset == "desktop" else "MOBILE"
    params = {
        "url": url,
        "strategy": strategy,
        "category": ["PERFORMANCE", "ACCESSIBILITY", "BEST_PRACTICES", "SEO"],
    }

    logger.info("lighthouse.psi_request", url=url, strategy=strategy)

    try:
        async with httpx.AsyncClient(timeout=timeout_seconds) as client:
            resp = await client.get(PSI_API_URL, params=params)

        if resp.status_code != 200:
            logger.warning("lighthouse.psi_failed", url=url, status=resp.status_code)
            return None

        data = resp.json()
        lh_result = data.get("lighthouseResult", {})
        return _parse_lighthouse_json(url, lh_result)

    except httpx.TimeoutException:
        logger.warning("lighthouse.psi_timeout", url=url)
        return None
    except Exception as e:
        logger.warning("lighthouse.psi_error", url=url, error=str(e))
        return None


def _parse_lighthouse_json(url: str, data: dict[str, Any]) -> LighthousePageResult:
    """Extract scores and metrics from Lighthouse JSON (works with both local and PSI)."""
    categories = data.get("categories", {})
    audits = data.get("audits", {})

    def cat_score(name: str) -> float:
        cat = categories.get(name, {})
        score = cat.get("score")
        return round(score * 100, 1) if score is not None else 0.0

    def metric_ms(audit_id: str) -> float | None:
        audit = audits.get(audit_id, {})
        val = audit.get("numericValue")
        return round(val, 1) if val is not None else None

    def metric_raw(audit_id: str) -> float | None:
        audit = audits.get(audit_id, {})
        val = audit.get("numericValue")
        return round(val, 4) if val is not None else None

    return LighthousePageResult(
        url=url,
        performance=cat_score("performance"),
        accessibility=cat_score("accessibility"),
        best_practices=cat_score("best-practices"),
        seo=cat_score("seo"),
        lcp_ms=metric_ms("largest-contentful-paint"),
        fcp_ms=metric_ms("first-contentful-paint"),
        inp_ms=metric_ms("experimental-interaction-to-next-paint"),
        cls=metric_raw("cumulative-layout-shift"),
        tbt_ms=metric_ms("total-blocking-time"),
        speed_index_ms=metric_ms("speed-index"),
    )


async def run_lighthouse_batch(
    urls: list[str],
    timeout_seconds: int = 120,
    preset: str = "mobile",
) -> list[LighthousePageResult]:
    """Run Lighthouse on multiple URLs sequentially."""
    results: list[LighthousePageResult] = []
    for url in urls:
        result = await run_lighthouse(url, timeout_seconds, preset=preset)
        if result:
            results.append(result)
        # Rate limit for PSI API (25 req/min)
        if not _find_lighthouse():
            await asyncio.sleep(3)
    return results
