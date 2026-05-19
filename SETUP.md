# AxelSEO — Local Development Setup Guide

Complete setup from a fresh macOS or Linux machine to a running app.

---

## Prerequisites

Install these before starting:

| Software | Version | Install Command (macOS) |
|----------|---------|------------------------|
| **Node.js** | >= 20 | `brew install node` |
| **pnpm** | >= 9 | `npm install -g pnpm` |
| **Python** | >= 3.11 | `brew install python@3.12` |
| **Docker Desktop** | Latest | [Download](https://www.docker.com/products/docker-desktop/) |
| **Git** | Latest | `brew install git` |

Verify installations:
```bash
node --version    # v20.x or higher
pnpm --version    # 9.x or higher
python3 --version # 3.11 or higher
docker --version  # Any recent version
```

---

## Step 1: Clone the Repository

```bash
git clone git@github.com:masoomaxelerant/axelseo.git
cd axelseo
```

---

## Step 2: Install JavaScript Dependencies

```bash
pnpm install
```

This installs dependencies for all workspace packages (frontend, extension, PDF generator, shared types).

---

## Step 3: Start Database & Redis

```bash
docker compose up -d
```

This starts:
- **PostgreSQL 16** on port `5432` (user: `postgres`, password: `postgres`, db: `axelseo`)
- **Redis 7** on port `6379`

Verify they're running:
```bash
docker ps
```

---

## Step 4: Set Up Python Backend

```bash
cd apps/api

# Create virtual environment
python3 -m venv .venv

# Activate it
source .venv/bin/activate

# Install backend + dev dependencies
pip install -e ".[dev]"

# Install the crawler and auditor packages (editable mode)
pip install -e ../../packages/crawler
pip install -e "../../packages/crawler[dev]"
pip install -e ../../packages/auditor
pip install -e "../../packages/auditor[dev]"

# Install Playwright browsers (needed for web crawling)
python -m playwright install chromium
```

---

## Step 5: Configure Environment Variables

### Backend (`apps/api/.env`)

Create the file:
```bash
# Still inside apps/api/
cp ../../.env.example .env
```

Edit `apps/api/.env` with these values:
```env
# Database (local Docker)
DATABASE_URL=postgresql+asyncpg://postgres:postgres@localhost:5432/axelseo

# Redis (local Docker)
REDIS_URL=redis://localhost:6379/0

# Secret key (change in production)
SECRET_KEY=dev-secret-key-change-in-production

# Logging
LOG_LEVEL=DEBUG

# Clerk (optional for local dev — leave empty to use dev bypass)
CLERK_PUBLISHABLE_KEY=
CLERK_SECRET_KEY=

# Token encryption key — generate with:
#   python3 -c "from cryptography.fernet import Fernet; print(Fernet.generate_key().decode())"
TOKEN_ENCRYPTION_KEY=

# PageSpeed Insights API key (optional, get free at https://developers.google.com/speed/docs/insights/v5/get-started)
PSI_API_KEY=

# Crawler tuning (defaults work fine for local)
CRAWLER_CONCURRENCY=5
CRAWLER_RPS=10
CRAWLER_PAGE_TIMEOUT_MS=12000
CRAWLER_MAX_RETRIES=2

# Google Search Console (optional)
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=

# S3 / Cloudflare R2 (optional, for PDF storage)
S3_ENDPOINT_URL=
S3_ACCESS_KEY_ID=
S3_SECRET_ACCESS_KEY=
S3_BUCKET_NAME=axelseo-reports
S3_PUBLIC_URL=
```

> **Note:** With empty Clerk keys, the API uses a dev bypass that allows all requests without authentication. This is fine for local development.

### Frontend (`apps/web/.env.local`)

```bash
cd ../web
cp ../../.env.example .env.local
```

Edit `apps/web/.env.local`:
```env
NEXT_PUBLIC_API_URL=http://localhost:8000
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_your_key_here
CLERK_SECRET_KEY=sk_test_your_key_here
NEXT_PUBLIC_CLERK_SIGN_IN_URL=/auth/sign-in
NEXT_PUBLIC_CLERK_SIGN_UP_URL=/auth/sign-up
NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL=/dashboard
NEXT_PUBLIC_CLERK_AFTER_SIGN_UP_URL=/dashboard
```

> **To get Clerk keys:** Create a free account at [clerk.com](https://clerk.com), create an application, and copy the keys from the API Keys page.

---

## Step 6: Run Database Migrations

```bash
cd ../api   # back to apps/api
source .venv/bin/activate
alembic upgrade head
```

This creates all database tables (users, clients, audits, issues, etc.).

---

## Step 7: Start the Application

From the project root:
```bash
cd ../..   # back to project root
pnpm start
```

That's it. This single command starts everything:
- PostgreSQL + Redis (Docker)
- FastAPI API on `http://localhost:8000`
- Celery worker for background jobs
- Next.js frontend on `http://localhost:3000`

Press `Ctrl+C` to stop all services at once.

> You can also run `./start.sh` directly — `pnpm start` is just a shortcut for it.

### Alternative: Manual start (3 separate terminals)

If you prefer to run services individually (useful for debugging):

**Terminal 1 — Frontend:**
```bash
pnpm dev
```

**Terminal 2 — API:**
```bash
pnpm dev:api
```

**Terminal 3 — Worker:**
```bash
pnpm dev:worker
```

---

## Step 8: Verify Everything Works

1. Open `http://localhost:3000` — you should see the landing page
2. Open `http://localhost:8000/docs` — Swagger API docs
3. Open `http://localhost:8000/health` — should return `{"status": "ok"}`
4. Enter a URL on the homepage and click "Run Free Audit" — the quick audit should work
5. Sign in and go to Dashboard > Audits > New Audit — start a full crawl

---

## Running Tests

```bash
cd apps/api
source .venv/bin/activate

# Crawler tests (60 tests)
cd ../../packages/crawler
python -m pytest tests/ -v

# Auditor tests (68 tests)
cd ../auditor
python -m pytest tests/ -v

# API health test
cd ../../apps/api
python -m pytest tests/ -v

# Frontend build check
cd ../..
pnpm --filter @axelseo/web build
```

---

## Project Structure

```
axelseo/
├── apps/
│   ├── web/                 Next.js 14 frontend dashboard
│   ├── api/                 FastAPI + Celery backend
│   ├── extension/           Chrome/Firefox browser extension
│   └── pdf-generator/       Legacy PDF app
├── packages/
│   ├── crawler/             Playwright async web crawler
│   ├── auditor/             25 SEO issue detectors + scoring
│   ├── pdf-generator/       Puppeteer PDF report generator
│   └── shared-types/        Shared TypeScript types
├── docs/                    Architecture diagrams
├── docker-compose.yml       Local Postgres + Redis
├── start.sh                 One-command startup
├── package.json             Monorepo scripts
└── pnpm-workspace.yaml      Workspace config
```

---

## Available Scripts

| Command | Description |
|---------|-------------|
| `./start.sh` | Start everything (recommended) |
| `pnpm dev` | Frontend only (port 3000) |
| `pnpm dev:api` | API only (port 8000) |
| `pnpm dev:worker` | Celery worker only |
| `pnpm build` | Build frontend for production |
| `pnpm test` | Run all tests |
| `pnpm db:migrate` | Run database migrations |
| `pnpm db:revision` | Generate new migration |

---

## Logs

When using `./start.sh`, logs are available at:
- **API:** `tail -f /tmp/axelseo-api.log`
- **Worker:** `tail -f /tmp/axelseo-worker.log`
- **Frontend:** Shown directly in the terminal

---

## Ports Used

| Port | Service |
|------|---------|
| 3000 | Next.js frontend |
| 8000 | FastAPI API |
| 5432 | PostgreSQL |
| 6379 | Redis |

---

## Common Issues

### "Address already in use" on port 8000 or 3000
Kill the existing process:
```bash
lsof -ti:8000 | xargs kill -9
lsof -ti:3000 | xargs kill -9
```

### Celery worker not picking up tasks
Kill stale workers and restart:
```bash
pkill -9 -f "celery.*axelseo"
pnpm dev:worker
```

### "ModuleNotFoundError: No module named 'psycopg2'"
Install it:
```bash
cd apps/api && source .venv/bin/activate
pip install psycopg2-binary
```

### Playwright browser not found
```bash
cd apps/api && source .venv/bin/activate
python -m playwright install chromium
```

### Clerk "Handshake token verification failed"
Make sure `CLERK_SECRET_KEY` in `apps/web/.env.local` is not duplicated. Check the file has only ONE `CLERK_SECRET_KEY` line.

### Audit stuck on "Queued"
The Celery worker isn't running. Start it:
```bash
pnpm dev:worker
```

---

## Optional Setup

### Google Search Console Integration
1. Create a project at [Google Cloud Console](https://console.cloud.google.com)
2. Enable "Google Search Console API"
3. Create OAuth 2.0 credentials (web application)
4. Set redirect URI: `http://localhost:8000/api/v1/integrations/gsc/callback`
5. Add `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` to `apps/api/.env`

### PageSpeed Insights API Key
For faster Lighthouse scores on the server:
1. Go to [PSI Get Started](https://developers.google.com/speed/docs/insights/v5/get-started)
2. Click "Get a Key" and select a project
3. Add `PSI_API_KEY=your-key` to `apps/api/.env`

### Browser Extension
```bash
pnpm --filter @axelseo/extension build
# Load build/chrome-mv3-prod in chrome://extensions (Developer mode)
```
