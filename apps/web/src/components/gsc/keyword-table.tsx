"use client";

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { GSCSnapshot } from "@/types/gsc";

interface KeywordTableProps {
  data: GSCSnapshot;
}

export function KeywordPerformanceCard({ data }: KeywordTableProps) {
  return (
    <div className="space-y-6">
      {/* Top Keywords */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="font-display text-base">Top Keywords</CardTitle>
              <CardDescription>
                {data.date_range_start} to {data.date_range_end} — Google Search Console
              </CardDescription>
            </div>
            <Badge variant="success" className="text-[10px]">Live Data</Badge>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/50">
                <th className="px-5 py-2.5 text-left font-medium text-muted-foreground">Keyword</th>
                <th className="px-5 py-2.5 text-left font-medium text-muted-foreground">Position</th>
                <th className="px-5 py-2.5 text-left font-medium text-muted-foreground hidden sm:table-cell">Impressions</th>
                <th className="px-5 py-2.5 text-left font-medium text-muted-foreground">Clicks</th>
                <th className="px-5 py-2.5 text-left font-medium text-muted-foreground hidden md:table-cell">CTR</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {data.top_queries.slice(0, 20).map((kw, i) => (
                <tr key={i} className="hover:bg-muted/30">
                  <td className="px-5 py-2.5 font-medium">{kw.query}</td>
                  <td className="px-5 py-2.5">
                    <span className={cn(
                      "font-display font-bold",
                      kw.position <= 3 ? "text-green-500" :
                      kw.position <= 10 ? "text-amber-500" : "text-red-500"
                    )}>
                      {kw.position.toFixed(1)}
                    </span>
                  </td>
                  <td className="px-5 py-2.5 text-muted-foreground hidden sm:table-cell">
                    {kw.impressions.toLocaleString()}
                  </td>
                  <td className="px-5 py-2.5">{kw.clicks.toLocaleString()}</td>
                  <td className="px-5 py-2.5 text-muted-foreground hidden md:table-cell">
                    {(kw.ctr * 100).toFixed(1)}%
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>

      {/* Opportunity Keywords */}
      {data.opportunity_queries.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="font-display text-base">
              Opportunity Keywords
              <span className="ml-2 text-xs font-normal text-muted-foreground">(Positions 11-20)</span>
            </CardTitle>
            <CardDescription>
              These keywords rank on page 2 — a small push could move them to page 1
            </CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/50">
                  <th className="px-5 py-2.5 text-left font-medium text-muted-foreground">Keyword</th>
                  <th className="px-5 py-2.5 text-left font-medium text-muted-foreground">Position</th>
                  <th className="px-5 py-2.5 text-left font-medium text-muted-foreground">Impressions</th>
                  <th className="px-5 py-2.5 text-left font-medium text-muted-foreground">Est. Clicks if Page 1</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {data.opportunity_queries.slice(0, 10).map((kw, i) => (
                  <tr key={i} className="hover:bg-muted/30">
                    <td className="px-5 py-2.5 font-medium">{kw.query}</td>
                    <td className="px-5 py-2.5">
                      <span className="font-display font-bold text-amber-500">
                        {kw.position.toFixed(1)}
                      </span>
                    </td>
                    <td className="px-5 py-2.5 text-muted-foreground">{kw.impressions.toLocaleString()}</td>
                    <td className="px-5 py-2.5">
                      <span className="text-green-600 font-medium">
                        ~{Math.round(kw.impressions * 0.05).toLocaleString()}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>
      )}

      {/* Device Breakdown */}
      {Object.keys(data.device_breakdown).length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="font-display text-base">Traffic by Device</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-3 gap-4">
              {Object.entries(data.device_breakdown).map(([device, stats]) => (
                <div key={device} className="text-center rounded-lg border p-4">
                  <p className="font-display text-xl font-bold text-foreground">
                    {stats.clicks.toLocaleString()}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {device.charAt(0).toUpperCase() + device.slice(1)} clicks
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {stats.impressions.toLocaleString()} impressions
                  </p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
