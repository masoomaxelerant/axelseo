"use client";

import Link from "next/link";
import { ArrowRight, Plus, Search, Users, BarChart3 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { ClientCard } from "@/components/clients/client-card";
import { NewAuditForm } from "@/components/audit/new-audit-form";
import { useAudits } from "@/hooks/use-audits";
import { useClients } from "@/hooks/use-clients";
import { cn } from "@/lib/utils";
import type { AuditStatus } from "@/types/audit";

const statusStyle: Record<AuditStatus, { variant: "default" | "success" | "warning" | "destructive" | "outline" }> = {
  pending: { variant: "outline" },
  crawling: { variant: "warning" },
  analyzing: { variant: "warning" },
  completed: { variant: "success" },
  failed: { variant: "destructive" },
};

export default function DashboardPage() {
  const { data: audits, isLoading: auditsLoading } = useAudits();
  const { data: clients, isLoading: clientsLoading } = useClients();

  const recentAudits = audits?.slice(0, 5);

  return (
    <div className="space-y-8">
      {/* Quick Audit */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="font-display text-lg">Quick Audit</CardTitle>
          <p className="text-sm text-muted-foreground">Enter a URL to start a new SEO audit</p>
        </CardHeader>
        <CardContent>
          <NewAuditForm />
        </CardContent>
      </Card>

      {/* Recent Audits */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-display text-lg font-semibold text-foreground">Recent Audits</h2>
          <Link href="/dashboard/audits">
            <Button variant="ghost" size="sm" className="text-muted-foreground">
              View all <ArrowRight className="ml-1 h-3 w-3" />
            </Button>
          </Link>
        </div>

        {auditsLoading ? (
          <div className="space-y-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-16 w-full rounded-lg" />
            ))}
          </div>
        ) : !recentAudits?.length ? (
          <Card>
            <CardContent className="flex flex-col items-center py-12">
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-orange-50 mb-4">
                <Search className="h-7 w-7 text-brand-orange" />
              </div>
              <p className="font-display font-semibold text-foreground">No audits yet</p>
              <p className="text-sm text-muted-foreground mt-1 mb-4">Run your first audit to see results here</p>
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardContent className="p-0">
              <div className="divide-y">
                {recentAudits.map((audit) => (
                  <Link
                    key={audit.id}
                    href={`/dashboard/audits/${audit.id}`}
                    className="flex items-center justify-between px-5 py-3.5 hover:bg-muted/50 transition-colors"
                  >
                    <div className="flex items-center gap-4 min-w-0">
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-foreground truncate">{audit.url}</p>
                        <p className="text-xs text-muted-foreground">
                          {new Date(audit.created_at).toLocaleDateString()} &middot; {audit.pages_crawled} pages
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 shrink-0">
                      {audit.score_seo != null && (
                        <span className={cn(
                          "font-display text-lg font-bold",
                          audit.score_seo >= 90 ? "text-green-500" :
                          audit.score_seo >= 50 ? "text-amber-500" : "text-red-500"
                        )}>
                          {Math.round(audit.score_seo)}
                        </span>
                      )}
                      <Badge variant={statusStyle[audit.status].variant} className="text-[10px]">
                        {audit.status}
                      </Badge>
                    </div>
                  </Link>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Client Projects */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-display text-lg font-semibold text-foreground">Client Projects</h2>
          <Link href="/dashboard/clients">
            <Button variant="ghost" size="sm" className="text-muted-foreground">
              View all <ArrowRight className="ml-1 h-3 w-3" />
            </Button>
          </Link>
        </div>

        {clientsLoading ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-32 w-full rounded-lg" />
            ))}
          </div>
        ) : !clients?.length ? (
          <Card>
            <CardContent className="flex flex-col items-center py-12">
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-orange-50 mb-4">
                <Users className="h-7 w-7 text-brand-orange" />
              </div>
              <p className="font-display font-semibold">No clients yet</p>
              <p className="text-sm text-muted-foreground mt-1 mb-4">Add your first client to organize audits</p>
              <Link href="/dashboard/clients">
                <Button><Plus className="mr-2 h-4 w-4" /> Add Client</Button>
              </Link>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {clients.slice(0, 6).map((client) => (
              <ClientCard key={client.id} client={client} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
