"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Search, ChevronDown, FileText, Globe } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { useCreateAudit } from "@/hooks/use-audits";

type AuditMode = "single" | "site";

const PAGE_OPTIONS = [
  { value: 50, label: "50 pages", desc: "Quick scan" },
  { value: 200, label: "200 pages", desc: "Standard" },
  { value: 500, label: "500 pages", desc: "Deep crawl" },
  { value: 1000, label: "1,000 pages", desc: "Full site" },
  { value: 2000, label: "2,000 pages", desc: "Large site" },
  { value: 5000, label: "5,000 pages", desc: "Enterprise" },
  { value: 10000, label: "10,000 pages", desc: "Maximum" },
];

export function NewAuditForm() {
  const [url, setUrl] = useState("");
  const [mode, setMode] = useState<AuditMode>("site");
  const [maxPages, setMaxPages] = useState(500);
  const [showOptions, setShowOptions] = useState(false);
  const router = useRouter();
  const createAudit = useCreateAudit();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    let normalizedUrl = url.trim();
    if (!normalizedUrl.startsWith("http")) {
      normalizedUrl = `https://${normalizedUrl}`;
    }

    createAudit.mutate(
      { url: normalizedUrl, max_pages: mode === "single" ? 1 : maxPages },
      {
        onSuccess: (audit) => {
          router.push(`/dashboard/audits/${audit.id}`);
        },
      }
    );
  };

  const selectedOption = PAGE_OPTIONS.find((o) => o.value === maxPages) || PAGE_OPTIONS[2];

  return (
    <form onSubmit={handleSubmit} className="space-y-3" role="search" aria-label="Start new audit">
      {/* Mode toggle */}
      <div className="flex items-center gap-1 rounded-lg bg-muted p-1 w-fit">
        <button
          type="button"
          onClick={() => setMode("single")}
          className={cn(
            "inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-colors",
            mode === "single" ? "bg-white text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
          )}
        >
          <FileText className="h-3 w-3" />
          Single Page
        </button>
        <button
          type="button"
          onClick={() => setMode("site")}
          className={cn(
            "inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-colors",
            mode === "site" ? "bg-white text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
          )}
        >
          <Globe className="h-3 w-3" />
          Full Site
        </button>
      </div>

      {/* URL input + submit */}
      <div className="flex gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            type="text"
            placeholder={mode === "single" ? "Enter page URL (e.g. example.com/about)" : "Enter site URL (e.g. example.com)"}
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            className="pl-9"
            required
            disabled={createAudit.isPending}
            aria-label="Website URL"
          />
        </div>
        <Button type="submit" disabled={createAudit.isPending || !url.trim()}>
          {createAudit.isPending ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Starting...
            </>
          ) : mode === "single" ? (
            "Audit Page"
          ) : (
            "Audit Site"
          )}
        </Button>
      </div>

      {/* Crawl limit — only for site mode */}
      {mode === "site" && (
        <>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setShowOptions(!showOptions)}
              className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
            >
              <ChevronDown className={`h-3 w-3 transition-transform ${showOptions ? "rotate-180" : ""}`} />
              Crawl limit: <span className="font-medium text-foreground">{selectedOption.label}</span>
              <span className="text-muted-foreground">({selectedOption.desc})</span>
            </button>
          </div>

          {showOptions && (
            <div className="flex flex-wrap gap-2">
              {PAGE_OPTIONS.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => { setMaxPages(option.value); setShowOptions(false); }}
                  className={`rounded-md border px-3 py-1.5 text-xs font-medium transition-colors ${
                    maxPages === option.value
                      ? "border-brand-orange bg-orange-50 text-brand-orange"
                      : "border-gray-200 text-muted-foreground hover:border-gray-300"
                  }`}
                >
                  {option.label}
                  <span className="ml-1 text-[10px] font-normal opacity-60">{option.desc}</span>
                </button>
              ))}
            </div>
          )}
        </>
      )}

      {/* Single page hint */}
      {mode === "single" && (
        <p className="text-[11px] text-muted-foreground">
          Audits only this page — no crawling. Runs Lighthouse + on-page SEO checks. Results in under 30 seconds.
        </p>
      )}

      {createAudit.isError && (
        <p className="text-xs text-red-600">{createAudit.error.message}</p>
      )}
    </form>
  );
}
