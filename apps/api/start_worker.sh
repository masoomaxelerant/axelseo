#!/bin/bash
python -m http.server $PORT &

celery -A app.worker.celery_app worker \
  --loglevel=info \
  --concurrency=1 \
  --max-tasks-per-child=1 \
  --without-gossip \
  --without-mingle \
  --without-heartbeat \
  --pool=solo
