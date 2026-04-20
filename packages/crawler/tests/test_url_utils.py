from axelseo_crawler.url_utils import (
    is_crawlable_url,
    is_same_origin,
    normalize_url,
    resolve_url,
)


class TestNormalizeUrl:
    def test_strips_fragment(self):
        assert normalize_url("https://example.com/page#section") == "https://example.com/page"

    def test_strips_trailing_slash(self):
        assert normalize_url("https://example.com/page/") == "https://example.com/page"

    def test_preserves_root_slash(self):
        assert normalize_url("https://example.com/") == "https://example.com/"

    def test_lowercases_scheme_and_host(self):
        assert normalize_url("HTTPS://EXAMPLE.COM/Page") == "https://example.com/Page"

    def test_removes_default_port_443(self):
        assert normalize_url("https://example.com:443/page") == "https://example.com/page"

    def test_removes_default_port_80(self):
        assert normalize_url("http://example.com:80/page") == "http://example.com/page"

    def test_sorts_query_params(self):
        assert (
            normalize_url("https://example.com/?b=2&a=1")
            == "https://example.com/?a=1&b=2"
        )

    def test_deduplication_works(self):
        a = normalize_url("https://example.com/page/")
        b = normalize_url("https://example.com/page")
        c = normalize_url("https://example.com/page#top")
        assert a == b == c


class TestResolveUrl:
    def test_resolves_relative(self):
        assert resolve_url("https://example.com/a/b", "../c") == "https://example.com/c"

    def test_resolves_absolute(self):
        assert resolve_url("https://example.com/a", "/b") == "https://example.com/b"

    def test_ignores_javascript(self):
        assert resolve_url("https://example.com", "javascript:void(0)") == ""

    def test_ignores_mailto(self):
        assert resolve_url("https://example.com", "mailto:a@b.com") == ""

    def test_ignores_empty(self):
        assert resolve_url("https://example.com", "") == ""

    def test_ignores_fragment_only(self):
        assert resolve_url("https://example.com", "#top") == ""


class TestIsSameOrigin:
    def test_same_origin(self):
        assert is_same_origin("https://example.com/page", "https://example.com") is True

    def test_different_host(self):
        assert is_same_origin("https://other.com/page", "https://example.com") is False

    def test_different_scheme(self):
        assert is_same_origin("http://example.com/page", "https://example.com") is False

    def test_case_insensitive(self):
        assert is_same_origin("https://EXAMPLE.COM/page", "https://example.com") is True


class TestIsCrawlableUrl:
    def test_html_page(self):
        assert is_crawlable_url("https://example.com/page") is True

    def test_pdf(self):
        assert is_crawlable_url("https://example.com/doc.pdf") is False

    def test_image(self):
        assert is_crawlable_url("https://example.com/img.jpg") is False

    def test_css(self):
        assert is_crawlable_url("https://example.com/style.css") is False

    def test_ftp_scheme(self):
        assert is_crawlable_url("ftp://example.com/file") is False
