"use client";

import { Download, FileText, Calendar, HardDrive } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useReports } from "@/hooks/use-reports";

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default function ReportsPage() {
  const { data: reports, isLoading } = useReports();

  return (
    <div>
      <div>
        <h1 className="font-display text-2xl font-bold text-foreground">Reports</h1>
        <p className="text-sm text-muted-foreground mt-1">Download generated PDF audit reports</p>
      </div>

      <div className="mt-6">
        {isLoading ? (
          <div className="space-y-3">
            {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-16 rounded-lg" />)}
          </div>
        ) : !reports?.length ? (
          <Card>
            <CardContent className="flex flex-col items-center py-16">
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-orange-50 mb-4">
                <FileText className="h-7 w-7 text-brand-orange" />
              </div>
              <p className="font-display font-semibold">No reports yet</p>
              <p className="text-sm text-muted-foreground mt-1">Reports are generated when audits complete</p>
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardContent className="p-0 divide-y">
              {reports.map((report) => (
                <div key={report.id} className="flex items-center justify-between px-5 py-4">
                  <div className="flex items-center gap-4">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-red-50">
                      <FileText className="h-5 w-5 text-red-500" />
                    </div>
                    <div>
                      <p className="text-sm font-medium">{report.client_name} — {report.url.replace(/^https?:\/\//, "")}</p>
                      <div className="flex items-center gap-3 text-xs text-muted-foreground mt-0.5">
                        <span className="flex items-center gap-1"><Calendar className="h-3 w-3" />{new Date(report.created_at).toLocaleDateString()}</span>
                        <span className="flex items-center gap-1"><HardDrive className="h-3 w-3" />{formatBytes(report.file_size_bytes)}</span>
                      </div>
                    </div>
                  </div>
                  <Button variant="outline" size="sm" asChild>
                    <a href={report.file_url} download aria-label={`Download ${report.client_name} report`}>
                      <Download className="mr-2 h-3 w-3" /> Download
                    </a>
                  </Button>
                </div>
              ))}
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
