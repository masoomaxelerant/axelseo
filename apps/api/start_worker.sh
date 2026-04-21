#!/bin/bash
# Start a tiny HTTP server in the background (so Render thinks it's a web service)
python -m http.server $PORT &

# Start Celery in the foreground
celery -A app.worker.celery_app worker --loglevel=info
