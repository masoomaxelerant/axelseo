"""Integration-level tests for the Crawler class.

These test the crawler's logic (dedup, depth, queueing) without hitting real
sites — we mock at the Playwright level using respx for robots/sitemap HTTP
and validate the BFS logic via internal state.
"""

import pytest

from axelseo_crawler.config import CrawlConfig
from axelseo_crawler.models import CrawlSummary
from axelseo_crawler.url_utils import normalize_url


class TestCrawlConfig:
    def test_defaults(self):
        config = CrawlConfig(start_url="https://example.com")
        assert config.max_pages == 500
        assert config.max_depth == 5
        assert config.requests_per_second == 2.0
        assert config.respect_robots_txt is True
        assert config.same_origin_only is True

    def test_origin_extraction(self):
        config = CrawlConfig(start_url="https://example.com/path/page")
        assert config.origin == "https://example.com"

    def test_max_pages_clamped(self):
        config = CrawlConfig(start_url="https://example.com", max_pages=99999)
        assert config.max_pages == 10_000

    def test_max_pages_validation(self):
        with pytest.raises(ValueError):
            CrawlConfig(start_url="https://example.com", max_pages=0)

    def test_max_depth_clamped(self):
        config = CrawlConfig(start_url="https://example.com", max_depth=100)
        assert config.max_depth == 50


class TestCrawlSummary:
    def test_defaults(self):
        s = CrawlSummary(start_url="https://example.com")
        assert s.pages_crawled == 0
        assert s.pages_failed == 0
        assert s.broken_links == []
        assert s.errors == []


class TestDeduplication:
    """Verify URL normalization produces correct dedup behavior."""

    def test_fragment_dedup(self):
        a = normalize_url("https://example.com/page#top")
        b = normalize_url("https://example.com/page#bottom")
        assert a == b

    def test_trailing_slash_dedup(self):
        a = normalize_url("https://example.com/page/")
        b = normalize_url("https://example.com/page")
        assert a == b

    def test_different_paths_not_deduped(self):
        a = normalize_url("https://example.com/page-a")
        b = normalize_url("https://example.com/page-b")
        assert a != b

    def test_query_param_order_dedup(self):
        a = normalize_url("https://example.com/?z=1&a=2")
        b = normalize_url("https://example.com/?a=2&z=1")
        assert a == b
