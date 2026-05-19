"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@clerk/nextjs";
import { Search, Loader2, FileText, Globe } from "lucide-react";
import { cn } from "@/lib/utils";

type AuditMode = "single" | "site";

export function HeroAuditForm() {
  const [url, setUrl] = useState("");
  const [mode, setMode] = useState<AuditMode>("single");
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const { isSignedIn } = useAuth();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!url.trim()) return;

    let normalizedUrl = url.trim();
    if (!normalizedUrl.startsWith("http")) {
      normalizedUrl = `https://${normalizedUrl}`;
    }

    setLoading(true);

    if (mode === "site" && isSignedIn) {
      // Full site audit — go to dashboard (requires login)
      router.push(`/dashboard/audits/new?url=${encodeURIComponent(normalizedUrl)}`);
    } else {
      // Single page — public quick audit
      router.push(`/quick-audit?url=${encodeURIComponent(normalizedUrl)}`);
    }
  };

  return (
    <div className="mt-10 max-w-xl mx-auto">
      {/* Mode toggle */}
      <div className="flex items-center justify-center mb-4">
        <div className="flex items-center gap-1 rounded-lg bg-white/10 p-1">
          <button
            type="button"
            onClick={() => setMode("single")}
            className={cn(
              "inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-colors",
              mode === "single" ? "bg-white/20 text-white" : "text-gray-400 hover:text-white"
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
              mode === "site" ? "bg-white/20 text-white" : "text-gray-400 hover:text-white"
            )}
          >
            <Globe className="h-3 w-3" />
            Full Site
          </button>
        </div>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit} className="flex items-center gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-500" />
          <input
            type="text"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder={mode === "single" ? "Enter a page URL to audit..." : "Enter a site URL to crawl..."}
            className="w-full rounded-lg bg-white/10 border border-white/10 pl-11 pr-4 py-3.5 text-sm text-white placeholder:text-gray-500 focus:outline-none focus:border-brand-orange/50 focus:ring-1 focus:ring-brand-orange/30 transition-colors"
            required
            disabled={loading}
          />
        </div>
        <button
          type="submit"
          disabled={loading || !url.trim()}
          className="rounded-lg bg-brand-orange px-6 py-3.5 text-sm font-semibold text-white transition-colors hover:bg-orange-600 whitespace-nowrap disabled:opacity-50"
        >
          {loading ? (
            <span className="flex items-center gap-2"><Loader2 className="h-4 w-4 animate-spin" /> Analyzing...</span>
          ) : mode === "single" ? (
            "Audit Page"
          ) : (
            "Audit Site"
          )}
        </button>
      </form>

      {/* Hint text */}
      <p className="mt-2 text-center text-[11px] text-gray-500">
        {mode === "single"
          ? "Instant single-page SEO check — no login required"
          : isSignedIn
            ? "Full site crawl with detailed reports — up to 10,000 pages"
            : "Full site crawl requires a free account"
        }
      </p>
    </div>
  );
}
