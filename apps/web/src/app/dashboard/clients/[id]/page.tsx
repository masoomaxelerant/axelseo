"use client";

import { Suspense } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Globe, Calendar, BarChart3, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { ScoreGauge } from "@/components/audit/score-gauge";
import { TrendChart } from "@/components/charts/trend-chart";
import { ConnectGSCCard } from "@/components/gsc/connect-gsc-button";
import { KeywordPerformanceCard } from "@/components/gsc/keyword-table";
import { useClient } from "@/hooks/use-clients";
import { useGSCStatus, useGSCData } from "@/hooks/use-gsc";
import { MOCK_SCORE_HISTORY, MOCK_AUDITS } from "@/lib/mock-data";
import { cn } from "@/lib/utils";

export default function ClientDetailPage() {
  const params = useParams();
  const clientId = params.id as string;
  const { data: client, isLoading } = useClient(clientId);
  const { data: gscStatus } = useGSCStatus(clientId);
  const { data: gscData } = useGSCData(clientId);

  const audits = MOCK_AUDITS.slice(0, 3);

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-24 rounded-lg" />
        <Skeleton className="h-64 rounded-lg" />
      </div>
    );
  }

  if (!client) {
    return (
      <div className="flex flex-col items-center py-20">
        <p className="font-medium text-foreground">Client not found</p>
        <Link href="/dashboard/clients"><Button variant="outline" className="mt-4">Back to Clients</Button></Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Client Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <Link href="/dashboard/clients" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-2">
            <ArrowLeft className="h-3 w-3" /> Back to Clients
          </Link>
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-brand-navy text-white font-display font-bold text-lg">
              {client.name.charAt(0)}
            </div>
            <div>
              <h1 className="font-display text-xl font-bold text-foreground">{client.name}</h1>
              <div className="flex items-center gap-3 text-xs text-muted-foreground mt-0.5">
                <span className="flex items-center gap-1"><Globe className="h-3 w-3" />{client.domain}</span>
                <span className="flex items-center gap-1"><Calendar className="h-3 w-3" />Added {new Date(client.created_at).toLocaleDateString()}</span>
              </div>
            </div>
          </div>
        </div>
        <Link href="/dashboard/audits/new">
          <Button size="sm"><Plus className="mr-2 h-3 w-3" /> New Audit</Button>
        </Link>
      </div>

      {/* Google Search Console Connection */}
      <Suspense fallback={<Skeleton className="h-20 rounded-lg" />}>
        <ConnectGSCCard clientId={clientId} />
      </Suspense>

      {/* Keyword Performance (shows only when GSC is connected and has data) */}
      {gscData && <KeywordPerformanceCard data={gscData} />}

      {/* Trend Chart */}
      <TrendChart data={MOCK_SCORE_HISTORY} title={`${client.name} — Score Trend`} />

      {/* Recent Audits */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="font-display text-base">Recent Audits</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="divide-y">
            {audits.map((audit) => (
              <Link
                key={audit.id}
                href={`/dashboard/audits/${audit.id}`}
                className="flex items-center justify-between px-5 py-3.5 hover:bg-muted/30 transition-colors"
              >
                <div>
                  <p className="text-sm font-medium">{audit.url}</p>
                  <p className="text-xs text-muted-foreground">{new Date(audit.created_at).toLocaleDateString()}</p>
                </div>
                <div className="flex items-center gap-2">
                  {audit.score_seo != null && (
                    <span className={cn("font-display font-bold", audit.score_seo >= 90 ? "text-green-500" : audit.score_seo >= 50 ? "text-amber-500" : "text-red-500")}>
                      {Math.round(audit.score_seo)}
                    </span>
                  )}
                  <Badge variant={audit.status === "completed" ? "success" : "outline"} className="text-[10px]">{audit.status}</Badge>
                </div>
              </Link>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
