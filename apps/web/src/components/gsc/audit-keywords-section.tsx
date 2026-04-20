"use client";

import Link from "next/link";
import { Search, ExternalLink } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useGSCData } from "@/hooks/use-gsc";
import { cn } from "@/lib/utils";

interface AuditKeywordsSectionProps {
  clientId: string | undefined;
}

export function AuditKeywordsSection({ clientId }: AuditKeywordsSectionProps) {
  // If no client ID, we can't show GSC data
  if (!clientId) return null;

  return <GSCKeywordsInner clientId={clientId} />;
}

function GSCKeywordsInner({ clientId }: { clientId: string }) {
  const { data: gscData, isLoading } = useGSCData(clientId);

  if (isLoading) {
    return <Skeleton className="h-48 rounded-lg" />;
  }

  // No GSC data — show prompt to connect
  if (!gscData) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center py-10">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted mb-3">
            <Search className="h-6 w-6 text-muted-foreground" />
          </div>
          <p className="font-display font-semibold text-foreground">No keyword data</p>
          <p className="text-sm text-muted-foreground mt-1 text-center max-w-sm">
            Connect Google Search Console to see real keyword rankings, impressions, and click data.
          </p>
          <Link href={`/dashboard/clients/${clientId}`}>
            <Button variant="outline" size="sm" className="mt-4">
              <ExternalLink className="mr-2 h-3 w-3" />
              Go to Client Settings
            </Button>
          </Link>
        </CardContent>
      </Card>
    );
  }

  // Show top 10 keywords inline
  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="font-display text-base">Keyword Performance</CardTitle>
            <CardDescription>
              {gscData.date_range_start} to {gscData.date_range_end}
            </CardDescription>
          </div>
          <Badge variant="success" className="text-[10px]">Google Search Console</Badge>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-muted/50">
              <th className="px-5 py-2 text-left font-medium text-muted-foreground">Keyword</th>
              <th className="px-5 py-2 text-left font-medium text-muted-foreground">Position</th>
              <th className="px-5 py-2 text-left font-medium text-muted-foreground hidden sm:table-cell">Impressions</th>
              <th className="px-5 py-2 text-left font-medium text-muted-foreground">Clicks</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {gscData.top_queries.slice(0, 10).map((kw, i) => (
              <tr key={i}>
                <td className="px-5 py-2 font-medium">{kw.query}</td>
                <td className="px-5 py-2">
                  <span className={cn(
                    "font-display font-bold",
                    kw.position <= 3 ? "text-green-500" :
                    kw.position <= 10 ? "text-amber-500" : "text-red-500"
                  )}>
                    {kw.position.toFixed(1)}
                  </span>
                </td>
                <td className="px-5 py-2 text-muted-foreground hidden sm:table-cell">
                  {kw.impressions.toLocaleString()}
                </td>
                <td className="px-5 py-2">{kw.clicks.toLocaleString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {gscData.top_queries.length > 10 && (
          <div className="px-5 py-3 border-t">
            <Link href={`/dashboard/clients/${clientId}`}>
              <Button variant="ghost" size="sm" className="text-muted-foreground">
                View all {gscData.top_queries.length} keywords
              </Button>
            </Link>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
