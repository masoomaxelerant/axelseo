"""URL normalization and deduplication utilities."""

from __future__ import annotations

from urllib.parse import urljoin, urlparse, urlunparse


def normalize_url(url: str) -> str:
    """Normalize a URL for deduplication.

    - Lowercases scheme and host
    - Removes fragments
    - Removes trailing slash from path (except root)
    - Sorts query parameters
    """
    parsed = urlparse(url)

    scheme = parsed.scheme.lower()
    netloc = parsed.netloc.lower()

    # Remove default ports
    if netloc.endswith(":80") and scheme == "http":
        netloc = netloc[:-3]
    elif netloc.endswith(":443") and scheme == "https":
        netloc = netloc[:-4]

    # Normalize path — strip trailing slash unless root
    path = parsed.path
    if path != "/" and path.endswith("/"):
        path = path.rstrip("/")
    if not path:
        path = "/"

    # Sort query params for consistent dedup
    query = parsed.query
    if query:
        params = sorted(query.split("&"))
        query = "&".join(params)

    return urlunparse((scheme, netloc, path, parsed.params, query, ""))


def resolve_url(base_url: str, href: str) -> str:
    """Resolve a relative href against a base URL."""
    # Strip whitespace and common artifacts
    href = href.strip()
    if not href or href.startswith(("javascript:", "mailto:", "tel:", "data:", "#")):
        return ""
    return urljoin(base_url, href)


def is_same_origin(url: str, origin: str) -> bool:
    """Check if a URL belongs to the same origin."""
    parsed_url = urlparse(url)
    parsed_origin = urlparse(origin)
    return (
        parsed_url.scheme == parsed_origin.scheme
        and parsed_url.netloc.lower() == parsed_origin.netloc.lower()
    )


def is_crawlable_url(url: str) -> bool:
    """Return True if the URL looks like a crawlable web page."""
    parsed = urlparse(url)
    if parsed.scheme not in ("http", "https"):
        return False

    # Skip common non-page extensions
    skip_extensions = {
        ".pdf", ".zip", ".gz", ".tar", ".rar", ".7z",
        ".jpg", ".jpeg", ".png", ".gif", ".svg", ".webp", ".ico", ".bmp",
        ".mp3", ".mp4", ".avi", ".mov", ".wmv", ".flv", ".webm",
        ".css", ".js", ".woff", ".woff2", ".ttf", ".eot",
        ".xml", ".json", ".csv", ".xls", ".xlsx", ".doc", ".docx",
    }
    path_lower = parsed.path.lower()
    return not any(path_lower.endswith(ext) for ext in skip_extensions)
