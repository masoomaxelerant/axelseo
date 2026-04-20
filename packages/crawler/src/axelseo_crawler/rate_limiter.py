"""Async token-bucket rate limiter."""

from __future__ import annotations

import asyncio
import time


class RateLimiter:
    """Token-bucket rate limiter for async crawling.

    Ensures we don't exceed `requests_per_second` average throughput.
    If robots.txt specifies a crawl-delay, the effective rate is
    min(configured_rps, 1/crawl_delay).
    """

    def __init__(self, requests_per_second: float, crawl_delay: float | None = None) -> None:
        if crawl_delay and crawl_delay > 0:
            robots_rps = 1.0 / crawl_delay
            self._rps = min(requests_per_second, robots_rps)
        else:
            self._rps = requests_per_second

        self._min_interval = 1.0 / self._rps
        self._last_request_time: float = 0.0
        self._lock = asyncio.Lock()

    @property
    def effective_rps(self) -> float:
        return self._rps

    async def acquire(self) -> None:
        """Wait until we're allowed to make the next request."""
        async with self._lock:
            now = time.monotonic()
            elapsed = now - self._last_request_time
            if elapsed < self._min_interval:
                await asyncio.sleep(self._min_interval - elapsed)
            self._last_request_time = time.monotonic()
