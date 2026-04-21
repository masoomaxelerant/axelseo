"""Core async web crawler using Playwright — optimized for speed.

Key optimizations:
  - Concurrent page fetching (default 3 pages at once)
  - Blocks images/fonts/css/media during crawl (only need HTML)
  - Uses domcontentloaded instead of networkidle (5-15s faster per page)
  - Reuses a single browser context instead of one per page
  - Reduced default timeout (15s) and retries (2)
"""

from __future__ import annotations

import asyncio
import time
from collections import deque
from datetime import UTC, datetime
from typing import AsyncIterator

import structlog
from bs4 import BeautifulSoup
from playwright.async_api import Browser, BrowserContext, Page, Response
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
)

logger = structlog.get_logger(__name__)

# Resource types to block — we only need the HTML document
BLOCKED_RESOURCE_TYPES = {"image", "media", "font", "stylesheet"}


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
        self._playwright = None
        self._browser: Browser | None = None
        self._context: BrowserContext | None = None
        self._robots: RobotsChecker | None = None
        self._rate_limiter: RateLimiter | None = None
        self._progress: ProgressReporter | None = None

    @property
    def summary(self) -> CrawlSummary:
        return self._summary

    async def __aenter__(self) -> Crawler:
        self._playwright = await async_playwright().start()
        self._browser = await self._playwright.chromium.launch(headless=True)

        # Single shared browser context — much faster than one per page
        self._context = await self._browser.new_context(
            user_agent=self._config.user_agent,
            viewport={"width": self._config.screenshot_width, "height": self._config.screenshot_height},
        )

        # Block heavy resources at the context level to speed up page loads
        if self._config.block_resources:
            await self._context.route(
                "**/*",
                lambda route: (
                    route.abort()
                    if route.request.resource_type in BLOCKED_RESOURCE_TYPES
                    else route.continue_()
                ),
            )

        logger.info("crawler.browser_launched", concurrency=self._config.concurrency)

        # Load robots.txt
        if self._config.respect_robots_txt:
            self._robots = RobotsChecker(self._config.origin, self._config.user_agent)
            await self._robots.load()

        crawl_delay = self._robots.crawl_delay if self._robots else None
        self._rate_limiter = RateLimiter(self._config.requests_per_second, crawl_delay)
        logger.info("crawler.rate_limiter", effective_rps=self._rate_limiter.effective_rps)

        self._progress = ProgressReporter(self._config.redis_url, self._config.audit_id)
        await self._progress.connect()

        return self

    async def __aexit__(self, *exc: object) -> None:
        if self._context:
            await self._context.close()
        if self._browser:
            await self._browser.close()
        if self._playwright:
            await self._playwright.stop()
        if self._progress:
            await self._progress.close()
        logger.info("crawler.shutdown")

    async def crawl(self) -> AsyncIterator[CrawledPage]:
        """BFS crawl with concurrent page fetching."""
        self._summary.started_at = datetime.now(UTC)
        start = time.monotonic()

        await self._seed_queue()

        # Semaphore controls concurrency
        sem = asyncio.Semaphore(self._config.concurrency)
        result_queue: asyncio.Queue[CrawledPage | None] = asyncio.Queue()
        active_tasks: set[asyncio.Task] = set()

        while (self._queue or active_tasks) and self._summary.pages_crawled < self._config.max_pages:
            # Launch tasks up to concurrency limit
            while (
                self._queue
                and len(active_tasks) < self._config.concurrency
                and self._summary.pages_crawled + len(active_tasks) < self._config.max_pages
            ):
                item = self._queue.popleft()
                normalized = normalize_url(item.url)

                if normalized in self._visited:
                    continue
                self._visited.add(normalized)

                if item.depth > self._config.max_depth:
                    self._summary.pages_skipped += 1
                    continue

                if self._robots and not self._robots.can_fetch(item.url):
                    self._summary.pages_skipped += 1
                    continue

                if self._rate_limiter:
                    await self._rate_limiter.acquire()

                task = asyncio.create_task(
                    self._fetch_and_enqueue(item.url, item.depth, result_queue, sem)
                )
                active_tasks.add(task)
                task.add_done_callback(active_tasks.discard)

            # Yield results as they come in
            if active_tasks:
                try:
                    page_result = await asyncio.wait_for(result_queue.get(), timeout=0.5)
                except asyncio.TimeoutError:
                    continue

                if page_result is not None:
                    self._summary.pages_crawled += 1
                    if self._progress:
                        await self._progress.report(
                            pages_crawled=self._summary.pages_crawled,
                            pages_queued=len(self._queue),
                            current_url=page_result.final_url,
                        )
                    yield page_result
            else:
                break

        # Drain remaining results
        if active_tasks:
            await asyncio.gather(*active_tasks, return_exceptions=True)
        while not result_queue.empty():
            page_result = result_queue.get_nowait()
            if page_result is not None and self._summary.pages_crawled < self._config.max_pages:
                self._summary.pages_crawled += 1
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

    async def _fetch_and_enqueue(
        self, url: str, depth: int, result_queue: asyncio.Queue, sem: asyncio.Semaphore
    ) -> None:
        """Crawl a page under the semaphore, enqueue discovered links."""
        async with sem:
            page_result = await self._crawl_page(url, depth)

        if page_result is not None:
            for link in page_result.links:
                if not link.is_internal:
                    self._summary.external_links += 1
                    continue
                self._summary.internal_links += 1
                link_normalized = normalize_url(link.href)
                if (
                    link_normalized not in self._visited
                    and is_crawlable_url(link.href)
                    and depth + 1 <= self._config.max_depth
                ):
                    self._queue.append(_QueueItem(link.href, depth + 1))
            self._summary.total_links_found += len(page_result.links)

        await result_queue.put(page_result)

    async def _seed_queue(self) -> None:
        """Populate the initial queue from sitemap or start URL."""
        start_url = str(self._config.start_url)

        robots_sitemaps = self._robots.sitemaps if self._robots else []
        sitemap_urls = await discover_sitemap_urls(
            self._config.origin, robots_sitemaps, self._config.user_agent, self._config.max_pages
        )

        if sitemap_urls:
            logger.info("crawler.seeded_from_sitemap", urls=len(sitemap_urls))
            for url in sitemap_urls:
                normalized = normalize_url(url)
                if normalized not in self._visited and is_crawlable_url(url):
                    if not self._config.same_origin_only or is_same_origin(url, self._config.origin):
                        self._queue.append(_QueueItem(url, 1))

        self._queue.appendleft(_QueueItem(start_url, 0))

    async def _crawl_page(self, url: str, depth: int) -> CrawledPage | None:
        """Fetch a page. Uses httpx fast mode when enabled, falls back to Playwright."""
        if self._config.use_httpx_fast_mode and depth > 0:
            return await self._crawl_page_httpx(url, depth)
        return await self._crawl_page_playwright(url, depth)

    async def _crawl_page_httpx(self, url: str, depth: int) -> CrawledPage | None:
        """Fast HTTP-only fetch using httpx — ~10x faster than Playwright.

        Used for discovering links and extracting SEO metadata.
        Doesn't execute JavaScript, but most SEO data is in the initial HTML.
        """
        import httpx

        for attempt in range(1, self._config.max_retries + 1):
            try:
                t0 = time.monotonic()
                async with httpx.AsyncClient(
                    follow_redirects=True,
                    timeout=self._config.page_timeout_ms / 1000,
                    headers={"User-Agent": self._config.user_agent},
                ) as client:
                    resp = await client.get(url)

                load_time_ms = (time.monotonic() - t0) * 1000
                status_code = resp.status_code
                final_url = str(resp.url)
                html_source = resp.text
                resp_headers = {k.lower(): v for k, v in resp.headers.items()}

                # Track redirects
                redirect_chain: list[RedirectHop] = []
                for r in resp.history:
                    redirect_chain.append(RedirectHop(url=str(r.url), status_code=r.status_code))

                page_weight = len(html_source.encode())
                soup = BeautifulSoup(html_source, "lxml")
                origin = self._config.origin
                links = extract_links(soup, final_url, origin)

                if len(redirect_chain) > 1:
                    self._summary.redirect_chains.append(redirect_chain)
                if status_code >= 400:
                    self._summary.broken_links.append(final_url)

                result = CrawledPage(
                    url=url, final_url=final_url, status_code=status_code,
                    redirect_chain=redirect_chain, depth=depth,
                    html=html_source, rendered_dom="",
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
                        resource_count=0,
                    ),
                    screenshot_path=None,
                )

                logger.info("page.crawled", url=final_url, status=status_code, load_ms=round(load_time_ms), depth=depth, mode="httpx")
                return result

            except Exception as e:
                logger.warning("page.error", url=url, attempt=attempt, error=str(e), mode="httpx")
                if attempt < self._config.max_retries:
                    await asyncio.sleep(0.5)
                else:
                    self._summary.pages_failed += 1
                    self._summary.errors.append({"url": url, "error": str(e)})
                    return CrawledPage(url=url, final_url=url, status_code=0, depth=depth, error=str(e))

        return None

    async def _crawl_page_playwright(self, url: str, depth: int) -> CrawledPage | None:
        """Full browser fetch using Playwright — handles JS-rendered pages."""
        assert self._context is not None

        for attempt in range(1, self._config.max_retries + 1):
            page: Page | None = None
            try:
                page = await self._context.new_page()

                redirect_chain: list[RedirectHop] = []
                resource_count = 0

                def on_response(response: Response) -> None:
                    if 300 <= response.status < 400:
                        redirect_chain.append(RedirectHop(url=response.url, status_code=response.status))

                def on_request_finished(_: object) -> None:
                    nonlocal resource_count
                    resource_count += 1

                page.on("response", on_response)
                page.on("requestfinished", on_request_finished)

                t0 = time.monotonic()
                response = await page.goto(
                    url,
                    wait_until="domcontentloaded",
                    timeout=self._config.page_timeout_ms,
                )
                load_time_ms = (time.monotonic() - t0) * 1000

                if response is None:
                    raise RuntimeError(f"No response for {url}")

                status_code = response.status
                final_url = page.url

                resp_headers = {}
                try:
                    all_headers = await response.all_headers()
                    resp_headers = {k.lower(): v for k, v in all_headers.items()}
                except Exception:
                    pass

                html_source = await page.content()
                content_length = resp_headers.get("content-length")
                page_weight = int(content_length) if content_length else len(html_source.encode())

                soup = BeautifulSoup(html_source, "lxml")
                origin = self._config.origin
                links = extract_links(soup, final_url, origin)

                screenshot_path: str | None = None
                if self._config.take_screenshots:
                    try:
                        await page.screenshot(type="png", full_page=False)
                        screenshot_path = f"screenshots/{normalize_url(final_url).replace('/', '_').replace(':', '')}.png"
                    except Exception:
                        pass

                if len(redirect_chain) > 1:
                    self._summary.redirect_chains.append(redirect_chain)
                if status_code >= 400:
                    self._summary.broken_links.append(final_url)

                result = CrawledPage(
                    url=url, final_url=final_url, status_code=status_code,
                    redirect_chain=redirect_chain, depth=depth,
                    html=html_source, rendered_dom="",
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

                logger.info("page.crawled", url=final_url, status=status_code, load_ms=round(load_time_ms), depth=depth, mode="playwright")
                return result

            except Exception as e:
                logger.warning("page.error", url=url, attempt=attempt, error=str(e))
                if attempt < self._config.max_retries:
                    await asyncio.sleep(1)
                else:
                    self._summary.pages_failed += 1
                    self._summary.errors.append({"url": url, "error": str(e)})
                    return CrawledPage(url=url, final_url=url, status_code=0, depth=depth, error=str(e))
            finally:
                if page:
                    await page.close()

        return None
