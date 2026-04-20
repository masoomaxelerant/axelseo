"use client";

import { useParams } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Download, RefreshCw, Globe, Calendar, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { ScoreGauge } from "@/components/audit/score-gauge";
import { CoreWebVitalsCard } from "@/components/audit/core-web-vitals-card";
import { IssueTable } from "@/components/audit/issue-table";
import { SiteStructureCard } from "@/components/audit/site-structure-card";
import { AuditProgressBar } from "@/components/audit/audit-progress-bar";
import { TrendChart } from "@/components/charts/trend-chart";
import { AuditKeywordsSection } from "@/components/gsc/audit-keywords-section";
import { useAudit } from "@/hooks/use-audits";
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
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" disabled={isInProgress}>
            <RefreshCw className="mr-2 h-3 w-3" /> Run Again
          </Button>
          <Button size="sm" disabled={isInProgress || audit.status === "failed"}>
            <Download className="mr-2 h-3 w-3" /> Export PDF
          </Button>
        </div>
      </div>

      {/* In-progress state */}
      {isInProgress && (
        <AuditProgressBar
          status={audit.status}
          statusMessage={audit.status_message}
          pagesCrawled={audit.pages_crawled}
        />
      )}

      {/* Failed state */}
      {audit.status === "failed" && (
        <AuditProgressBar status="failed" statusMessage={audit.status_message} />
      )}

      {/* Score gauges — only for completed audits */}
      {audit.status === "completed" && (
        <>
          <Card>
            <CardContent className="py-6">
              <div className="grid grid-cols-2 gap-6 sm:grid-cols-4">
                <div className="relative flex justify-center">
                  <ScoreGauge score={audit.score_seo} label="SEO" size="lg" />
                </div>
                <div className="relative flex justify-center">
                  <ScoreGauge score={audit.score_performance} label="Performance" size="lg" />
                </div>
                <div className="relative flex justify-center">
                  <ScoreGauge score={audit.score_accessibility} label="Accessibility" size="lg" />
                </div>
                <div className="relative flex justify-center">
                  <ScoreGauge score={audit.score_best_practices} label="Best Practices" size="lg" />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* CWV + Site Structure */}
          <div className="grid gap-6 lg:grid-cols-2">
            {"core_web_vitals" in audit && audit.core_web_vitals && (
              <CoreWebVitalsCard vitals={audit.core_web_vitals} />
            )}
            {"site_structure" in audit && audit.site_structure && (
              <SiteStructureCard structure={audit.site_structure} />
            )}
          </div>

          {/* Issues */}
          {"issues" in audit && audit.issues && (
            <IssueTable issues={audit.issues} />
          )}

          {/* Keyword Performance (GSC) */}
          <AuditKeywordsSection clientId={audit.project_id} />

          {/* Trend chart */}
          <TrendChart data={MOCK_SCORE_HISTORY} title="Historical Trend" />
        </>
      )}
    </div>
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
