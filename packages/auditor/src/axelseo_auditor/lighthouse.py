"""Lighthouse runner — executes Google Lighthouse via Node subprocess.

Supports both mobile (default) and desktop emulation modes.
Parses JSON output to extract performance, accessibility, best-practices,
and SEO scores plus Core Web Vitals metrics.
"""

from __future__ import annotations

import asyncio
import json
import shutil
from typing import Any

import structlog

from axelseo_auditor.models import LighthousePageResult

logger = structlog.get_logger(__name__)


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
    """Run a Lighthouse audit on a single URL.

    Args:
        url: Page URL to audit.
        timeout_seconds: Max wait time.
        preset: "mobile" (default Lighthouse behavior) or "desktop".

    Returns LighthousePageResult or None on failure.
    """
    lh_cmd = _find_lighthouse()
    if not lh_cmd:
        logger.warning("lighthouse.not_found", url=url)
        return None

    cmd_parts = lh_cmd.split() + [
        url,
        "--output=json",
        "--chrome-flags=--headless --no-sandbox --disable-gpu",
        "--only-categories=performance,accessibility,best-practices,seo",
        "--quiet",
    ]

    if preset == "desktop":
        cmd_parts.append("--preset=desktop")

    logger.info("lighthouse.running", url=url, preset=preset)

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
            logger.warning("lighthouse.failed", url=url, preset=preset, returncode=proc.returncode)
            return None

        data = json.loads(stdout.decode())
        return _parse_lighthouse_json(url, data)

    except asyncio.TimeoutError:
        logger.warning("lighthouse.timeout", url=url, preset=preset, timeout=timeout_seconds)
        return None
    except (json.JSONDecodeError, KeyError, TypeError) as e:
        logger.warning("lighthouse.parse_error", url=url, error=str(e))
        return None


def _parse_lighthouse_json(url: str, data: dict[str, Any]) -> LighthousePageResult:
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
    return results
