export type AuditStatus = "pending" | "crawling" | "analyzing" | "completed" | "failed";
export type Severity = "critical" | "error" | "warning" | "info";
export type CWVRating = "good" | "needs-improvement" | "poor";

export interface Audit {
  id: string;
  url: string;
  status: AuditStatus;
  status_message: string | null;
  project_id: string;
  pages_crawled: number;
  max_pages: number;
  score_performance: number | null;
  score_accessibility: number | null;
  score_best_practices: number | null;
  score_seo: number | null;
  lcp_ms: number | null;
  inp_ms: number | null;
  cls: number | null;
  desktop_scores?: {
    performance: number | null;
    accessibility: number | null;
    best_practices: number | null;
    seo: number | null;
    lcp_ms: number | null;
    inp_ms: number | null;
    cls: number | null;
  } | null;
  celery_task_id: string | null;
  created_at: string;
  completed_at: string | null;
}

export interface SEOIssue {
  id: string;
  page_url: string;
  severity: Severity;
  category: string;
  message: string;
  pages_affected?: number;
}

export interface CoreWebVitals {
  lcp_ms: number | null;
  inp_ms: number | null;
  cls: number | null;
  lcp_rating: CWVRating | null;
  inp_rating: CWVRating | null;
  cls_rating: CWVRating | null;
}

export interface SiteStructure {
  total_pages: number;
  max_depth: number;
  broken_links: number;
  redirect_chains: number;
  orphan_pages: number;
  avg_load_time_ms: number;
}

export interface AuditDetail extends Audit {
  issues: SEOIssue[];
  core_web_vitals: CoreWebVitals;
  site_structure: SiteStructure;
}
