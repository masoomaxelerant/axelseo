from __future__ import annotations

from pydantic import BaseModel, HttpUrl, field_validator


class CrawlConfig(BaseModel):
    """Configuration for a crawl job."""

    start_url: HttpUrl
    max_pages: int = 500
    max_depth: int = 5
    requests_per_second: float = 5.0
    concurrency: int = 3
    respect_robots_txt: bool = True
    same_origin_only: bool = True
    page_timeout_ms: int = 15_000
    max_retries: int = 2
    block_resources: bool = True
    use_httpx_fast_mode: bool = True
    take_screenshots: bool = False
    screenshot_width: int = 1280
    screenshot_height: int = 800
    user_agent: str = "AxelSEO/1.0 (+https://axelerant.com/seo-bot)"
    redis_url: str | None = None
    audit_id: str | None = None

    @field_validator("max_pages")
    @classmethod
    def clamp_max_pages(cls, v: int) -> int:
        if v < 1:
            raise ValueError("max_pages must be >= 1")
        return min(v, 10_000)

    @field_validator("max_depth")
    @classmethod
    def clamp_max_depth(cls, v: int) -> int:
        if v < 1:
            raise ValueError("max_depth must be >= 1")
        return min(v, 50)

    @field_validator("requests_per_second")
    @classmethod
    def clamp_rps(cls, v: float) -> float:
        if v <= 0:
            raise ValueError("requests_per_second must be > 0")
        return min(v, 20.0)

    @property
    def origin(self) -> str:
        """Return scheme + host of start_url."""
        from urllib.parse import urlparse

        parsed = urlparse(str(self.start_url))
        return f"{parsed.scheme}://{parsed.netloc}"
