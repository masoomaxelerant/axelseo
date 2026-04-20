#!/bin/bash
# AxelSEO — Start all services with one command
# Usage: ./start.sh

set -e

# Colors
ORANGE='\033[0;33m'
GREEN='\033[0;32m'
NC='\033[0m'

echo -e "${ORANGE}AxelSEO${NC} — Starting all services..."

# Kill any existing processes on our ports
lsof -ti:3000 2>/dev/null | xargs kill -9 2>/dev/null || true
lsof -ti:8000 2>/dev/null | xargs kill -9 2>/dev/null || true

# Ensure Docker services are running
echo -e "${GREEN}[1/4]${NC} Starting Postgres + Redis..."
docker compose up -d 2>/dev/null || echo "Docker not available — assuming Postgres/Redis are running"

# Start API in background
echo -e "${GREEN}[2/4]${NC} Starting FastAPI (port 8000)..."
cd apps/api
.venv/bin/python -m uvicorn app.main:app --reload --port 8000 &
API_PID=$!
cd ../..

# Start Celery worker in background
echo -e "${GREEN}[3/4]${NC} Starting Celery worker..."
cd apps/api
.venv/bin/celery -A app.worker.celery_app worker --loglevel=info &
WORKER_PID=$!
cd ../..

# Start Next.js frontend (foreground — shows logs)
echo -e "${GREEN}[4/4]${NC} Starting Next.js (port 3000)..."
echo ""
echo -e "${ORANGE}AxelSEO is running:${NC}"
echo "  Frontend → http://localhost:3000"
echo "  API      → http://localhost:8000"
echo "  API Docs → http://localhost:8000/docs"
echo ""
echo "Press Ctrl+C to stop all services."
echo ""

# Trap Ctrl+C to kill all background processes
cleanup() {
    echo ""
    echo -e "${ORANGE}Shutting down...${NC}"
    kill $API_PID $WORKER_PID 2>/dev/null
    exit 0
}
trap cleanup SIGINT SIGTERM

# Run frontend in foreground
pnpm --filter @axelseo/web dev

# If frontend exits, clean up
cleanup
