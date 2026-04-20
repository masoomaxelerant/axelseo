#!/bin/bash
# AxelSEO — Start all services with one command
# Usage: ./start.sh

ORANGE='\033[0;33m'
GREEN='\033[0;32m'
RED='\033[0;31m'
NC='\033[0m'

echo -e "${ORANGE}AxelSEO${NC} — Starting all services..."
echo ""

# Kill any existing processes on our ports
lsof -ti:3000 2>/dev/null | xargs kill -9 2>/dev/null || true
lsof -ti:8000 2>/dev/null | xargs kill -9 2>/dev/null || true
pkill -f "celery.*axelseo" 2>/dev/null || true
sleep 1

# 1. Docker services
echo -e "${GREEN}[1/5]${NC} Starting Postgres + Redis..."
docker compose up -d 2>&1 | tail -2

# 2. Check Python venv exists
if [ ! -f "apps/api/.venv/bin/python" ]; then
    echo -e "${RED}Error:${NC} Python venv not found at apps/api/.venv"
    echo "  Run: cd apps/api && python3 -m venv .venv && source .venv/bin/activate && pip install -e '.[dev]'"
    exit 1
fi

# 3. Install Playwright browsers if needed
echo -e "${GREEN}[2/5]${NC} Checking Playwright browsers..."
apps/api/.venv/bin/python -m playwright install chromium 2>&1 | tail -1

# 4. Start API in background (logs to file)
echo -e "${GREEN}[3/5]${NC} Starting FastAPI on port 8000..."
cd apps/api
.venv/bin/python -m uvicorn app.main:app --reload --port 8000 > /tmp/axelseo-api.log 2>&1 &
API_PID=$!
cd ../..

# Wait for API
for i in 1 2 3 4 5 6 7 8 9 10; do
    if curl -s http://localhost:8000/health > /dev/null 2>&1; then
        echo "  API ready"
        break
    fi
    sleep 1
done

# 5. Start Celery worker in background (logs to file)
echo -e "${GREEN}[4/5]${NC} Starting Celery worker..."
cd apps/api
.venv/bin/celery -A app.worker.celery_app worker --loglevel=info --concurrency=2 > /tmp/axelseo-worker.log 2>&1 &
WORKER_PID=$!
cd ../..

# 6. Start Next.js frontend (foreground)
echo -e "${GREEN}[5/5]${NC} Starting Next.js on port 3000..."
echo ""
echo -e "  ${ORANGE}AxelSEO is running:${NC}"
echo "    Frontend  → http://localhost:3000"
echo "    API       → http://localhost:8000"
echo "    API Docs  → http://localhost:8000/docs"
echo ""
echo "  Logs:"
echo "    API    → tail -f /tmp/axelseo-api.log"
echo "    Worker → tail -f /tmp/axelseo-worker.log"
echo ""
echo -e "  Press ${RED}Ctrl+C${NC} to stop everything."
echo ""

# Cleanup on exit
cleanup() {
    echo ""
    echo -e "${ORANGE}Shutting down all services...${NC}"
    kill $API_PID $WORKER_PID 2>/dev/null || true
    pkill -f "celery.*axelseo" 2>/dev/null || true
    echo "Done."
    exit 0
}
trap cleanup SIGINT SIGTERM

# Frontend runs in foreground so you see its output
pnpm --filter @axelseo/web dev

cleanup
