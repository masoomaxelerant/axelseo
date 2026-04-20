"""Core async web crawler using Playwright."""

from __future__ import annotations

import asyncio
import time
from collections import deque
from datetime import UTC, datetime
from typing import AsyncIterator

import structlog
from bs4 import BeautifulSoup
from playwright.async_api import Browser, Page, Playwright, Response
from playwright.async_api import async_playwright

from axelseo_crawler.config import CrawlConfig
from axelseo_crawler.models import (
    CrawledPage,
    CrawlSummary,
    PagePerformance,
    RedirectHop,
)
from axelseo_crawler.parser import (
    extract_canonical,
    extract_headings,
    extract_images,
    extract_links,
    extract_meta_description,
    extract_meta_robots,
    extract_open_graph,
    extract_schema_org,
    extract_title,
    extract_twitter_card,
)
from axelseo_crawler.progress import ProgressReporter
from axelseo_crawler.rate_limiter import RateLimiter
from axelseo_crawler.robots import RobotsChecker
from axelseo_crawler.sitemap import discover_sitemap_urls
from axelseo_crawler.url_utils import (
    is_crawlable_url,
    is_same_origin,
    normalize_url,
    resolve_url,
)

logger = structlog.get_logger(__name__)


class _QueueItem:
    __slots__ = ("url", "depth")

    def __init__(self, url: str, depth: int) -> None:
        self.url = url
        self.depth = depth


class Crawler:
    """Async web crawler that yields CrawledPage objects.

    Usage::

        async with Crawler(config) as crawler:
            async for page in crawler.crawl():
                process(page)
            print(crawler.summary)
    """

    def __init__(self, config: CrawlConfig) -> None:
        self._config = config
        self._visited: set[str] = set()
        self._queue: deque[_QueueItem] = deque()
        self._summary = CrawlSummary(start_url=str(config.start_url))
        self._playwright: Playwright | None = None
        self._browser: Browser | None = None
        self._robots: RobotsChecker | None = None
        self._rate_limiter: RateLimiter | None = None
        self._progress: ProgressReporter | None = None

    @property
    def summary(self) -> CrawlSummary:
        return self._summary

    async def __aenter__(self) -> Crawler:
        self._playwright = await async_playwright().start()
        self._browser = await self._playwright.chromium.launch(headless=True)
        logger.info("crawler.browser_launched")

        # Load robots.txt
        if self._config.respect_robots_txt:
            self._robots = RobotsChecker(self._config.origin, self._config.user_agent)
            await self._robots.load()

        # Set up rate limiter (respecting crawl-delay)
        crawl_delay = self._robots.crawl_delay if self._robots else None
        self._rate_limiter = RateLimiter(self._config.requests_per_second, crawl_delay)
        logger.info(
            "crawler.rate_limiter",
            effective_rps=self._rate_limiter.effective_rps,
        )

        # Set up progress reporting
        self._progress = ProgressReporter(self._config.redis_url, self._config.audit_id)
        await self._progress.connect()

        return self

    async def __aexit__(self, *exc: object) -> None:
        if self._browser:
            await self._browser.close()
        if self._playwright:
            await self._playwright.stop()
        if self._progress:
            await self._progress.close()
        logger.info("crawler.shutdown")

    async def crawl(self) -> AsyncIterator[CrawledPage]:
        """BFS crawl starting from config.start_url. Yields pages as they're crawled."""
        self._summary.started_at = datetime.now(UTC)
        start = time.monotonic()

        # Seed the queue — try sitemap first, then fall back to start URL
        await self._seed_queue()

        while self._queue and self._summary.pages_crawled < self._config.max_pages:
            item = self._queue.popleft()
            normalized = normalize_url(item.url)

            if normalized in self._visited:
                continue
            self._visited.add(normalized)

            # Depth check
            if item.depth > self._config.max_depth:
                self._summary.pages_skipped += 1
                continue

            # robots.txt check
            if self._robots and not self._robots.can_fetch(item.url):
                logger.debug("crawler.robots_blocked", url=item.url)
                self._summary.pages_skipped += 1
                continue

            # Rate limit
            if self._rate_limiter:
                await self._rate_limiter.acquire()

            # Report progress
            if self._progress:
                await self._progress.report(
                    pages_crawled=self._summary.pages_crawled,
                    pages_queued=len(self._queue),
                    current_url=item.url,
                )

            # Crawl the page
            page_result = await self._crawl_page(item.url, item.depth)
            if page_result is None:
                continue

            self._summary.pages_crawled += 1

            # Enqueue discovered internal links
            for link in page_result.links:
                if not link.is_internal:
                    self._summary.external_links += 1
                    continue
                self._summary.internal_links += 1

                link_normalized = normalize_url(link.href)
                if (
                    link_normalized not in self._visited
                    and is_crawlable_url(link.href)
                    and item.depth + 1 <= self._config.max_depth
                ):
                    self._queue.append(_QueueItem(link.href, item.depth + 1))

            self._summary.total_links_found += len(page_result.links)

            yield page_result

        elapsed = time.monotonic() - start
        self._summary.elapsed_seconds = round(elapsed, 2)
        self._summary.finished_at = datetime.now(UTC)

        if self._progress:
            await self._progress.report(
                pages_crawled=self._summary.pages_crawled,
                pages_queued=0,
                current_url="",
                status="completed",
            )

        logger.info(
            "crawl.finished",
            pages=self._summary.pages_crawled,
            failed=self._summary.pages_failed,
            elapsed=self._summary.elapsed_seconds,
        )

    async def _seed_queue(self) -> None:
        """Populate the initial queue from sitemap or start URL."""
        start_url = str(self._config.start_url)

        # Try sitemap discovery
        robots_sitemaps = self._robots.sitemaps if self._robots else []
        sitemap_urls = await discover_sitemap_urls(
            self._config.origin, robots_sitemaps, self._config.user_agent, self._config.max_pages
        )

        if sitemap_urls:
            logger.info("crawler.seeded_from_sitemap", urls=len(sitemap_urls))
            for url in sitemap_urls:
                normalized = normalize_url(url)
                if normalized not in self._visited and is_crawlable_url(url):
                    if not self._config.same_origin_only or is_same_origin(
                        url, self._config.origin
                    ):
                        self._queue.append(_QueueItem(url, 1))

        # Always ensure start URL is first
        self._queue.appendleft(_QueueItem(start_url, 0))

    async def _crawl_page(self, url: str, depth: int) -> CrawledPage | None:
        """Fetch a single page with retries. Returns CrawledPage or None on total failure."""
        assert self._browser is not None

        for attempt in range(1, self._config.max_retries + 1):
            context = None
            page: Page | None = None
            try:
                context = await self._browser.new_context(
                    user_agent=self._config.user_agent,
                    viewport={
                        "width": self._config.screenshot_width,
                        "height": self._config.screenshot_height,
                    },
                )

                page = await context.new_page()

                # Track redirects
                redirect_chain: list[RedirectHop] = []

                def on_response(response: Response) -> None:
                    if 300 <= response.status < 400:
                        redirect_chain.append(
                            RedirectHop(url=response.url, status_code=response.status)
                        )

                page.on("response", on_response)

                # Track resource loading for performance metrics
                resource_sizes: list[int] = []
                resource_count = 0

                def on_request_finished(request: object) -> None:
                    nonlocal resource_count
                    resource_count += 1

                page.on("requestfinished", on_request_finished)

                # Navigate
                t0 = time.monotonic()
                response = await page.goto(
                    url,
                    wait_until="networkidle",
                    timeout=self._config.page_timeout_ms,
                )
                load_time_ms = (time.monotonic() - t0) * 1000

                if response is None:
                    raise RuntimeError(f"No response received for {url}")

                status_code = response.status
                final_url = page.url

                # Extract response headers
                resp_headers = {}
                all_headers = await response.all_headers()
                for key, value in all_headers.items():
                    resp_headers[key.lower()] = value

                # Get HTML source and rendered DOM
                html_source = await page.content()
                rendered_dom = await page.evaluate("() => document.documentElement.outerHTML")

                # Page weight — approximate from content-length or HTML size
                content_length = resp_headers.get("content-length")
                page_weight = int(content_length) if content_length else len(html_source.encode())

                # Parse SEO data
                soup = BeautifulSoup(html_source, "lxml")
                origin = self._config.origin

                links = extract_links(soup, final_url, origin)

                # Take screenshot
                screenshot_path: str | None = None
                if self._config.take_screenshots:
                    try:
                        screenshot_bytes = await page.screenshot(type="png", full_page=False)
                        # Return path-like identifier; actual storage handled by caller
                        screenshot_path = f"screenshots/{normalize_url(final_url).replace('/', '_').replace(':', '')}.png"
                    except Exception:
                        pass

                # Track redirect chains
                if len(redirect_chain) > 1:
                    self._summary.redirect_chains.append(redirect_chain)

                # Track broken links
                if status_code >= 400:
                    self._summary.broken_links.append(final_url)

                result = CrawledPage(
                    url=url,
                    final_url=final_url,
                    status_code=status_code,
                    redirect_chain=redirect_chain,
                    depth=depth,
                    html=html_source,
                    rendered_dom=rendered_dom,
                    title=extract_title(soup),
                    meta_description=extract_meta_description(soup),
                    meta_robots=extract_meta_robots(soup),
                    canonical_url=extract_canonical(soup),
                    headings=extract_headings(soup),
                    images=extract_images(soup),
                    links=links,
                    open_graph=extract_open_graph(soup),
                    twitter_card=extract_twitter_card(soup),
                    schema_org=extract_schema_org(soup),
                    response_headers=resp_headers,
                    performance=PagePerformance(
                        load_time_ms=round(load_time_ms, 1),
                        page_weight_bytes=page_weight,
                        resource_count=resource_count,
                    ),
                    screenshot_path=screenshot_path,
                )

                logger.info(
                    "page.crawled",
                    url=final_url,
                    status=status_code,
                    load_ms=round(load_time_ms),
                    depth=depth,
                    links=len(links),
                )
                return result

            except Exception as e:
                logger.warning(
                    "page.error",
                    url=url,
                    attempt=attempt,
                    max_retries=self._config.max_retries,
                    error=str(e),
                )
                if attempt < self._config.max_retries:
                    backoff = 2 ** (attempt - 1)
                    await asyncio.sleep(backoff)
                else:
                    self._summary.pages_failed += 1
                    self._summary.errors.append({"url": url, "error": str(e)})
                    return CrawledPage(
                        url=url,
                        final_url=url,
                        status_code=0,
                        depth=depth,
                        error=str(e),
                    )
            finally:
                if context:
                    await context.close()

        return None
