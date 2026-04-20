"use client";

import { useState, useMemo } from "react";
import { ChevronDown, Filter, AlertTriangle, AlertCircle, Info } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import type { SEOIssue, Severity } from "@/types/audit";

const SEVERITY_CONFIG: Record<Severity, { icon: typeof AlertCircle; color: string; border: string; label: string; variant: "destructive" | "warning" | "outline" }> = {
  critical: { icon: AlertCircle, color: "text-red-600", border: "border-l-red-500", label: "Critical", variant: "destructive" },
  warning: { icon: AlertTriangle, color: "text-amber-600", border: "border-l-amber-500", label: "Warning", variant: "warning" },
  info: { icon: Info, color: "text-blue-500", border: "border-l-blue-400", label: "Info", variant: "outline" },
};

const PAGE_SIZE = 10;

interface IssueTableProps {
  issues: SEOIssue[];
}

export function IssueTable({ issues }: IssueTableProps) {
  const [filter, setFilter] = useState<Severity | "all">("all");
  const [page, setPage] = useState(0);

  const filtered = useMemo(() => {
    if (filter === "all") return issues;
    return issues.filter((i) => i.severity === filter);
  }, [issues, filter]);

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);
  const paginated = filtered.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);

  const counts = useMemo(() => ({
    critical: issues.filter((i) => i.severity === "critical").length,
    warning: issues.filter((i) => i.severity === "warning").length,
    info: issues.filter((i) => i.severity === "info").length,
  }), [issues]);

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="font-display text-base">
            Issues <span className="text-muted-foreground font-normal">({issues.length})</span>
          </CardTitle>
          <div className="flex items-center gap-2">
            <FilterButton label="All" count={issues.length} active={filter === "all"} onClick={() => { setFilter("all"); setPage(0); }} />
            <FilterButton label="Critical" count={counts.critical} active={filter === "critical"} onClick={() => { setFilter("critical"); setPage(0); }} severity="critical" />
            <FilterButton label="Warnings" count={counts.warning} active={filter === "warning"} onClick={() => { setFilter("warning"); setPage(0); }} severity="warning" />
            <FilterButton label="Info" count={counts.info} active={filter === "info"} onClick={() => { setFilter("info"); setPage(0); }} severity="info" />
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        {paginated.length === 0 ? (
          <div className="py-12 text-center text-muted-foreground">
            No issues found. Great job!
          </div>
        ) : (
          <div className="divide-y">
            {paginated.map((issue) => (
              <IssueRow key={issue.id} issue={issue} />
            ))}
          </div>
        )}
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-6 py-3 border-t">
            <p className="text-xs text-muted-foreground">
              Page {page + 1} of {totalPages}
            </p>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" disabled={page === 0} onClick={() => setPage(page - 1)}>Previous</Button>
              <Button variant="outline" size="sm" disabled={page >= totalPages - 1} onClick={() => setPage(page + 1)}>Next</Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function IssueRow({ issue }: { issue: SEOIssue }) {
  const cfg = SEVERITY_CONFIG[issue.severity];
  const Icon = cfg.icon;

  return (
    <div className={cn("flex items-start gap-4 px-6 py-4 border-l-4", cfg.border)}>
      <Icon className={cn("mt-0.5 h-4 w-4 shrink-0", cfg.color)} aria-hidden="true" />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <Badge variant={cfg.variant} className="text-[10px] px-1.5 py-0">{cfg.label}</Badge>
          <span className="text-xs text-muted-foreground truncate">{issue.category.replace(/_/g, " ")}</span>
        </div>
        <p className="mt-1 text-sm text-foreground">{issue.message}</p>
        <p className="mt-0.5 text-xs text-muted-foreground">
          {issue.page_url && issue.page_url !== "(site-wide)" && issue.page_url !== "(multiple)"
            ? <code className="bg-muted px-1 rounded">{issue.page_url}</code>
            : <span>{issue.page_url}</span>}
          {issue.pages_affected && issue.pages_affected > 1 && (
            <span className="ml-2">{issue.pages_affected} pages affected</span>
          )}
        </p>
      </div>
    </div>
  );
}

function FilterButton({ label, count, active, onClick, severity }: {
  label: string;
  count: number;
  active: boolean;
  onClick: () => void;
  severity?: Severity;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "inline-flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-medium transition-colors",
        active ? "bg-brand-navy text-white" : "bg-muted text-muted-foreground hover:bg-muted/80"
      )}
      aria-pressed={active}
    >
      {label}
      <span className={cn(
        "rounded-full px-1.5 py-0.5 text-[10px]",
        active ? "bg-white/20 text-white" : "bg-background text-foreground"
      )}>
        {count}
      </span>
    </button>
  );
}
