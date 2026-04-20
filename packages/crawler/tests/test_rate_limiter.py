import asyncio
import time

import pytest

from axelseo_crawler.rate_limiter import RateLimiter


@pytest.mark.asyncio
async def test_respects_rate_limit():
    limiter = RateLimiter(requests_per_second=10.0)  # 100ms between requests

    t0 = time.monotonic()
    for _ in range(3):
        await limiter.acquire()
    elapsed = time.monotonic() - t0

    # 3 requests at 10rps = ~200ms minimum gap between first and third
    assert elapsed >= 0.18  # allow small tolerance


@pytest.mark.asyncio
async def test_crawl_delay_overrides_when_slower():
    limiter = RateLimiter(requests_per_second=10.0, crawl_delay=1.0)
    # crawl_delay=1.0 → 1 rps, which is slower than 10 rps
    assert limiter.effective_rps == 1.0


@pytest.mark.asyncio
async def test_crawl_delay_ignored_when_faster():
    limiter = RateLimiter(requests_per_second=0.5, crawl_delay=0.1)
    # crawl_delay=0.1 → 10 rps, but config says 0.5 rps, so config wins (stricter)
    assert limiter.effective_rps == 0.5


@pytest.mark.asyncio
async def test_no_delay_without_crawl_delay():
    limiter = RateLimiter(requests_per_second=1000.0)
    t0 = time.monotonic()
    await limiter.acquire()
    elapsed = time.monotonic() - t0
    assert elapsed < 0.05  # first call shouldn't wait
