// Shared type definitions used across frontend, PDF generator, and API contracts

export type AuditStatus = "pending" | "crawling" | "analyzing" | "completed" | "failed";
export type IssueSeverity = "error" | "warning" | "info";
export type UserRole = "admin" | "member";

export interface LighthouseScores {
  performance: number;
  accessibility: number;
  bestPractices: number;
  seo: number;
}

export interface CoreWebVitals {
  lcp: number | null;
  inp: number | null;
  cls: number | null;
}
