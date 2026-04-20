"""Progress reporting via Redis pub/sub for long-running crawls."""

from __future__ import annotations

import json
from typing import Any

import structlog

logger = structlog.get_logger(__name__)


class ProgressReporter:
    """Publishes crawl progress updates to a Redis channel.

    If no Redis URL is configured, progress is logged but not published.
    """

    def __init__(self, redis_url: str | None, audit_id: str | None) -> None:
        self._redis_url = redis_url
        self._audit_id = audit_id
        self._redis: Any = None
        self._channel = f"crawl:progress:{audit_id}" if audit_id else None

    async def connect(self) -> None:
        if not self._redis_url or not self._channel:
            return
        try:
            import redis.asyncio as aioredis

            self._redis = aioredis.from_url(self._redis_url)
            logger.info("progress.connected", channel=self._channel)
        except Exception as e:
            logger.warning("progress.connect_failed", error=str(e))
            self._redis = None

    async def report(
        self,
        pages_crawled: int,
        pages_queued: int,
        current_url: str,
        status: str = "crawling",
    ) -> None:
        payload = {
            "audit_id": self._audit_id,
            "status": status,
            "pages_crawled": pages_crawled,
            "pages_queued": pages_queued,
            "current_url": current_url,
        }

        logger.debug(
            "crawl.progress",
            pages_crawled=pages_crawled,
            queued=pages_queued,
            url=current_url,
        )

        if self._redis and self._channel:
            try:
                await self._redis.publish(self._channel, json.dumps(payload))
            except Exception as e:
                logger.debug("progress.publish_failed", error=str(e))

    async def close(self) -> None:
        if self._redis:
            await self._redis.aclose()
            self._redis = None
