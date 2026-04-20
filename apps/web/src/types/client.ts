export interface Client {
  id: string;
  name: string;
  domain: string;
  logo_url?: string;
  notes?: string;
  audit_count: number;
  last_audit_date: string | null;
  avg_seo_score: number | null;
  score_trend: "up" | "down" | "stable" | null;
  created_at: string;
}

export interface ClientDetail extends Client {
  audits: import("./audit").Audit[];
}
