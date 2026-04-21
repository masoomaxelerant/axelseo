"use client";

import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { useState } from "react";
import { ArrowLeft, Download, RefreshCw, Trash2, StopCircle, Globe, Calendar, FileText, Smartphone, Monitor } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { ScoreGauge } from "@/components/audit/score-gauge";
import { ScoreBreakdown } from "@/components/audit/score-breakdown";
import { CoreWebVitalsCard } from "@/components/audit/core-web-vitals-card";
import { IssueTable } from "@/components/audit/issue-table";
import { SiteStructureCard } from "@/components/audit/site-structure-card";
import { AuditProgressBar } from "@/components/audit/audit-progress-bar";
import { CrawlLog } from "@/components/audit/crawl-log";
import { TrendChart } from "@/components/charts/trend-chart";
import { AuditKeywordsSection } from "@/components/gsc/audit-keywords-section";
import { useAudit, useRetryAudit, useDeleteAudit, useCancelAudit, useExportPdf } from "@/hooks/use-audits";
import { MOCK_SCORE_HISTORY } from "@/lib/mock-data";

export default function AuditDetailPage() {
  const params = useParams();
  const auditId = params.id as string;
  const { data: audit, isLoading, error } = useAudit(auditId);

  if (isLoading) return <AuditDetailSkeleton />;
  if (error) {
    return (
      <div className="flex flex-col items-center py-20">
        <p className="text-red-600 font-medium">Failed to load audit</p>
        <p className="text-sm text-muted-foreground mt-1">{error.message}</p>
        <Link href="/dashboard/audits"><Button variant="outline" className="mt-4">Back to Audits</Button></Link>
      </div>
    );
  }
  if (!audit) return null;

  const isInProgress = audit.status === "pending" || audit.status === "crawling" || audit.status === "analyzing";

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <Link href="/dashboard/audits" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-2">
            <ArrowLeft className="h-3 w-3" /> Back to Audits
          </Link>
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-brand-navy">
              <Globe className="h-5 w-5 text-white" />
            </div>
            <div>
              <h1 className="font-display text-xl font-bold text-foreground">{audit.url}</h1>
              <div className="flex items-center gap-3 text-xs text-muted-foreground mt-0.5">
                <span className="flex items-center gap-1">
                  <Calendar className="h-3 w-3" />
                  {new Date(audit.created_at).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })}
                </span>
                <span className="flex items-center gap-1">
                  <FileText className="h-3 w-3" />
                  {audit.pages_crawled} pages crawled
                </span>
              </div>
            </div>
          </div>
        </div>
        <AuditActions auditId={auditId} status={audit.status} isInProgress={isInProgress} />
      </div>

      {/* In-progress state */}
      {isInProgress && (
        <AuditProgressBar
          status={audit.status}
          statusMessage={audit.status_message}
          pagesCrawled={audit.pages_crawled}
        />
      )}

      {/* Crawl log — shown during crawling/analyzing */}
      {isInProgress && (
        <CrawlLog
          auditId={auditId}
          status={audit.status}
          statusMessage={audit.status_message}
          pagesCrawled={audit.pages_crawled}
          maxPages={audit.max_pages}
        />
      )}

      {/* Failed state */}
      {audit.status === "failed" && (
        <FailedAuditCard auditId={auditId} statusMessage={audit.status_message} />
      )}

      {/* Score gauges — only for completed audits */}
      {audit.status === "completed" && (
        <AuditScoresSection audit={audit} auditId={auditId}>

          {/* CWV + Site Structure */}
          <div className="grid gap-6 lg:grid-cols-2">
            {"core_web_vitals" in audit && audit.core_web_vitals && (
              <CoreWebVitalsCard vitals={audit.core_web_vitals} />
            )}
            {"site_structure" in audit && audit.site_structure && (
              <SiteStructureCard structure={audit.site_structure} auditId={auditId} />
            )}
          </div>

          {/* Detailed score breakdowns — like PageSpeed Insights */}
          {"issues" in audit && audit.issues && (
            <div className="space-y-6">
              <h2 className="font-display text-lg font-bold text-foreground">Detailed Analysis</h2>

              <div id="section-seo" className="scroll-mt-20">
                <ScoreBreakdown
                  score={audit.score_seo}
                  label="SEO"
                  sectionKey="seo"
                  issues={audit.issues}
                  description="These checks ensure that your page is following basic search engine optimization advice."
                />
              </div>

              <div id="section-performance" className="scroll-mt-20">
                <ScoreBreakdown
                  score={audit.score_performance}
                  label="Performance"
                  sectionKey="performance"
                  issues={audit.issues}
                  description="These metrics measure page load speed, visual stability, and resource optimization."
                />
              </div>

              <div id="section-accessibility" className="scroll-mt-20">
                <ScoreBreakdown
                  score={audit.score_accessibility}
                  label="Accessibility"
                  sectionKey="accessibility"
                  issues={audit.issues}
                  description="These checks highlight opportunities to improve the accessibility of your web app for all users."
                />
              </div>

              <div id="section-best_practices" className="scroll-mt-20">
                <ScoreBreakdown
                  score={audit.score_best_practices}
                  label="Best Practices"
                  sectionKey="best_practices"
                  issues={audit.issues}
                  description="These checks ensure your page follows web development best practices."
                />
              </div>
            </div>
          )}

          {/* All issues table */}
          {"issues" in audit && audit.issues && audit.issues.length > 0 && (
            <IssueTable issues={audit.issues} />
          )}

          {/* Keyword Performance (GSC) */}
          <AuditKeywordsSection clientId={audit.project_id} />

          {/* Trend chart */}
          <TrendChart data={MOCK_SCORE_HISTORY} title="Historical Trend" />
        </AuditScoresSection>
      )}
    </div>
  );
}

function AuditScoresSection({ audit, auditId, children }: { audit: any; auditId: string; children: React.ReactNode }) {
  const [device, setDevice] = useState<"mobile" | "desktop">("mobile");

  const ds = audit.desktop_scores;
  const hasDesktop = ds && ds.performance != null;

  // Pick scores based on selected device
  const scores = device === "desktop" && hasDesktop
    ? { performance: ds.performance, accessibility: ds.accessibility, best_practices: ds.best_practices, seo: ds.seo ?? audit.score_seo }
    : { performance: audit.score_performance, accessibility: audit.score_accessibility, best_practices: audit.score_best_practices, seo: audit.score_seo };

  const cwv = device === "desktop" && hasDesktop
    ? { lcp_ms: ds.lcp_ms, inp_ms: ds.inp_ms, cls: ds.cls }
    : { lcp_ms: audit.lcp_ms, inp_ms: audit.inp_ms, cls: audit.cls };

  return (
    <>
      {/* Device toggle + scores */}
      <Card>
        <CardContent className="py-6">
          {/* Mobile / Desktop toggle */}
          <div className="flex items-center justify-center mb-6">
            <div className="flex items-center gap-1 rounded-lg bg-muted p-1">
              <button
                onClick={() => setDevice("mobile")}
                className={`inline-flex items-center gap-1.5 rounded-md px-4 py-2 text-xs font-medium transition-colors ${
                  device === "mobile" ? "bg-white text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <Smartphone className="h-3.5 w-3.5" />
                Mobile
              </button>
              <button
                onClick={() => setDevice("desktop")}
                className={`inline-flex items-center gap-1.5 rounded-md px-4 py-2 text-xs font-medium transition-colors ${
                  device === "desktop"
                    ? "bg-white text-foreground shadow-sm"
                    : hasDesktop
                      ? "text-muted-foreground hover:text-foreground"
                      : "text-gray-300 cursor-not-allowed"
                }`}
                disabled={!hasDesktop}
                title={hasDesktop ? "Desktop results" : "Desktop data not available — run a new audit to get desktop scores"}
              >
                <Monitor className="h-3.5 w-3.5" />
                Desktop
                {!hasDesktop && <span className="text-[9px] ml-1 opacity-50">(N/A)</span>}
              </button>
            </div>
          </div>

          {/* Score gauges */}
          <div className="grid grid-cols-2 gap-6 sm:grid-cols-4">
            <a href="#section-seo" className="relative flex justify-center cursor-pointer hover:opacity-80 transition-opacity">
              <ScoreGauge score={scores.seo} label="SEO" size="lg" />
            </a>
            <a href="#section-performance" className="relative flex justify-center cursor-pointer hover:opacity-80 transition-opacity">
              <ScoreGauge score={scores.performance} label="Performance" size="lg" />
            </a>
            <a href="#section-accessibility" className="relative flex justify-center cursor-pointer hover:opacity-80 transition-opacity">
              <ScoreGauge score={scores.accessibility} label="Accessibility" size="lg" />
            </a>
            <a href="#section-best_practices" className="relative flex justify-center cursor-pointer hover:opacity-80 transition-opacity">
              <ScoreGauge score={scores.best_practices} label="Best Practices" size="lg" />
            </a>
          </div>
        </CardContent>
      </Card>

      {/* Rest of the content (CWV, breakdowns, issues, etc.) */}
      {children}
    </>
  );
}

function AuditActions({ auditId, status, isInProgress }: { auditId: string; status: string; isInProgress: boolean }) {
  const router = useRouter();
  const retryAudit = useRetryAudit();
  const deleteAudit = useDeleteAudit();
  const cancelAudit = useCancelAudit();
  const exportPdf = useExportPdf(auditId);

  return (
    <div className="flex items-center gap-2">
      {/* Cancel — for in-progress audits */}
      {isInProgress && (
        <Button
          variant="outline"
          size="sm"
          onClick={() => cancelAudit.mutate(auditId)}
          disabled={cancelAudit.isPending}
          className="border-amber-300 text-amber-600 hover:bg-amber-50"
        >
          <StopCircle className="mr-2 h-3 w-3" />
          {cancelAudit.isPending ? "Cancelling..." : "Cancel"}
        </Button>
      )}
      {/* Retry — for failed/completed */}
      {(status === "failed" || status === "completed") && (
        <Button
          variant="outline"
          size="sm"
          onClick={() => retryAudit.mutate(auditId)}
          disabled={retryAudit.isPending}
        >
          <RefreshCw className={`mr-2 h-3 w-3 ${retryAudit.isPending ? "animate-spin" : ""}`} />
          {retryAudit.isPending ? "Retrying..." : "Retry"}
        </Button>
      )}
      {/* Export PDF — for completed */}
      {status === "completed" && (
        <Button size="sm" onClick={() => exportPdf.mutate()} disabled={exportPdf.isPending}>
          {exportPdf.isPending ? (
            <><RefreshCw className="mr-2 h-3 w-3 animate-spin" /> Generating...</>
          ) : (
            <><Download className="mr-2 h-3 w-3" /> Export PDF</>
          )}
        </Button>
      )}
      {/* Delete — always */}
      <Button
        variant="ghost"
        size="sm"
        className="text-red-500 hover:text-red-700 hover:bg-red-50"
        onClick={() => {
          if (confirm("Delete this audit?")) {
            deleteAudit.mutate(auditId, {
              onSuccess: () => router.push("/dashboard/audits"),
            });
          }
        }}
        disabled={deleteAudit.isPending}
      >
        <Trash2 className="h-3 w-3" />
      </Button>
    </div>
  );
}

function FailedAuditCard({ auditId, statusMessage }: { auditId: string; statusMessage: string | null }) {
  const router = useRouter();
  const retryAudit = useRetryAudit();
  const deleteAudit = useDeleteAudit();

  return (
    <Card className="border-red-200">
      <CardContent className="flex flex-col items-center py-10">
        <div className="flex h-14 w-14 items-center justify-center rounded-full bg-red-50 mb-4">
          <span className="text-2xl">!</span>
        </div>
        <p className="font-display font-semibold text-red-700">Audit Failed</p>
        {statusMessage && (
          <p className="text-sm text-red-500 mt-1 text-center max-w-md">{statusMessage}</p>
        )}
        <div className="flex items-center gap-3 mt-6">
          <Button
            onClick={() => retryAudit.mutate(auditId)}
            disabled={retryAudit.isPending}
          >
            <RefreshCw className={`mr-2 h-4 w-4 ${retryAudit.isPending ? "animate-spin" : ""}`} />
            {retryAudit.isPending ? "Retrying..." : "Retry Audit"}
          </Button>
          <Button
            variant="outline"
            className="text-red-500 border-red-200 hover:bg-red-50"
            onClick={() => {
              if (confirm("Delete this audit?")) {
                deleteAudit.mutate(auditId, {
                  onSuccess: () => router.push("/dashboard/audits"),
                });
              }
            }}
            disabled={deleteAudit.isPending}
          >
            <Trash2 className="mr-2 h-4 w-4" />
            Delete
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

function AuditDetailSkeleton() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-7 w-64" />
          <Skeleton className="h-3 w-40" />
        </div>
        <div className="flex gap-2">
          <Skeleton className="h-9 w-28" />
          <Skeleton className="h-9 w-28" />
        </div>
      </div>
      <Skeleton className="h-48 w-full rounded-lg" />
      <div className="grid gap-6 lg:grid-cols-2">
        <Skeleton className="h-40 rounded-lg" />
        <Skeleton className="h-40 rounded-lg" />
      </div>
      <Skeleton className="h-96 w-full rounded-lg" />
    </div>
  );
}
