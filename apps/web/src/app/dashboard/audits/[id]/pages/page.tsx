"use client";

import { useState, useMemo } from "react";
import { useParams, useSearchParams } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Search, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuditPages, type CrawledPageEntry } from "@/hooks/use-audits";
import { cn } from "@/lib/utils";

const PAGE_SIZE = 50;

export default function AuditPagesPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const auditId = params.id as string;
  const filter = searchParams.get("filter"); // "broken", "slow", or null

  const { data: pages, isLoading } = useAuditPages(auditId, true);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(0);

  const filtered = useMemo(() => {
    if (!pages) return [];
    let result = pages;

    // Apply filter
    if (filter === "broken") {
      result = result.filter((p) => p.status_code != null && p.status_code >= 400);
    } else if (filter === "slow") {
      result = result.filter((p) => p.load_time_ms != null && p.load_time_ms > 3000);
    }

    // Apply search
    if (search) {
      const q = search.toLowerCase();
      result = result.filter(
        (p) => p.url.toLowerCase().includes(q) || (p.title && p.title.toLowerCase().includes(q))
      );
    }

    return result;
  }, [pages, filter, search]);

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);
  const paginated = filtered.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);

  const brokenCount = pages?.filter((p) => p.status_code != null && p.status_code >= 400).length ?? 0;
  const slowCount = pages?.filter((p) => p.load_time_ms != null && p.load_time_ms > 3000).length ?? 0;

  return (
    <div>
      {/* Header */}
      <Link
        href={`/dashboard/audits/${auditId}`}
        className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-3"
      >
        <ArrowLeft className="h-3 w-3" /> Back to Audit
      </Link>
      <h1 className="font-display text-2xl font-bold text-foreground">
        Crawled Pages
        <span className="text-muted-foreground font-normal text-base ml-2">({pages?.length ?? 0})</span>
      </h1>

      {/* Filters + Search */}
      <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2">
          <FilterChip href={`/dashboard/audits/${auditId}/pages`} active={!filter} label="All" count={pages?.length ?? 0} />
          <FilterChip href={`/dashboard/audits/${auditId}/pages?filter=broken`} active={filter === "broken"} label="Broken" count={brokenCount} variant="red" />
          <FilterChip href={`/dashboard/audits/${auditId}/pages?filter=slow`} active={filter === "slow"} label="Slow" count={slowCount} variant="amber" />
        </div>
        <div className="relative w-full sm:w-64">
          <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search URL or title..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(0); }}
            className="pl-9 h-9 text-sm"
          />
        </div>
      </div>

      {/* Table */}
      <div className="mt-4">
        {isLoading ? (
          <div className="space-y-2">
            {Array.from({ length: 8 }).map((_, i) => <Skeleton key={i} className="h-12 rounded-lg" />)}
          </div>
        ) : filtered.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center text-muted-foreground">
              {search ? "No pages match your search" : filter ? "No pages match this filter" : "No pages crawled"}
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardContent className="p-0">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/50">
                    <th className="px-4 py-2.5 text-left font-medium text-muted-foreground w-8">#</th>
                    <th className="px-4 py-2.5 text-left font-medium text-muted-foreground">URL</th>
                    <th className="px-4 py-2.5 text-left font-medium text-muted-foreground hidden md:table-cell">Title</th>
                    <th className="px-4 py-2.5 text-right font-medium text-muted-foreground w-16">Status</th>
                    <th className="px-4 py-2.5 text-right font-medium text-muted-foreground w-20 hidden sm:table-cell">Load</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {paginated.map((p, i) => {
                    const idx = page * PAGE_SIZE + i + 1;
                    const isOk = p.status_code != null && p.status_code < 400;
                    const isBroken = p.status_code != null && p.status_code >= 400;
                    const isSlow = p.load_time_ms != null && p.load_time_ms > 3000;

                    return (
                      <tr key={i} className="hover:bg-muted/30">
                        <td className="px-4 py-2 text-muted-foreground tabular-nums text-right">{idx}</td>
                        <td className="px-4 py-2">
                          <a
                            href={p.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 text-brand-orange hover:underline font-mono text-xs"
                          >
                            {p.url.replace(/^https?:\/\/[^/]+/, "")}
                            <ExternalLink className="h-2.5 w-2.5 opacity-50" />
                          </a>
                        </td>
                        <td className="px-4 py-2 text-xs text-muted-foreground truncate max-w-[200px] hidden md:table-cell">
                          {p.title || "—"}
                        </td>
                        <td className={cn(
                          "px-4 py-2 text-right font-mono text-xs tabular-nums",
                          isOk ? "text-green-600" : isBroken ? "text-red-600" : "text-gray-400"
                        )}>
                          {p.status_code ?? "—"}
                        </td>
                        <td className={cn(
                          "px-4 py-2 text-right font-mono text-xs tabular-nums hidden sm:table-cell",
                          isSlow ? "text-red-500" : "text-muted-foreground"
                        )}>
                          {p.load_time_ms != null ? `${(p.load_time_ms / 1000).toFixed(1)}s` : "—"}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex items-center justify-between border-t px-4 py-3">
                  <p className="text-xs text-muted-foreground">
                    {page * PAGE_SIZE + 1}–{Math.min((page + 1) * PAGE_SIZE, filtered.length)} of {filtered.length}
                  </p>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" disabled={page === 0} onClick={() => setPage(page - 1)}>Previous</Button>
                    <Button variant="outline" size="sm" disabled={page >= totalPages - 1} onClick={() => setPage(page + 1)}>Next</Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}

function FilterChip({ href, active, label, count, variant }: {
  href: string;
  active: boolean;
  label: string;
  count: number;
  variant?: "red" | "amber";
}) {
  return (
    <Link
      href={href}
      className={cn(
        "inline-flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs font-medium transition-colors",
        active ? "bg-brand-navy text-white" : "bg-muted text-muted-foreground hover:bg-muted/80"
      )}
    >
      {label}
      <span className={cn(
        "rounded-full px-1.5 py-0.5 text-[10px]",
        active ? "bg-white/20" :
        variant === "red" ? "bg-red-100 text-red-700" :
        variant === "amber" ? "bg-amber-100 text-amber-700" :
        "bg-background"
      )}>
        {count}
      </span>
    </Link>
  );
}
