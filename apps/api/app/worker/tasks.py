"""Celery tasks for the full audit pipeline: crawl → analyze → score."""

import asyncio
from datetime import UTC, datetime

from sqlalchemy import create_engine
from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.logging import get_logger
from app.models.audit import Audit, AuditPage, PageIssue
from app.worker import celery_app

logger = get_logger(__name__)

# Celery workers are sync — use sync SQLAlchemy engine
_sync_url = settings.database_url.replace("+asyncpg", "")
sync_engine = create_engine(_sync_url)


def _update_audit(audit_id: str, **kwargs) -> None:
    with Session(sync_engine) as session:
        audit = session.query(Audit).filter(Audit.id == audit_id).first()
        if not audit:
            logger.error("worker.audit_not_found", audit_id=audit_id)
            return
        for key, value in kwargs.items():
            if hasattr(audit, key):
                setattr(audit, key, value)
        session.commit()


def _save_crawled_page(session: Session, audit_id: str, page) -> None:
    """Persist a CrawledPage to the audit_pages table."""
    h1_text = None
    for h in page.headings:
        if h.level == 1:
            h1_text = h.text
            break

    schema_types = [
        s["@type"] for s in page.schema_org
        if isinstance(s, dict) and "@type" in s
    ] or None

    audit_page = AuditPage(
        audit_id=audit_id,
        url=page.final_url,
        status_code=page.status_code,
        title=page.title,
        meta_description=page.meta_description,
        h1=h1_text,
        canonical=page.canonical_url,
        word_count=len(page.html.split()) if page.html else 0,
        load_time_ms=page.performance.load_time_ms,
        schema_types=schema_types,
    )
    session.add(audit_page)


def _save_auditor_issues(session: Session, audit_id: str, issues) -> None:
    """Persist SEOIssue objects from the auditor to the page_issues table."""
    severity_map = {"critical": "error", "warning": "warning", "info": "info"}
    for issue in issues:
        session.add(PageIssue(
            audit_id=audit_id,
            page_url=issue.page_url or "",
            severity=severity_map.get(issue.severity.value, "info"),
            category=issue.category,
            message=f"{issue.message} — {issue.how_to_fix}",
        ))


async def _run_audit_pipeline(audit_id: str, url: str, max_pages: int) -> None:
    """Full async pipeline: crawl → analyze → score."""
    from axelseo_auditor import AuditConfig, Auditor
    from axelseo_crawler import CrawlConfig, Crawler

    # ── Phase 1: Crawl ──
    crawl_config = CrawlConfig(
        start_url=url,
        max_pages=max_pages,
        max_depth=5,
        requests_per_second=2.0,
        respect_robots_txt=True,
        take_screenshots=False,
        redis_url=settings.redis_url,
        audit_id=audit_id,
    )

    _update_audit(audit_id, status="crawling", status_message="Starting crawl...")

    crawled_pages = []
    async with Crawler(crawl_config) as crawler:
        with Session(sync_engine) as session:
            async for page in crawler.crawl():
                crawled_pages.append(page)
                _save_crawled_page(session, audit_id, page)
                _update_audit(
                    audit_id,
                    pages_crawled=crawler.summary.pages_crawled,
                    status_message=f"Crawled {crawler.summary.pages_crawled} pages...",
                )
            session.commit()
        crawl_summary = crawler.summary

    logger.info(
        "worker.crawl_complete",
        audit_id=audit_id,
        pages=crawl_summary.pages_crawled,
        elapsed=crawl_summary.elapsed_seconds,
    )

    # ── Phase 2: Analyze ──
    _update_audit(
        audit_id,
        status="analyzing",
        status_message=f"Analyzing {crawl_summary.pages_crawled} pages for SEO issues...",
    )

    audit_config = AuditConfig(
        run_lighthouse=True,
        lighthouse_sample_size=5,
    )
    auditor = Auditor(audit_config)
    audit_result = await auditor.analyze(crawled_pages)

    # Save issues to DB
    with Session(sync_engine) as session:
        _save_auditor_issues(session, audit_id, audit_result.issues)
        session.commit()

    logger.info(
        "worker.analysis_complete",
        audit_id=audit_id,
        issues=len(audit_result.issues),
        seo_score=audit_result.scores.seo,
    )

    # ── Phase 3: Update final scores ──
    _update_audit(
        audit_id,
        status="completed",
        status_message=(
            f"Audit completed — {crawl_summary.pages_crawled} pages, "
            f"{len(audit_result.issues)} issues found"
        ),
        pages_crawled=crawl_summary.pages_crawled,
        score_performance=audit_result.scores.performance or None,
        score_accessibility=audit_result.scores.accessibility or None,
        score_best_practices=audit_result.scores.best_practices or None,
        score_seo=audit_result.scores.seo,
        lcp_ms=audit_result.core_web_vitals.lcp_ms,
        inp_ms=audit_result.core_web_vitals.inp_ms,
        cls=audit_result.core_web_vitals.cls,
        completed_at=datetime.now(UTC),
    )


@celery_app.task(bind=True, name="run_audit", soft_time_limit=900, time_limit=960)
def run_audit(self, audit_id: str) -> dict:
    """Main audit task: crawl → analyze → score.

    Dispatched by POST /api/v1/audits/. Updates the audit record through
    each phase so the frontend can poll for live status.
    """
    logger.info("worker.audit_starting", audit_id=audit_id, task_id=self.request.id)

    try:
        with Session(sync_engine) as session:
            audit = session.query(Audit).filter(Audit.id == audit_id).first()
            if not audit:
                raise ValueError(f"Audit {audit_id} not found")
            url = audit.url
            max_pages = audit.max_pages

        _update_audit(audit_id, status="pending", status_message="Initializing...")
        asyncio.run(_run_audit_pipeline(audit_id, url, max_pages))
        return {"audit_id": audit_id, "status": "completed"}

    except Exception as e:
        logger.error("worker.audit_failed", audit_id=audit_id, error=str(e))
        _update_audit(audit_id, status="failed", status_message=f"Audit failed: {str(e)}")
        raise


# ──────────────────────────────────────────────────
# GSC data fetch tasks
# ──────────────────────────────────────────────────

@celery_app.task(bind=True, name="fetch_gsc_data")
def fetch_gsc_data(self, connection_id: str) -> dict:
    """Fetch GSC search analytics for a single connection and store as a snapshot."""
    from app.models.gsc_data import GSCConnection, GSCKeywordSnapshot
    from app.services.gsc import fetch_search_analytics

    logger.info("worker.gsc_fetch_starting", connection_id=connection_id)

    with Session(sync_engine) as session:
        connection = session.query(GSCConnection).filter(GSCConnection.id == connection_id).first()
        if not connection:
            logger.error("worker.gsc_connection_not_found", connection_id=connection_id)
            return {"status": "not_found"}

        try:
            data = fetch_search_analytics(
                connection.encrypted_refresh_token,
                connection.gsc_property,
                days=90,
            )

            snapshot = GSCKeywordSnapshot(
                connection_id=connection.id,
                date_range_start=data["date_range_start"],
                date_range_end=data["date_range_end"],
                top_queries=data["top_queries"],
                top_pages=data["top_pages"],
                opportunity_queries=data["opportunity_queries"],
                device_breakdown=data["device_breakdown"],
                country_breakdown=data["country_breakdown"],
            )
            session.add(snapshot)

            connection.last_fetch_at = datetime.now(UTC)
            session.commit()

            logger.info(
                "worker.gsc_fetch_complete",
                connection_id=connection_id,
                queries=len(data["top_queries"]),
            )
            return {"status": "ok", "queries": len(data["top_queries"])}

        except Exception as e:
            logger.error("worker.gsc_fetch_failed", connection_id=connection_id, error=str(e))
            return {"status": "error", "error": str(e)}


@celery_app.task(name="fetch_all_gsc_data")
def fetch_all_gsc_data() -> dict:
    """Weekly job: refresh GSC data for all connected clients."""
    from app.models.gsc_data import GSCConnection

    logger.info("worker.gsc_fetch_all_starting")

    with Session(sync_engine) as session:
        connections = session.query(GSCConnection).all()
        count = len(connections)

    for conn in connections:
        fetch_gsc_data.delay(str(conn.id))

    logger.info("worker.gsc_fetch_all_dispatched", connections=count)
    return {"dispatched": count}
