"use client";

import Link from "next/link";
import { Plus, RefreshCw, Trash2, StopCircle, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useAudits, useDeleteAudit, useRetryAudit, useCancelAudit, useExportPdf } from "@/hooks/use-audits";
import { cn } from "@/lib/utils";
import type { Audit, AuditStatus } from "@/types/audit";

const badgeVariant: Record<AuditStatus, "default" | "success" | "warning" | "destructive" | "outline"> = {
  pending: "outline", crawling: "warning", analyzing: "warning", completed: "success", failed: "destructive",
};

export default function AuditsPage() {
  const { data: audits, isLoading } = useAudits();

  return (
    <div>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold text-foreground">Audits</h1>
          <p className="text-sm text-muted-foreground mt-1">View and manage all SEO audits</p>
        </div>
        <Link href="/dashboard/audits/new">
          <Button><Plus className="mr-2 h-4 w-4" /> New Audit</Button>
        </Link>
      </div>

      <div className="mt-6">
        {isLoading ? (
          <div className="space-y-3">
            {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-14 rounded-lg" />)}
          </div>
        ) : !audits?.length ? (
          <Card>
            <CardContent className="flex flex-col items-center py-16">
              <p className="font-display font-semibold text-foreground">No audits yet</p>
              <p className="text-sm text-muted-foreground mt-1 mb-4">Run your first SEO audit</p>
              <Link href="/dashboard/audits/new"><Button>Run First Audit</Button></Link>
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardContent className="p-0">
              <table className="w-full text-sm" role="table">
                <thead>
                  <tr className="border-b bg-muted/50">
                    <th className="px-5 py-3 text-left font-medium text-muted-foreground">URL</th>
                    <th className="px-5 py-3 text-left font-medium text-muted-foreground">Status</th>
                    <th className="px-5 py-3 text-left font-medium text-muted-foreground hidden sm:table-cell">Pages</th>
                    <th className="px-5 py-3 text-left font-medium text-muted-foreground">SEO</th>
                    <th className="px-5 py-3 text-left font-medium text-muted-foreground hidden md:table-cell">Date</th>
                    <th className="px-5 py-3 text-right font-medium text-muted-foreground">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {audits.map((audit) => (
                    <AuditRow key={audit.id} audit={audit} />
                  ))}
                </tbody>
              </table>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}

function AuditRow({ audit }: { audit: Audit }) {
  const deleteAudit = useDeleteAudit();
  const retryAudit = useRetryAudit();
  const cancelAudit = useCancelAudit();
  const exportPdf = useExportPdf(audit.id);

  const isInProgress = audit.status === "pending" || audit.status === "crawling" || audit.status === "analyzing";
  const isDone = audit.status === "completed" || audit.status === "failed";

  return (
    <tr className="hover:bg-muted/30 transition-colors">
      <td className="px-5 py-3.5">
        <Link href={`/dashboard/audits/${audit.id}`} className="text-brand-orange hover:underline font-medium">
          {audit.url.replace(/^https?:\/\//, "")}
        </Link>
      </td>
      <td className="px-5 py-3.5">
        <Badge variant={badgeVariant[audit.status]} className="text-[10px]">{audit.status}</Badge>
      </td>
      <td className="px-5 py-3.5 text-muted-foreground hidden sm:table-cell">{audit.pages_crawled}</td>
      <td className="px-5 py-3.5">
        <ScoreCell score={audit.score_seo} />
      </td>
      <td className="px-5 py-3.5 text-muted-foreground hidden md:table-cell">
        {new Date(audit.created_at).toLocaleDateString()}
      </td>
      <td className="px-5 py-3.5 text-right">
        <div className="flex items-center justify-end gap-1">
          {/* Cancel — shown for in-progress audits */}
          {isInProgress && (
            <Button
              variant="ghost"
              size="sm"
              onClick={(e) => { e.preventDefault(); cancelAudit.mutate(audit.id); }}
              disabled={cancelAudit.isPending}
              className="h-8 px-2 text-xs text-amber-600 hover:text-amber-800 hover:bg-amber-50"
              title="Cancel audit"
            >
              <StopCircle className="h-3.5 w-3.5" />
              <span className="ml-1 hidden lg:inline">Cancel</span>
            </Button>
          )}
          {/* Download — shown for completed audits */}
          {audit.status === "completed" && (
            <Button
              variant="ghost"
              size="sm"
              onClick={(e) => { e.preventDefault(); exportPdf.mutate(); }}
              disabled={exportPdf.isPending}
              className="h-8 px-2 text-xs text-brand-orange hover:text-orange-700 hover:bg-orange-50"
              title="Download PDF report"
            >
              {exportPdf.isPending ? (
                <RefreshCw className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Download className="h-3.5 w-3.5" />
              )}
              <span className="ml-1 hidden lg:inline">{exportPdf.isPending ? "..." : "Report"}</span>
            </Button>
          )}
          {/* Retry — shown for failed/completed */}
          {isDone && (
            <Button
              variant="ghost"
              size="sm"
              onClick={(e) => { e.preventDefault(); retryAudit.mutate(audit.id); }}
              disabled={retryAudit.isPending}
              className="h-8 px-2 text-xs"
              title="Retry audit"
            >
              <RefreshCw className={cn("h-3.5 w-3.5", retryAudit.isPending && "animate-spin")} />
              <span className="ml-1 hidden lg:inline">Retry</span>
            </Button>
          )}
          {/* Delete — always available */}
          <Button
            variant="ghost"
            size="sm"
            onClick={(e) => { e.preventDefault(); if (confirm(`Delete audit for ${audit.url}?`)) deleteAudit.mutate(audit.id); }}
            disabled={deleteAudit.isPending}
            className="h-8 px-2 text-xs text-red-500 hover:text-red-700 hover:bg-red-50"
            title="Delete audit"
          >
            <Trash2 className="h-3.5 w-3.5" />
            <span className="ml-1 hidden lg:inline">Delete</span>
          </Button>
        </div>
      </td>
    </tr>
  );
}

function ScoreCell({ score }: { score: number | null }) {
  if (score == null) return <span className="text-gray-300">--</span>;
  return (
    <span className={cn(
      "font-display font-bold",
      score >= 90 ? "text-green-500" : score >= 50 ? "text-amber-500" : "text-red-500"
    )}>
      {Math.round(score)}
    </span>
  );
}
