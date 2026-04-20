"use client";

import Link from "next/link";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useAudits } from "@/hooks/use-audits";
import { cn } from "@/lib/utils";
import type { AuditStatus } from "@/types/audit";

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
                    <th className="px-5 py-3 text-left font-medium text-muted-foreground">Perf</th>
                    <th className="px-5 py-3 text-left font-medium text-muted-foreground hidden md:table-cell">Date</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {audits.map((audit) => (
                    <tr key={audit.id} className="hover:bg-muted/30 transition-colors">
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
                      <td className="px-5 py-3.5">
                        <ScoreCell score={audit.score_performance} />
                      </td>
                      <td className="px-5 py-3.5 text-muted-foreground hidden md:table-cell">
                        {new Date(audit.created_at).toLocaleDateString()}
                      </td>
                    </tr>
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
