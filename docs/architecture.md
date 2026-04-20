# AxelSEO — System Architecture

```mermaid
flowchart TB
    subgraph Frontend["Frontend (Vercel)"]
        Browser["Browser\nNext.js 14 App Router\nReact + Tailwind + shadcn/ui"]
        Extension["Browser Extension\nPlasmo / Manifest V3"]
    end

    subgraph Auth["Authentication"]
        Clerk["Clerk\nJWT Auth + User Management"]
    end

    subgraph Backend["Backend (Railway)"]
        API["FastAPI\nREST API v1\nPython 3.11"]
        Workers["Celery Workers\nAudit Pipeline"]
        PDFWorker["PDF Worker\nPuppeteer + Handlebars\nNode.js"]
    end

    subgraph Data["Data Layer"]
        Postgres["PostgreSQL 16\n(Neon)\nUsers, Clients, Audits,\nIssues, GSC Data"]
        Redis["Redis 7\n(Upstash)\nTask Queue + Cache +\nPub/Sub Progress"]
        R2["Cloudflare R2\nS3-Compatible\nPDF Reports +\nScreenshots"]
    end

    subgraph External["External Services"]
        GSC["Google Search Console\nOAuth 2.0 Read-Only\nKeywords, Impressions,\nClicks, Positions"]
        Lighthouse["Google Lighthouse\nNode Subprocess\nPerformance, A11y,\nBest Practices, SEO"]
    end

    subgraph CrawlEngine["Crawl & Analysis Engine"]
        Crawler["axelseo-crawler\nPlaywright + BeautifulSoup\nrobots.txt, Sitemap,\nRate Limiting"]
        Auditor["axelseo-auditor\n25 Issue Detectors\nScoring Algorithm"]
    end

    %% Frontend → Auth
    Browser -- "Sign in / Sign up" --> Clerk
    Clerk -- "JWT Token" --> Browser
    Extension -- "Auth token" --> API

    %% Frontend → Backend
    Browser -- "POST /audits\nGET /audits/:id\nPoll status" --> API
    Browser -- "GET /integrations/gsc/*\nOAuth flow" --> API

    %% API → Data
    API -- "Async queries\nSQLAlchemy 2.0" --> Postgres
    API -- "Dispatch tasks\nCelery .delay()" --> Redis
    API -- "Verify JWT" --> Clerk

    %% Workers
    Redis -- "Consume tasks" --> Workers
    Workers -- "Phase 1: Crawl" --> Crawler
    Workers -- "Phase 2: Analyze" --> Auditor
    Workers -- "Phase 3: Score +\nSave results" --> Postgres
    Workers -- "Progress updates\nPub/Sub" --> Redis
    Workers -- "Run Lighthouse\non sampled pages" --> Lighthouse

    %% PDF Generation
    API -- "Queue PDF job" --> Redis
    Redis -- "Consume" --> PDFWorker
    PDFWorker -- "Upload PDF" --> R2
    PDFWorker -- "Store URL" --> Postgres

    %% GSC
    API -- "OAuth token exchange\nFetch search analytics" --> GSC
    Workers -- "Weekly data pull\nCelery Beat" --> GSC

    %% R2
    Browser -- "Download PDF\nSigned URL" --> R2

    %% Styling
    style Frontend fill:#0D1B2A,stroke:#FF5C00,color:#FFFFFF
    style Auth fill:#7C3AED,stroke:#7C3AED,color:#FFFFFF
    style Backend fill:#1E3A5F,stroke:#FF5C00,color:#FFFFFF
    style Data fill:#1A1A2E,stroke:#FF5C00,color:#FFFFFF
    style External fill:#1A3320,stroke:#22C55E,color:#FFFFFF
    style CrawlEngine fill:#2D1B00,stroke:#FF5C00,color:#FFFFFF

    style Browser fill:#FF5C00,stroke:#FF5C00,color:#FFFFFF
    style Extension fill:#FF5C00,stroke:#FF5C00,color:#FFFFFF
    style Clerk fill:#7C3AED,stroke:#FFFFFF,color:#FFFFFF
    style API fill:#FF5C00,stroke:#FFFFFF,color:#FFFFFF
    style Workers fill:#F59E0B,stroke:#FFFFFF,color:#000000
    style PDFWorker fill:#F59E0B,stroke:#FFFFFF,color:#000000
    style Postgres fill:#336791,stroke:#FFFFFF,color:#FFFFFF
    style Redis fill:#DC382D,stroke:#FFFFFF,color:#FFFFFF
    style R2 fill:#F48120,stroke:#FFFFFF,color:#FFFFFF
    style GSC fill:#4285F4,stroke:#FFFFFF,color:#FFFFFF
    style Lighthouse fill:#FF6D00,stroke:#FFFFFF,color:#FFFFFF
    style Crawler fill:#FF5C00,stroke:#FFFFFF,color:#FFFFFF
    style Auditor fill:#FF5C00,stroke:#FFFFFF,color:#FFFFFF
```

## Data Flow Summary

### Audit Pipeline (user submits URL)
```
Browser → POST /api/v1/audits → FastAPI → Celery .delay() → Redis Queue
    → Worker picks up task
    → Phase 1: Crawler (Playwright BFS, up to 500 pages)
    → Phase 2: Auditor (25 detectors, Lighthouse on 5 sampled pages)
    → Phase 3: Save scores + issues to Postgres
    → Status updates via Redis Pub/Sub → Browser polls every 3s
```

### PDF Report Generation
```
Browser → POST /api/v1/reports/generate → Redis Queue
    → PDF Worker (Node.js): Handlebars template → Puppeteer render → PDF buffer
    → Upload to Cloudflare R2
    → Store signed URL in Postgres
    → Browser downloads via R2 signed URL
```

### Google Search Console Integration
```
Browser → "Connect GSC" → OAuth redirect to Google
    → Google callback → FastAPI exchanges code for tokens
    → Refresh token encrypted (AES-256 Fernet) → stored in Postgres
    → Celery task: fetch last 90 days of search analytics
    → Weekly Celery Beat: refresh all connected clients (Monday 3am UTC)
```

### Authentication
```
Browser → Clerk hosted sign-in → JWT issued
    → JWT sent as Bearer token on every API request
    → FastAPI verifies JWT via Clerk JWKS endpoint
    → Clerk user ID extracted from 'sub' claim
```

## Service Inventory

| Service | Technology | Hosting | Purpose |
|---------|-----------|---------|---------|
| Frontend | Next.js 14, TypeScript, Tailwind | Vercel | Dashboard UI |
| Extension | Plasmo, React | Chrome/Firefox | Quick SEO check |
| API | FastAPI, Python 3.11 | Railway | REST API |
| Workers | Celery, Python | Railway | Async audit jobs |
| PDF Worker | Puppeteer, Node.js | Railway | Report generation |
| Database | PostgreSQL 16 | Neon | Primary data store |
| Cache/Queue | Redis 7 | Upstash | Task queue + pub/sub |
| Storage | S3-compatible | Cloudflare R2 | PDF reports + screenshots |
| Auth | Clerk | Clerk Cloud | User management + JWT |
| Search Data | Google Search Console API | Google | Real keyword data |
| Performance | Google Lighthouse | Local subprocess | Page speed + scores |
| Crawler | Playwright + BeautifulSoup | In-worker | Headless browser crawling |
| Auditor | Custom Python | In-worker | 25 SEO issue detectors |
