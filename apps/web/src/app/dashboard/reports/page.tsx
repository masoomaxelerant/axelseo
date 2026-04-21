"use client";

import Link from "next/link";
import { Download, FileText, Calendar, BarChart3, RefreshCw, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useCompletedAudits } from "@/hooks/use-reports";
import { useExportPdf } from "@/hooks/use-audits";
import { cn } from "@/lib/utils";
import type { Audit } from "@/types/audit";

export default function ReportsPage() {
  const { data: audits, isLoading } = useCompletedAudits();

  return (
    <div>
      <div>
        <h1 className="font-display text-2xl font-bold text-foreground">Reports</h1>
        <p className="text-sm text-muted-foreground mt-1">Download PDF audit reports for completed audits</p>
      </div>

      <div className="mt-6">
        {isLoading ? (
          <div className="space-y-3">
            {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-16 rounded-lg" />)}
          </div>
        ) : !audits?.length ? (
          <Card>
            <CardContent className="flex flex-col items-center py-16">
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-orange-50 mb-4">
                <FileText className="h-7 w-7 text-brand-orange" />
              </div>
              <p className="font-display font-semibold">No reports available</p>
              <p className="text-sm text-muted-foreground mt-1 mb-4">Complete an audit to generate a report</p>
              <Link href="/dashboard/audits/new">
                <Button><Search className="mr-2 h-4 w-4" /> Run an Audit</Button>
              </Link>
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardContent className="p-0 divide-y">
              {audits.map((audit) => (
                <ReportRow key={audit.id} audit={audit} />
              ))}
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}

function ReportRow({ audit }: { audit: Audit }) {
  const exportPdf = useExportPdf(audit.id);
  const domain = audit.url.replace(/^https?:\/\//, "").replace(/\/$/, "");

  return (
    <div className="flex items-center justify-between px-5 py-4">
      <div className="flex items-center gap-4">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-red-50">
          <FileText className="h-5 w-5 text-red-500" />
        </div>
        <div>
          <Link href={`/dashboard/audits/${audit.id}`} className="text-sm font-medium hover:text-brand-orange transition-colors">
            {domain}
          </Link>
          <div className="flex items-center gap-3 text-xs text-muted-foreground mt-0.5">
            <span className="flex items-center gap-1">
              <Calendar className="h-3 w-3" />
              {new Date(audit.created_at).toLocaleDateString()}
            </span>
            <span className="flex items-center gap-1">
              <BarChart3 className="h-3 w-3" />
              {audit.pages_crawled} pages
            </span>
            {audit.score_seo != null && (
              <span className={cn(
                "font-display font-bold",
                audit.score_seo >= 90 ? "text-green-500" : audit.score_seo >= 50 ? "text-amber-500" : "text-red-500"
              )}>
                SEO: {Math.round(audit.score_seo)}
              </span>
            )}
          </div>
        </div>
      </div>
      <Button
        variant="outline"
        size="sm"
        onClick={() => exportPdf.mutate()}
        disabled={exportPdf.isPending}
      >
        {exportPdf.isPending ? (
          <><RefreshCw className="mr-2 h-3 w-3 animate-spin" /> Generating...</>
        ) : (
          <><Download className="mr-2 h-3 w-3" /> Download PDF</>
        )}
      </Button>
    </div>
  );
}
