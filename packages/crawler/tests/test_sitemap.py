import pytest
import respx

from axelseo_crawler.sitemap import discover_sitemap_urls


SITEMAP_XML = """\
<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url><loc>https://example.com/</loc></url>
  <url><loc>https://example.com/about</loc></url>
  <url><loc>https://example.com/contact</loc></url>
</urlset>
"""

SITEMAP_INDEX_XML = """\
<?xml version="1.0" encoding="UTF-8"?>
<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <sitemap><loc>https://example.com/sitemap-pages.xml</loc></sitemap>
  <sitemap><loc>https://example.com/sitemap-posts.xml</loc></sitemap>
</sitemapindex>
"""

SITEMAP_PAGES = """\
<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url><loc>https://example.com/page-1</loc></url>
  <url><loc>https://example.com/page-2</loc></url>
</urlset>
"""

SITEMAP_POSTS = """\
<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url><loc>https://example.com/blog/post-1</loc></url>
</urlset>
"""


@pytest.mark.asyncio
async def test_simple_sitemap():
    with respx.mock:
        respx.get("https://example.com/sitemap.xml").respond(200, text=SITEMAP_XML)

        urls = await discover_sitemap_urls(
            "https://example.com", [], "AxelSEO/1.0"
        )

    assert len(urls) == 3
    assert "https://example.com/" in urls
    assert "https://example.com/about" in urls


@pytest.mark.asyncio
async def test_sitemap_index():
    with respx.mock:
        respx.get("https://example.com/sitemap.xml").respond(200, text=SITEMAP_INDEX_XML)
        respx.get("https://example.com/sitemap-pages.xml").respond(200, text=SITEMAP_PAGES)
        respx.get("https://example.com/sitemap-posts.xml").respond(200, text=SITEMAP_POSTS)

        urls = await discover_sitemap_urls(
            "https://example.com", [], "AxelSEO/1.0"
        )

    assert len(urls) == 3
    assert "https://example.com/page-1" in urls
    assert "https://example.com/blog/post-1" in urls


@pytest.mark.asyncio
async def test_robots_sitemaps_preferred():
    with respx.mock:
        respx.get("https://example.com/custom-sitemap.xml").respond(200, text=SITEMAP_XML)

        urls = await discover_sitemap_urls(
            "https://example.com",
            ["https://example.com/custom-sitemap.xml"],
            "AxelSEO/1.0",
        )

    assert len(urls) == 3


@pytest.mark.asyncio
async def test_missing_sitemap():
    with respx.mock:
        respx.get("https://example.com/sitemap.xml").respond(404)

        urls = await discover_sitemap_urls(
            "https://example.com", [], "AxelSEO/1.0"
        )

    assert urls == []


@pytest.mark.asyncio
async def test_max_urls_limit():
    with respx.mock:
        respx.get("https://example.com/sitemap.xml").respond(200, text=SITEMAP_XML)

        urls = await discover_sitemap_urls(
            "https://example.com", [], "AxelSEO/1.0", max_urls=2
        )

    assert len(urls) == 2
