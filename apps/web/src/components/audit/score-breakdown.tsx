"use client";

import { useState } from "react";
import { ChevronDown, ChevronRight, AlertCircle, AlertTriangle, Info, CheckCircle2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScoreGauge } from "@/components/audit/score-gauge";
import { cn } from "@/lib/utils";
import type { SEOIssue } from "@/types/audit";

// Map issue categories to the 4 Lighthouse-style sections
const CATEGORY_MAP: Record<string, string> = {
  title: "seo",
  meta_description: "seo",
  duplicate_title: "seo",
  duplicate_meta_description: "seo",
  missing_h1: "seo",
  multiple_h1: "seo",
  title_length: "seo",
  meta_description_length: "seo",
  canonical: "seo",
  heading_hierarchy: "seo",
  title_h1_match: "seo",
  schema_org: "seo",
  open_graph: "seo",
  twitter_card: "seo",
  breadcrumb_schema: "seo",
  structured_data: "seo",
  generic_anchor_text: "seo",
  thin_content: "seo",
  orphan_page: "seo",
  image_alt: "accessibility",
  image_dimensions: "performance",
  broken_link: "best_practices",
  redirect_chain: "best_practices",
  redirect: "best_practices",
  redirects: "best_practices",
  status_code: "best_practices",
  https: "best_practices",
  external_noopener: "best_practices",
  excessive_links: "best_practices",
  images: "accessibility",
  headings: "seo",
  social: "seo",
  performance: "performance",
};

interface ScoreBreakdownProps {
  score: number | null;
  label: string;
  sectionKey: string;
  issues: SEOIssue[];
  description: string;
}

export function ScoreBreakdown({ score, label, sectionKey, issues, description }: ScoreBreakdownProps) {
  const sectionIssues = issues.filter((i) => {
    const mapped = CATEGORY_MAP[i.category] || "seo";
    return mapped === sectionKey;
  });

  const errors = sectionIssues.filter((i) => i.severity === "error" || i.severity === "critical");
  const warnings = sectionIssues.filter((i) => i.severity === "warning");
  const infos = sectionIssues.filter((i) => i.severity === "info");
  const passed = sectionIssues.length === 0;

  return (
    <Card>
      <CardHeader className="pb-4">
        <div className="flex flex-col items-center text-center">
          <ScoreGauge score={score} label="" size="lg" />
          <h3 className="font-display text-lg font-bold text-foreground mt-2">{label}</h3>
          <p className="text-xs text-muted-foreground mt-1 max-w-md">{description}</p>
        </div>
      </CardHeader>
      <CardContent className="space-y-1 pt-0">
        {/* Errors */}
        {errors.length > 0 && (
          <IssueGroup
            title="Issues"
            icon={<AlertCircle className="h-4 w-4 text-red-500" />}
            count={errors.length}
            issues={errors}
            defaultOpen
          />
        )}
        {/* Warnings */}
        {warnings.length > 0 && (
          <IssueGroup
            title="Warnings"
            icon={<AlertTriangle className="h-4 w-4 text-amber-500" />}
            count={warnings.length}
            issues={warnings}
            defaultOpen={errors.length === 0}
          />
        )}
        {/* Info */}
        {infos.length > 0 && (
          <IssueGroup
            title="Informational"
            icon={<Info className="h-4 w-4 text-blue-500" />}
            count={infos.length}
            issues={infos}
          />
        )}
        {/* Passed */}
        {passed && (
          <div className="flex items-center gap-2 py-4 text-sm text-green-600">
            <CheckCircle2 className="h-4 w-4" />
            No issues found in this category
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function IssueGroup({ title, icon, count, issues, defaultOpen = false }: {
  title: string;
  icon: React.ReactNode;
  count: number;
  issues: SEOIssue[];
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);

  // Deduplicate issues by message (many pages can have the same issue)
  const deduped = deduplicateIssues(issues);

  return (
    <div className="border rounded-lg">
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center justify-between w-full px-4 py-3 text-left hover:bg-muted/50 transition-colors"
      >
        <div className="flex items-center gap-2">
          {icon}
          <span className="text-sm font-medium">{title}</span>
          <span className="text-xs text-muted-foreground">({count})</span>
        </div>
        {open ? <ChevronDown className="h-4 w-4 text-muted-foreground" /> : <ChevronRight className="h-4 w-4 text-muted-foreground" />}
      </button>
      {open && (
        <div className="border-t divide-y">
          {deduped.map((item, i) => (
            <IssueItem key={i} issue={item.issue} count={item.count} />
          ))}
        </div>
      )}
    </div>
  );
}

function IssueItem({ issue, count }: { issue: SEOIssue; count: number }) {
  const [expanded, setExpanded] = useState(false);

  // Split message into title and how-to-fix if it contains " — "
  const parts = issue.message.split(" — ");
  const title = parts[0];
  const howToFix = parts[1] || null;

  return (
    <div className="px-4 py-3">
      <button
        onClick={() => setExpanded(!expanded)}
        className="flex items-start gap-3 w-full text-left"
      >
        <span className={cn(
          "mt-0.5 h-2 w-2 rounded-full shrink-0",
          issue.severity === "error" ? "bg-red-500" :
          issue.severity === "warning" ? "bg-amber-500" : "bg-blue-400"
        )} />
        <div className="flex-1 min-w-0">
          <p className="text-sm text-foreground">{title}</p>
          {count > 1 && (
            <p className="text-xs text-muted-foreground mt-0.5">{count} pages affected</p>
          )}
        </div>
        {howToFix && (
          <ChevronDown className={cn("h-3.5 w-3.5 text-muted-foreground shrink-0 transition-transform", expanded && "rotate-180")} />
        )}
      </button>
      {expanded && howToFix && (
        <div className="ml-5 mt-2 pl-3 border-l-2 border-brand-orange/30">
          <p className="text-xs text-muted-foreground leading-relaxed">{howToFix}</p>
          {issue.page_url && issue.page_url !== "" && (
            <p className="text-xs text-muted-foreground mt-1">
              Page: <code className="bg-muted px-1 rounded text-[10px]">{issue.page_url}</code>
            </p>
          )}
        </div>
      )}
    </div>
  );
}

function deduplicateIssues(issues: SEOIssue[]): Array<{ issue: SEOIssue; count: number }> {
  const map = new Map<string, { issue: SEOIssue; count: number }>();
  for (const issue of issues) {
    const key = issue.message.split(" — ")[0];
    const existing = map.get(key);
    if (existing) {
      existing.count++;
    } else {
      map.set(key, { issue, count: 1 });
    }
  }
  return Array.from(map.values());
}
