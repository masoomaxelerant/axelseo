"""Shared test fixtures — pre-built CrawledPage objects for various scenarios."""

import pytest
import structlog

from axelseo_crawler.models import (
    CrawledPage,
    HeadingTag,
    ImageInfo,
    LinkInfo,
    OpenGraphMeta,
    PagePerformance,
    RedirectHop,
    TwitterCardMeta,
)


def pytest_configure(config):
    structlog.configure(
        processors=[structlog.dev.ConsoleRenderer()],
        wrapper_class=structlog.stdlib.BoundLogger,
        context_class=dict,
        logger_factory=structlog.PrintLoggerFactory(),
        cache_logger_on_first_use=False,
    )


def _make_page(**overrides) -> CrawledPage:
    """Factory for CrawledPage with sensible defaults."""
    defaults = dict(
        url="https://example.com/page",
        final_url="https://example.com/page",
        status_code=200,
        depth=1,
        html="word " * 400,  # 400 words — above thin content threshold
        rendered_dom="<html></html>",
        title="Example Page — Good SEO Title Here",
        meta_description="A well-written meta description that is between 120 and 160 characters long, providing useful information about the page content.",
        canonical_url="https://example.com/page",
        headings=[HeadingTag(level=1, text="Main Heading")],
        images=[ImageInfo(src="/img.jpg", alt="Photo", width="800", height="600")],
        links=[
            LinkInfo(href="https://example.com/about", anchor_text="About Us", is_internal=True),
        ],
        open_graph=OpenGraphMeta(title="OG Title", description="OG Desc"),
        twitter_card=TwitterCardMeta(card="summary", title="TC Title"),
        schema_org=[{"@type": "WebPage", "name": "Example"}],
        performance=PagePerformance(load_time_ms=1200, page_weight_bytes=50000, resource_count=20),
    )
    defaults.update(overrides)
    return CrawledPage(**defaults)


@pytest.fixture
def good_page() -> CrawledPage:
    """A page with no SEO issues."""
    return _make_page()


@pytest.fixture
def page_missing_title() -> CrawledPage:
    return _make_page(
        url="https://example.com/no-title",
        final_url="https://example.com/no-title",
        title=None,
    )


@pytest.fixture
def page_missing_meta() -> CrawledPage:
    return _make_page(
        url="https://example.com/no-meta",
        final_url="https://example.com/no-meta",
        meta_description=None,
    )


@pytest.fixture
def page_missing_h1() -> CrawledPage:
    return _make_page(
        url="https://example.com/no-h1",
        final_url="https://example.com/no-h1",
        headings=[HeadingTag(level=2, text="Sub heading")],
    )


@pytest.fixture
def page_multiple_h1() -> CrawledPage:
    return _make_page(
        url="https://example.com/multi-h1",
        final_url="https://example.com/multi-h1",
        headings=[
            HeadingTag(level=1, text="First H1"),
            HeadingTag(level=1, text="Second H1"),
        ],
    )


@pytest.fixture
def page_broken() -> CrawledPage:
    return _make_page(
        url="https://example.com/broken",
        final_url="https://example.com/broken",
        status_code=404,
    )


@pytest.fixture
def page_redirect_chain() -> CrawledPage:
    return _make_page(
        url="https://example.com/old",
        final_url="https://example.com/new",
        redirect_chain=[
            RedirectHop(url="https://example.com/old", status_code=301),
            RedirectHop(url="https://example.com/middle", status_code=301),
            RedirectHop(url="https://example.com/new", status_code=301),
        ],
    )


@pytest.fixture
def page_http() -> CrawledPage:
    return _make_page(
        url="http://example.com/insecure",
        final_url="http://example.com/insecure",
    )


@pytest.fixture
def page_no_canonical() -> CrawledPage:
    return _make_page(
        url="https://example.com/no-canonical",
        final_url="https://example.com/no-canonical",
        canonical_url=None,
    )


@pytest.fixture
def page_long_title() -> CrawledPage:
    return _make_page(
        url="https://example.com/long-title",
        final_url="https://example.com/long-title",
        title="This Is An Extremely Long Title That Goes Well Beyond The Recommended Sixty Character Limit",
    )


@pytest.fixture
def page_images_no_alt() -> CrawledPage:
    return _make_page(
        url="https://example.com/no-alt",
        final_url="https://example.com/no-alt",
        images=[
            ImageInfo(src="/a.jpg", alt=None, width="100", height="100"),
            ImageInfo(src="/b.jpg", alt=None, width="100", height="100"),
            ImageInfo(src="/c.jpg", alt="Has alt", width="100", height="100"),
        ],
    )


@pytest.fixture
def page_images_no_dims() -> CrawledPage:
    return _make_page(
        url="https://example.com/no-dims",
        final_url="https://example.com/no-dims",
        images=[
            ImageInfo(src="/a.jpg", alt="Photo"),
            ImageInfo(src="/b.jpg", alt="Icon", width="50"),
        ],
    )


@pytest.fixture
def page_thin_content() -> CrawledPage:
    return _make_page(
        url="https://example.com/thin",
        final_url="https://example.com/thin",
        html="short page " * 20,  # ~20 words
    )


@pytest.fixture
def page_heading_skip() -> CrawledPage:
    return _make_page(
        url="https://example.com/heading-skip",
        final_url="https://example.com/heading-skip",
        headings=[
            HeadingTag(level=1, text="Title"),
            HeadingTag(level=3, text="Skipped to H3"),
        ],
    )


@pytest.fixture
def page_h1_matches_title() -> CrawledPage:
    return _make_page(
        url="https://example.com/h1-title",
        final_url="https://example.com/h1-title",
        title="Exact Same Text",
        headings=[HeadingTag(level=1, text="Exact Same Text")],
    )


@pytest.fixture
def page_generic_anchors() -> CrawledPage:
    return _make_page(
        url="https://example.com/generic",
        final_url="https://example.com/generic",
        links=[
            LinkInfo(href="https://example.com/a", anchor_text="click here", is_internal=True),
            LinkInfo(href="https://example.com/b", anchor_text="read more", is_internal=True),
            LinkInfo(href="https://example.com/c", anchor_text="Our Services", is_internal=True),
        ],
    )


@pytest.fixture
def page_no_og() -> CrawledPage:
    return _make_page(
        url="https://example.com/no-og",
        final_url="https://example.com/no-og",
        open_graph=None,
    )


@pytest.fixture
def page_no_schema() -> CrawledPage:
    return _make_page(
        url="https://example.com/no-schema",
        final_url="https://example.com/no-schema",
        schema_org=[],
    )


@pytest.fixture
def page_no_twitter() -> CrawledPage:
    return _make_page(
        url="https://example.com/no-tc",
        final_url="https://example.com/no-tc",
        twitter_card=None,
    )


@pytest.fixture
def page_excessive_links() -> CrawledPage:
    links = [
        LinkInfo(href=f"https://example.com/link-{i}", anchor_text=f"Link {i}", is_internal=True)
        for i in range(150)
    ]
    return _make_page(
        url="https://example.com/many-links",
        final_url="https://example.com/many-links",
        links=links,
    )
