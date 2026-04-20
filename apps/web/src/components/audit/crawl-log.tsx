"use client";

import { useEffect, useRef } from "react";
import { Loader2, Terminal } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuditPages, type CrawledPageEntry } from "@/hooks/use-audits";
import type { AuditStatus } from "@/types/audit";

interface CrawlLogProps {
  auditId: string;
  status: AuditStatus;
  statusMessage: string | null;
  pagesCrawled: number;
  maxPages: number;
}

export function CrawlLog({ auditId, status, statusMessage, pagesCrawled, maxPages }: CrawlLogProps) {
  const isActive = status === "crawling" || status === "analyzing" || status === "pending";
  const { data: pages } = useAuditPages(auditId, true);
  const scrollRef = useRef<HTMLDivElement>(null);
  const userScrolledUp = useRef(false);

  // Track if user has scrolled up manually
  const handleScroll = () => {
    if (!scrollRef.current) return;
    const { scrollTop, scrollHeight, clientHeight } = scrollRef.current;
    // Consider "at bottom" if within 40px of the end
    userScrolledUp.current = scrollHeight - scrollTop - clientHeight > 40;
  };

  // Auto-scroll only if user hasn't scrolled up
  useEffect(() => {
    if (scrollRef.current && !userScrolledUp.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [pages?.length, statusMessage]);

  // Build log lines from real data
  const lines = buildLogLines(status, statusMessage, pagesCrawled, maxPages, pages ?? []);

  return (
    <div className="rounded-lg overflow-hidden border border-gray-800">
      {/* Title bar */}
      <div className="flex items-center justify-between bg-brand-navy px-5 py-2.5 border-b border-white/10">
        <div className="flex items-center gap-2">
          <Terminal className="h-4 w-4 text-brand-orange" />
          <span className="text-sm font-semibold text-white">Crawl Log</span>
        </div>
        <div className="flex items-center gap-2">
          {isActive && <Loader2 className="h-3.5 w-3.5 animate-spin text-brand-orange" />}
          <span className="text-xs text-gray-400 font-mono">
            {pagesCrawled}/{maxPages} pages
          </span>
        </div>
      </div>

      {/* Terminal body */}
      <div
        ref={scrollRef}
        className="bg-[#1e293b] p-5 max-h-96 overflow-y-auto font-mono text-sm leading-7"
        onScroll={handleScroll}
      >
        {lines.map((line, i) => (
          <div key={i} className="whitespace-nowrap">
            <span className="text-slate-500">{line.timestamp}</span>
            {" "}
            <span className={cn(
              "font-bold",
              line.level === "info" && "text-sky-400",
              line.level === "debug" && "text-slate-400",
              line.level === "warn" && "text-amber-400",
              line.level === "error" && "text-red-400",
              line.level === "success" && "text-emerald-400",
            )}>
              {line.level.toUpperCase().padEnd(7)}
            </span>
            {" "}
            <span className="text-slate-200">{line.message}</span>
            {line.detail && (
              <span className="text-slate-400"> {line.detail}</span>
            )}
          </div>
        ))}
        {isActive && (
          <div className="whitespace-nowrap">
            <span className="text-brand-orange animate-pulse">_</span>
          </div>
        )}
      </div>
    </div>
  );
}

interface LogLine {
  timestamp: string;
  level: "info" | "debug" | "warn" | "error" | "success";
  message: string;
  detail?: string;
}

function formatTime(date?: Date): string {
  const d = date ?? new Date();
  return d.toISOString().replace("T", " ").substring(0, 23) + "Z";
}

function buildLogLines(
  status: AuditStatus,
  statusMessage: string | null,
  pagesCrawled: number,
  maxPages: number,
  pages: CrawledPageEntry[],
): LogLine[] {
  const lines: LogLine[] = [];
  const now = formatTime();

  // Initial lines
  lines.push({
    timestamp: now,
    level: "info",
    message: "Audit initialized",
    detail: `max_pages=${maxPages}`,
  });

  if (status === "pending") {
    lines.push({ timestamp: now, level: "info", message: "Waiting for worker to pick up task..." });
    return lines;
  }

  lines.push({ timestamp: now, level: "info", message: "Loading robots.txt..." });
  lines.push({ timestamp: now, level: "info", message: "Discovering sitemap.xml..." });
  lines.push({ timestamp: now, level: "info", message: "Starting crawl..." });

  // One line per crawled page
  for (const page of pages) {
    const statusCode = page.status_code ?? 0;
    const isOk = statusCode > 0 && statusCode < 400;
    const isBroken = statusCode >= 400;
    const loadTime = page.load_time_ms != null ? `${(page.load_time_ms / 1000).toFixed(1)}s` : "—";
    const path = page.url.replace(/^https?:\/\/[^/]+/, "") || "/";

    lines.push({
      timestamp: now,
      level: isBroken ? "error" : "info",
      message: `[${statusCode}] ${path}`,
      detail: `${loadTime} ${page.title ? `"${page.title.substring(0, 50)}"` : ""}`,
    });
  }

  // Status-specific lines at the end
  if (status === "crawling") {
    lines.push({
      timestamp: now,
      level: "debug",
      message: statusMessage || `Crawling... ${pagesCrawled} pages discovered`,
    });
  } else if (status === "analyzing") {
    lines.push({ timestamp: now, level: "info", message: `Crawl complete — ${pagesCrawled} pages` });
    lines.push({ timestamp: now, level: "info", message: "Running Lighthouse on sampled pages..." });
    lines.push({ timestamp: now, level: "info", message: "Detecting SEO issues (25 detectors)..." });
    lines.push({
      timestamp: now,
      level: "debug",
      message: statusMessage || "Analyzing...",
    });
  } else if (status === "completed") {
    lines.push({ timestamp: now, level: "info", message: `Crawl complete — ${pagesCrawled} pages` });
    lines.push({ timestamp: now, level: "success", message: statusMessage || "Audit completed successfully" });
  } else if (status === "failed") {
    lines.push({
      timestamp: now,
      level: "error",
      message: statusMessage || "Audit failed",
    });
  }

  return lines;
}
