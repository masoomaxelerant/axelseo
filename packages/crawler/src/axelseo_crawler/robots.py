"""robots.txt parser with crawl-delay support."""

from __future__ import annotations

from urllib.parse import urlparse
from urllib.robotparser import RobotFileParser

import httpx
import structlog

logger = structlog.get_logger(__name__)


class RobotsChecker:
    """Fetches and interprets robots.txt for a given origin."""

    def __init__(self, origin: str, user_agent: str) -> None:
        self._origin = origin
        self._user_agent = user_agent
        self._parser: RobotFileParser | None = None
        self._crawl_delay: float | None = None
        self._sitemaps: list[str] = []
        self._loaded = False

    async def load(self) -> None:
        """Fetch and parse robots.txt. Silently allows all on failure."""
        robots_url = f"{self._origin}/robots.txt"
        try:
            async with httpx.AsyncClient(
                follow_redirects=True, timeout=10.0
            ) as client:
                resp = await client.get(
                    robots_url, headers={"User-Agent": self._user_agent}
                )

            if resp.status_code == 200:
                self._parser = RobotFileParser()
                self._parser.set_url(robots_url)
                self._parser.parse(resp.text.splitlines())

                # Extract crawl-delay
                self._crawl_delay = self._parse_crawl_delay(resp.text)

                # Extract Sitemap directives
                for line in resp.text.splitlines():
                    stripped = line.strip()
                    if stripped.lower().startswith("sitemap:"):
                        sitemap_url = stripped.split(":", 1)[1].strip()
                        if sitemap_url:
                            self._sitemaps.append(sitemap_url)

                logger.info(
                    "robots.loaded",
                    origin=self._origin,
                    crawl_delay=self._crawl_delay,
                    sitemaps=len(self._sitemaps),
                )
            else:
                logger.info(
                    "robots.not_found",
                    origin=self._origin,
                    status=resp.status_code,
                )
        except Exception as e:
            logger.warning("robots.fetch_failed", origin=self._origin, error=str(e))

        self._loaded = True

    def can_fetch(self, url: str) -> bool:
        """Check if the URL is allowed by robots.txt."""
        if self._parser is None:
            return True
        return self._parser.can_fetch(self._user_agent, url)

    @property
    def crawl_delay(self) -> float | None:
        """Return crawl-delay in seconds, if specified for our user-agent."""
        return self._crawl_delay

    @property
    def sitemaps(self) -> list[str]:
        """Return sitemap URLs declared in robots.txt."""
        return self._sitemaps

    @property
    def loaded(self) -> bool:
        return self._loaded

    def _parse_crawl_delay(self, text: str) -> float | None:
        """Extract crawl-delay for our user-agent, falling back to wildcard."""
        lines = text.splitlines()
        current_agent = None
        agent_lower = self._user_agent.lower().split("/")[0]  # "axelseo"
        specific_delay: float | None = None
        wildcard_delay: float | None = None

        for line in lines:
            stripped = line.strip()
            if stripped.lower().startswith("user-agent:"):
                current_agent = stripped.split(":", 1)[1].strip().lower()
            elif stripped.lower().startswith("crawl-delay:") and current_agent:
                try:
                    delay = float(stripped.split(":", 1)[1].strip())
                except ValueError:
                    continue
                if current_agent == agent_lower:
                    specific_delay = delay
                elif current_agent == "*":
                    wildcard_delay = delay

        return specific_delay if specific_delay is not None else wildcard_delay
