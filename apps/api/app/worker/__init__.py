import ssl

from celery import Celery
from celery.schedules import crontab

from app.core.config import settings

celery_app = Celery(
    "axelseo",
    broker=settings.redis_url,
    backend=settings.redis_url,
)

# TLS config for Upstash Redis (rediss://)
# Required because Upstash uses TLS and Celery needs explicit SSL settings
if settings.redis_url.startswith("rediss://"):
    celery_app.conf.broker_use_ssl = {"ssl_cert_reqs": ssl.CERT_NONE}
    celery_app.conf.redis_backend_use_ssl = {"ssl_cert_reqs": ssl.CERT_NONE}

celery_app.conf.update(
    task_serializer="json",
    result_serializer="json",
    accept_content=["json"],
    timezone="UTC",
    task_track_started=True,
    task_time_limit=1800,
    worker_hijack_root_logger=False,
    # Periodic tasks
    beat_schedule={
        "fetch-all-gsc-data-weekly": {
            "task": "fetch_all_gsc_data",
            "schedule": crontab(hour=3, minute=0, day_of_week=1),  # Monday 3am UTC
        },
    },
)

celery_app.autodiscover_tasks(["app.worker"])
