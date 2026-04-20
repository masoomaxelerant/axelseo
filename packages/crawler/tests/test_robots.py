import pytest
import httpx
import respx

from axelseo_crawler.robots import RobotsChecker


ROBOTS_TXT = """\
User-agent: *
Disallow: /admin/
Disallow: /private/
Crawl-delay: 5

User-agent: AxelSEO
Disallow: /secret/
Crawl-delay: 2

Sitemap: https://example.com/sitemap.xml
Sitemap: https://example.com/sitemap-posts.xml
"""


@pytest.fixture
def robots_url():
    return "https://example.com/robots.txt"


@pytest.mark.asyncio
async def test_can_fetch_allowed(robots_url):
    with respx.mock:
        respx.get(robots_url).respond(200, text=ROBOTS_TXT)
        checker = RobotsChecker("https://example.com", "AxelSEO/1.0")
        await checker.load()

    assert checker.can_fetch("https://example.com/about") is True
    assert checker.can_fetch("https://example.com/blog/post") is True


@pytest.mark.asyncio
async def test_can_fetch_blocked(robots_url):
    with respx.mock:
        respx.get(robots_url).respond(200, text=ROBOTS_TXT)
        checker = RobotsChecker("https://example.com", "AxelSEO/1.0")
        await checker.load()

    assert checker.can_fetch("https://example.com/secret/data") is False


@pytest.mark.asyncio
async def test_wildcard_disallow(robots_url):
    with respx.mock:
        respx.get(robots_url).respond(200, text=ROBOTS_TXT)
        checker = RobotsChecker("https://example.com", "SomeOtherBot/1.0")
        await checker.load()

    assert checker.can_fetch("https://example.com/admin/panel") is False
    assert checker.can_fetch("https://example.com/about") is True


@pytest.mark.asyncio
async def test_crawl_delay(robots_url):
    with respx.mock:
        respx.get(robots_url).respond(200, text=ROBOTS_TXT)
        checker = RobotsChecker("https://example.com", "AxelSEO/1.0")
        await checker.load()

    assert checker.crawl_delay == 2.0


@pytest.mark.asyncio
async def test_sitemaps(robots_url):
    with respx.mock:
        respx.get(robots_url).respond(200, text=ROBOTS_TXT)
        checker = RobotsChecker("https://example.com", "AxelSEO/1.0")
        await checker.load()

    assert checker.sitemaps == [
        "https://example.com/sitemap.xml",
        "https://example.com/sitemap-posts.xml",
    ]


@pytest.mark.asyncio
async def test_missing_robots_allows_all(robots_url):
    with respx.mock:
        respx.get(robots_url).respond(404)
        checker = RobotsChecker("https://example.com", "AxelSEO/1.0")
        await checker.load()

    assert checker.can_fetch("https://example.com/anything") is True
    assert checker.crawl_delay is None
    assert checker.sitemaps == []


@pytest.mark.asyncio
async def test_network_error_allows_all(robots_url):
    with respx.mock:
        respx.get(robots_url).mock(side_effect=httpx.ConnectError("connection refused"))
        checker = RobotsChecker("https://example.com", "AxelSEO/1.0")
        await checker.load()

    assert checker.can_fetch("https://example.com/anything") is True
