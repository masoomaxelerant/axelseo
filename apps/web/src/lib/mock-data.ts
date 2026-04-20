import type { Audit, AuditDetail, SEOIssue } from "@/types/audit";
import type { Client } from "@/types/client";
import type { Report } from "@/types/report";

export const MOCK_AUDITS: Audit[] = [
  {
    id: "a1", url: "https://axelerant.com", status: "completed", status_message: "Completed — 48 pages",
    project_id: "p1", pages_crawled: 48, max_pages: 500,
    score_performance: 72, score_accessibility: 88, score_best_practices: 91, score_seo: 85,
    lcp_ms: 2400, inp_ms: 180, cls: 0.08, celery_task_id: null,
    created_at: "2026-04-18T10:30:00Z", completed_at: "2026-04-18T10:42:00Z",
  },
  {
    id: "a2", url: "https://acme-corp.com", status: "completed", status_message: "Completed — 120 pages",
    project_id: "p2", pages_crawled: 120, max_pages: 500,
    score_performance: 45, score_accessibility: 62, score_best_practices: 78, score_seo: 54,
    lcp_ms: 4200, inp_ms: 320, cls: 0.22, celery_task_id: null,
    created_at: "2026-04-17T14:00:00Z", completed_at: "2026-04-17T14:25:00Z",
  },
  {
    id: "a3", url: "https://greenfield.io", status: "crawling", status_message: "Crawled 34 pages...",
    project_id: "p3", pages_crawled: 34, max_pages: 200,
    score_performance: null, score_accessibility: null, score_best_practices: null, score_seo: null,
    lcp_ms: null, inp_ms: null, cls: null, celery_task_id: "task-123",
    created_at: "2026-04-20T08:15:00Z", completed_at: null,
  },
  {
    id: "a4", url: "https://techstart.dev", status: "completed", status_message: "Completed — 95 pages",
    project_id: "p4", pages_crawled: 95, max_pages: 500,
    score_performance: 91, score_accessibility: 95, score_best_practices: 96, score_seo: 92,
    lcp_ms: 1800, inp_ms: 90, cls: 0.03, celery_task_id: null,
    created_at: "2026-04-15T09:00:00Z", completed_at: "2026-04-15T09:18:00Z",
  },
  {
    id: "a5", url: "https://retailhub.com", status: "failed", status_message: "Timeout after 30 min",
    project_id: "p5", pages_crawled: 0, max_pages: 500,
    score_performance: null, score_accessibility: null, score_best_practices: null, score_seo: null,
    lcp_ms: null, inp_ms: null, cls: null, celery_task_id: null,
    created_at: "2026-04-19T16:00:00Z", completed_at: null,
  },
];

export const MOCK_ISSUES: SEOIssue[] = [
  { id: "i1", page_url: "/about", severity: "critical", category: "title", message: "Page is missing a <title> tag", pages_affected: 1 },
  { id: "i2", page_url: "/blog", severity: "critical", category: "meta_description", message: "Page is missing a meta description", pages_affected: 3 },
  { id: "i3", page_url: "/services", severity: "critical", category: "missing_h1", message: "Page is missing an H1 tag", pages_affected: 2 },
  { id: "i4", page_url: "/contact", severity: "critical", category: "canonical", message: "Page is missing a canonical URL", pages_affected: 5 },
  { id: "i5", page_url: "(multiple)", severity: "critical", category: "duplicate_title", message: "Duplicate title found on 4 pages", pages_affected: 4 },
  { id: "i6", page_url: "/blog/post-1", severity: "warning", category: "title_length", message: "Title tag is too long (78 chars, max 60)", pages_affected: 8 },
  { id: "i7", page_url: "(multiple)", severity: "warning", category: "image_alt", message: "12 images missing alt text", pages_affected: 6 },
  { id: "i8", page_url: "(multiple)", severity: "warning", category: "image_dimensions", message: "8 images missing width/height (CLS risk)", pages_affected: 4 },
  { id: "i9", page_url: "/pricing", severity: "warning", category: "thin_content", message: "Thin content — 120 words (min 300)", pages_affected: 3 },
  { id: "i10", page_url: "(multiple)", severity: "warning", category: "heading_hierarchy", message: "Heading hierarchy skips (H1 → H3)", pages_affected: 5 },
  { id: "i11", page_url: "(multiple)", severity: "warning", category: "open_graph", message: "Missing Open Graph meta tags", pages_affected: 12 },
  { id: "i12", page_url: "(site-wide)", severity: "info", category: "twitter_card", message: "Missing Twitter Card meta tags", pages_affected: 48 },
  { id: "i13", page_url: "(site-wide)", severity: "info", category: "breadcrumb_schema", message: "No BreadcrumbList structured data", pages_affected: 48 },
  { id: "i14", page_url: "(multiple)", severity: "info", category: "generic_anchor_text", message: "6 links use 'click here' or 'read more'", pages_affected: 4 },
];

export const MOCK_AUDIT_DETAIL: AuditDetail = {
  ...MOCK_AUDITS[0],
  issues: MOCK_ISSUES,
  core_web_vitals: {
    lcp_ms: 2400, inp_ms: 180, cls: 0.08,
    lcp_rating: "good", inp_rating: "good", cls_rating: "good",
  },
  site_structure: {
    total_pages: 48, max_depth: 4, broken_links: 3,
    redirect_chains: 2, orphan_pages: 5, avg_load_time_ms: 1850,
  },
};

export const MOCK_CLIENTS: Client[] = [
  {
    id: "c1", name: "Axelerant", domain: "axelerant.com", audit_count: 12,
    last_audit_date: "2026-04-18T10:42:00Z", avg_seo_score: 85, score_trend: "up",
    created_at: "2026-01-15T00:00:00Z",
  },
  {
    id: "c2", name: "Acme Corp", domain: "acme-corp.com", audit_count: 8,
    last_audit_date: "2026-04-17T14:25:00Z", avg_seo_score: 54, score_trend: "down",
    created_at: "2026-02-10T00:00:00Z",
  },
  {
    id: "c3", name: "Greenfield", domain: "greenfield.io", audit_count: 3,
    last_audit_date: "2026-04-10T12:00:00Z", avg_seo_score: 72, score_trend: "stable",
    created_at: "2026-03-05T00:00:00Z",
  },
  {
    id: "c4", name: "TechStart", domain: "techstart.dev", audit_count: 5,
    last_audit_date: "2026-04-15T09:18:00Z", avg_seo_score: 92, score_trend: "up",
    created_at: "2026-02-20T00:00:00Z",
  },
];

export const MOCK_REPORTS: Report[] = [
  { id: "r1", audit_id: "a1", client_name: "Axelerant", url: "https://axelerant.com", file_url: "#", format: "pdf", created_at: "2026-04-18T10:42:00Z", file_size_bytes: 2_450_000 },
  { id: "r2", audit_id: "a2", client_name: "Acme Corp", url: "https://acme-corp.com", file_url: "#", format: "pdf", created_at: "2026-04-17T14:25:00Z", file_size_bytes: 3_100_000 },
  { id: "r3", audit_id: "a4", client_name: "TechStart", url: "https://techstart.dev", file_url: "#", format: "pdf", created_at: "2026-04-15T09:18:00Z", file_size_bytes: 1_800_000 },
];

// Historical scores for trend chart
export const MOCK_SCORE_HISTORY = [
  { date: "Jan 2026", seo: 62, performance: 55, accessibility: 70 },
  { date: "Feb 2026", seo: 68, performance: 60, accessibility: 75 },
  { date: "Mar 2026", seo: 74, performance: 65, accessibility: 82 },
  { date: "Apr 2026", seo: 85, performance: 72, accessibility: 88 },
];
