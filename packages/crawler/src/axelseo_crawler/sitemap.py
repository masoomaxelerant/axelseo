"""Sitemap.xml discovery and parsing."""

from __future__ import annotations

from xml.etree import ElementTree

import httpx
import structlog

logger = structlog.get_logger(__name__)

# XML namespace used in sitemaps
NS = {"sm": "http://www.sitemaps.org/schemas/sitemap/0.9"}
MAX_SITEMAP_DEPTH = 3


async def discover_sitemap_urls(
    origin: str,
    robots_sitemaps: list[str],
    user_agent: str,
    max_urls: int = 10_000,
) -> list[str]:
    """Discover URLs from sitemap.xml files.

    Tries sitemaps declared in robots.txt first, then falls back to
    {origin}/sitemap.xml. Handles sitemap indexes recursively.
    """
    sitemap_candidates = list(robots_sitemaps)
    if not sitemap_candidates:
        sitemap_candidates = [f"{origin}/sitemap.xml"]

    urls: list[str] = []
    seen_sitemaps: set[str] = set()

    async with httpx.AsyncClient(
        follow_redirects=True,
        timeout=15.0,
        headers={"User-Agent": user_agent},
    ) as client:
        for sitemap_url in sitemap_candidates:
            await _process_sitemap(
                client, sitemap_url, urls, seen_sitemaps, max_urls, depth=0
            )
            if len(urls) >= max_urls:
                break

    logger.info("sitemap.discovered", origin=origin, urls_found=len(urls))
    return urls[:max_urls]


async def _process_sitemap(
    client: httpx.AsyncClient,
    url: str,
    urls: list[str],
    seen: set[str],
    max_urls: int,
    depth: int,
) -> None:
    """Recursively process a sitemap or sitemap index."""
    if url in seen or depth > MAX_SITEMAP_DEPTH or len(urls) >= max_urls:
        return
    seen.add(url)

    try:
        resp = await client.get(url)
        if resp.status_code != 200:
            logger.debug("sitemap.fetch_failed", url=url, status=resp.status_code)
            return
    except Exception as e:
        logger.debug("sitemap.fetch_error", url=url, error=str(e))
        return

    content = resp.text
    try:
        root = ElementTree.fromstring(content)
    except ElementTree.ParseError:
        logger.debug("sitemap.parse_error", url=url)
        return

    tag = root.tag.lower()

    # Sitemap index — contains <sitemap><loc>...</loc></sitemap>
    if "sitemapindex" in tag:
        for sitemap_elem in root.findall("sm:sitemap/sm:loc", NS):
            if sitemap_elem.text and len(urls) < max_urls:
                await _process_sitemap(
                    client, sitemap_elem.text.strip(), urls, seen, max_urls, depth + 1
                )
    # Regular sitemap — contains <url><loc>...</loc></url>
    elif "urlset" in tag:
        for url_elem in root.findall("sm:url/sm:loc", NS):
            if url_elem.text and len(urls) < max_urls:
                urls.append(url_elem.text.strip())
