# AxelSEO

Internal SEO audit tool for **Axelerant Digital**. Replaces our Semrush dependency with a self-hosted, open-source-powered platform for technical SEO audits, client reporting, and keyword tracking.

**No paid APIs** — everything runs on free/open-source tools.

## What It Does

1. Takes any URL and runs a full technical SEO audit (up to 500 pages)
2. Crawls with a headless browser (Playwright) that renders JavaScript
3. Runs Google Lighthouse for performance/accessibility/SEO scores
4. Detects 25 categories of SEO issues with fix guidance
5. Generates branded PDF reports for clients
6. Integrates Google Search Console for real keyword data
7. Tracks audit history per client for trend analysis
8. Browser extension for instant SEO checks on any page

## Architecture

```
axelseo/
├── apps/
│   ├── web/                 Next.js 14 dashboard (Clerk, Tailwind, shadcn/ui)
│   ├── api/                 FastAPI backend (SQLAlchemy, Celery)
│   ├── extension/           Chrome/Firefox browser extension (Plasmo)
│   └── pdf-generator/       Legacy PDF app (superseded by packages/pdf-generator)
│
├── packages/
│   ├── crawler/             Async web crawler (Playwright + BeautifulSoup)
│   ├── auditor/             SEO analysis engine (25 issue detectors)
│   ├── pdf-generator/       Branded PDF reports (Puppeteer + Handlebars)
│   └── shared-types/        Shared TypeScript type definitions
│
├── docs/
│   └── architecture.md      System architecture diagram (Mermaid)
│
├── docker-compose.yml       Local PostgreSQL 16 + Redis 7
└── pnpm-workspace.yaml      Monorepo config
```

See [`docs/architecture.md`](docs/architecture.md) for the full system architecture diagram.

## Tech Stack

| Layer | Technology |
|-------|-----------|
| **Frontend** | Next.js 14, TypeScript, Tailwind CSS, shadcn/ui, React Query, Recharts |
| **Auth** | Clerk (JWT) |
| **Backend API** | Python 3.11+, FastAPI, Pydantic 2, structlog |
| **Database** | PostgreSQL 16 (Neon), SQLAlchemy 2.0, Alembic |
| **Queue** | Redis 7 (Upstash), Celery |
| **Crawler** | Playwright (headless Chrome), BeautifulSoup4, lxml |
| **SEO Analysis** | Custom 25-detector engine with scoring algorithm |
| **Performance** | Google Lighthouse (Node subprocess) |
| **PDF Reports** | Puppeteer + Handlebars (12-page branded reports) |
| **Storage** | Cloudflare R2 (S3-compatible) |
| **Search Data** | Google Search Console API (OAuth, read-only) |
| **Extension** | Plasmo framework (Manifest V3, Chrome + Firefox) |

## Prerequisites

- Node.js >= 20
- Python >= 3.11
- pnpm >= 9
- Docker (for local Postgres + Redis)
- [Clerk](https://clerk.com) account (free tier)

## Quick Start

```bash
# 1. Clone and install
git clone <repo-url> axelseo && cd axelseo
pnpm install

# 2. Start infrastructure
docker compose up -d

# 3. Set up Python backend
cd apps/api
python3 -m venv .venv
source .venv/bin/activate
pip install -e ".[dev]"

# 4. Install crawler + auditor packages
pip install -e ../../packages/crawler
pip install -e "../../packages/crawler[dev]"
pip install -e ../../packages/auditor
pip install -e "../../packages/auditor[dev]"

# 5. Configure environment
cp ../../.env.example ../web/.env.local   # Add your Clerk keys
cp ../../.env.example .env                # Add Clerk keys + keep DB/Redis defaults

# 6. Run database migrations
alembic upgrade head

# 7. Start services (3 terminals)
pnpm dev              # Terminal 1 → Frontend at http://localhost:3000
pnpm dev:api          # Terminal 2 → API at http://localhost:8000
pnpm dev:worker       # Terminal 3 → Celery worker for async audits
```

## Environment Variables

Copy `.env.example` and fill in the required values:

| Variable | Required | Where | Description |
|----------|----------|-------|-------------|
| `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` | Yes | Frontend | Clerk publishable key |
| `CLERK_SECRET_KEY` | Yes | Frontend + API | Clerk secret key |
| `DATABASE_URL` | Yes | API | PostgreSQL connection (`postgresql+asyncpg://...`) |
| `REDIS_URL` | Yes | API + Worker | Redis connection |
| `GOOGLE_CLIENT_ID` | For GSC | API | Google OAuth client ID |
| `GOOGLE_CLIENT_SECRET` | For GSC | API | Google OAuth client secret |
| `TOKEN_ENCRYPTION_KEY` | For GSC | API | Fernet key for encrypting OAuth tokens |
| `S3_ENDPOINT_URL` | For PDFs | API | Cloudflare R2 endpoint |
| `S3_ACCESS_KEY_ID` | For PDFs | API | R2 access key |
| `S3_SECRET_ACCESS_KEY` | For PDFs | API | R2 secret key |

Generate an encryption key:
```bash
python3 -c "from cryptography.fernet import Fernet; print(Fernet.generate_key().decode())"
```

## Running Tests

```bash
# All Python tests (129 tests)
cd apps/api && source .venv/bin/activate

# Crawler — 60 tests (URL normalization, robots.txt, sitemap, parsing, rate limiting)
cd ../../packages/crawler && python -m pytest tests/ -v

# Auditor — 68 tests (25 detectors, scoring algorithm, Lighthouse, integration)
cd ../auditor && python -m pytest tests/ -v

# API — health check
cd ../../apps/api && python -m pytest tests/ -v

# Frontend build validation
pnpm --filter @axelseo/web build

# Extension build
pnpm --filter @axelseo/extension build
```

## Project Structure (Detail)

### Apps

**`apps/web/`** — Next.js 14 Dashboard
- 10 pages: landing, auth (sign-in/up), dashboard home, audits (list/new/detail), clients (list/detail), reports, settings
- 18 React components: score gauges, issue tables, CWV cards, trend charts, client cards, GSC integration
- 4 React Query hooks with mock data fallback
- Axelerant brand: #FF5C00 orange, #0D1B2A navy, Inter + Space Grotesk fonts

**`apps/api/`** — FastAPI Backend
- REST API at `/api/v1/` with Swagger docs at `/docs`
- 10 endpoints: audits CRUD, projects CRUD, GSC OAuth + data
- 8 SQLAlchemy models: User, Organization, Client, Project, Audit, AuditPage, PageIssue, Report, GSCConnection, GSCKeywordSnapshot
- Clerk JWT verification middleware
- Celery worker with 3-phase audit pipeline (crawl -> analyze -> score)
- Weekly GSC data refresh via Celery Beat

**`apps/extension/`** — Browser Extension
- Plasmo framework (Manifest V3)
- Instant SEO check: title, meta, headings, OG preview, schema.org, page stats
- "Full Audit" button sends URL to main app
- Builds for Chrome Web Store and Firefox Add-ons

### Packages

**`packages/crawler/`** — Web Crawler
- Async BFS crawler using Playwright (headless Chrome)
- Respects robots.txt with crawl-delay support
- Sitemap discovery (handles nested sitemap indexes)
- URL normalization and deduplication
- Rate limiting (token bucket) with configurable RPS
- Retry with exponential backoff (3 attempts)
- Extracts per page: title, meta, headings, images, links, OG, Twitter Card, Schema.org, response headers, performance metrics
- CLI: `axelseo-crawl <url> --max-pages 50`
- Progress reporting via Redis pub/sub

**`packages/auditor/`** — SEO Analysis Engine
- 25 issue detectors across 8 categories
- Detectors: missing title/meta/H1/canonical, duplicates, heading hierarchy, broken links, redirect chains, orphan pages, thin content, missing alt text, image dimensions, HTTPS, Open Graph, Schema.org, Twitter Cards, breadcrumbs, generic anchor text, external noopener
- Lighthouse integration (runs on 5 sampled pages)
- Scoring: starts at 100, deducts per issue (critical -5, warning -2, info -0.5, with caps)
- Core Web Vitals: median LCP/INP/CLS with good/needs-improvement/poor ratings
- Extensible: add new detectors by implementing `IssueDetector` interface

**`packages/pdf-generator/`** — PDF Report Generator
- 12-page branded reports via Puppeteer + Handlebars
- Pages: cover, executive summary, methodology, performance, SEO findings (3 pages), site structure, keywords, recommendations, appendix (glossary + all pages), back cover
- SVG chart generation (score gauges, severity bars, CWV badges)
- Whitelabel support (hide Axelerant branding per client)
- CLI: `npx ts-node src/cli.ts --sample -o report.pdf`

### Google Search Console Integration

- OAuth flow with read-only scope (`webmasters.readonly`)
- Refresh tokens encrypted at rest (AES-256 Fernet)
- Data: top 100 queries, top 50 pages, opportunity keywords (positions 11-20), device/country breakdown
- Weekly auto-refresh via Celery Beat (Monday 3am UTC)
- Graceful degradation: keyword sections hidden when GSC not connected

## API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/health` | Health check |
| `POST` | `/api/v1/audits/` | Create audit (queues Celery job) |
| `GET` | `/api/v1/audits/` | List audits |
| `GET` | `/api/v1/audits/{id}` | Get audit detail |
| `POST` | `/api/v1/projects/` | Create project |
| `GET` | `/api/v1/projects/` | List projects |
| `GET` | `/api/v1/projects/{id}` | Get project |
| `GET` | `/api/v1/integrations/gsc/auth-url` | Start GSC OAuth |
| `GET` | `/api/v1/integrations/gsc/callback` | OAuth callback |
| `GET` | `/api/v1/integrations/gsc/properties` | List GSC properties |
| `POST` | `/api/v1/integrations/gsc/connect` | Connect property to client |
| `GET` | `/api/v1/integrations/gsc/data/{client_id}` | Get keyword data |
| `GET` | `/api/v1/integrations/gsc/status/{client_id}` | Connection status |
| `POST` | `/api/v1/integrations/gsc/disconnect/{client_id}` | Disconnect + revoke |

## Database Schema

```
Organization (name, slug)
├── User (clerk_id, email, name, role)
└── Client (name, domain, notes)
    ├── GSCConnection (gsc_property, encrypted_refresh_token)
    │   └── GSCKeywordSnapshot (top_queries, top_pages, opportunity_queries)
    └── Project (name, domain, owner_id)
        └── Audit (url, status, scores, CWV, celery_task_id)
            ├── AuditPage (url, title, meta, h1, canonical, load_time)
            ├── PageIssue (severity, category, message)
            └── Report (file_url, file_size_bytes)
```

## Deployment

| Service | Platform | Notes |
|---------|----------|-------|
| Frontend | Vercel | Auto-deploy from main branch |
| API | Railway | FastAPI with uvicorn |
| Workers | Railway | Celery + Celery Beat |
| Database | Neon | PostgreSQL 16, serverless |
| Cache/Queue | Upstash | Redis 7, serverless |
| Storage | Cloudflare R2 | PDF reports + screenshots |
| Auth | Clerk | Hosted, free tier |

## Audit Pipeline

```
User submits URL
  → POST /api/v1/audits/
  → FastAPI creates Audit record (status: pending)
  → Dispatches Celery task via Redis
  → Worker picks up task
    → Phase 1: CRAWL (Playwright BFS, up to 500 pages)
      → saves each page to audit_pages table
      → status updates via Redis pub/sub → frontend polls every 3s
    → Phase 2: ANALYZE (25 detectors + Lighthouse on 5 pages)
      → saves issues to page_issues table
    → Phase 3: SCORE (SEO score from issues, Lighthouse averages, CWV medians)
      → updates audit record with final scores
  → Frontend shows completed audit with scores, issues, CWV, site structure
  → "Export PDF" generates 12-page branded report
```

## License

Internal tool for Axelerant Digital. Not open source.
