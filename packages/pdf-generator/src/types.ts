export interface ReportInput {
  audit: AuditData;
  client: ClientData;
  consultant: ConsultantData;
  options?: ReportOptions;
}

export interface ReportOptions {
  includeAppendix?: boolean;
  whitelabel?: boolean;
}

export interface AuditData {
  id: string;
  url: string;
  auditDate: string;
  pagesCrawled: number;
  maxPages: number;

  scores: {
    seo: number;
    performance: number;
    accessibility: number;
    bestPractices: number;
  };

  coreWebVitals: {
    lcp: { value: number; rating: "good" | "needs-improvement" | "poor" };
    inp: { value: number; rating: "good" | "needs-improvement" | "poor" };
    cls: { value: number; rating: "good" | "needs-improvement" | "poor" };
  };

  issues: ReportIssue[];

  siteStructure: {
    totalPages: number;
    maxDepth: number;
    brokenLinks: number;
    redirectChains: number;
    orphanPages: number;
    avgLoadTimeMs: number;
  };

  keywords?: KeywordData[];
  pages?: PageData[];
}

export interface ReportIssue {
  severity: "critical" | "warning" | "info";
  category: string;
  message: string;
  howToFix: string;
  pagesAffected: number;
  exampleUrls?: string[];
}

export interface KeywordData {
  keyword: string;
  position: number;
  impressions: number;
  clicks: number;
  ctr: number;
}

export interface PageData {
  url: string;
  title: string | null;
  statusCode: number;
  score: number | null;
  loadTimeMs: number;
  issues: number;
}

export interface ClientData {
  name: string;
  domain: string;
  logoUrl?: string;
}

export interface ConsultantData {
  name: string;
  email: string;
  title?: string;
}
