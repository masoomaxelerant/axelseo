"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useAuth } from "@clerk/nextjs";
import Link from "next/link";
import {
  Loader2, Globe, AlertCircle, ArrowRight, Download, Search,
} from "lucide-react";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

interface QuickResult {
  url: string;
  scores: { seo: number; performance: number; accessibility: number; best_practices: number };
  issues_summary: { critical: number; warning: number; info: number; total: number };
  top_issues: Array<{ severity: string; category: string; message: string }>;
  cwv: { lcp_ms: number | null; inp_ms: number | null; cls: number | null };
  pages_crawled: number;
  audit_id?: string | null;
  saved?: boolean;
}

export default function QuickAuditPage() {
  return (
    <Suspense fallback={
      <main className="min-h-screen bg-brand-navy text-white flex items-center justify-center">
        <Loader2 className="h-8 w-8 text-brand-orange animate-spin" />
      </main>
    }>
      <QuickAuditContent />
    </Suspense>
  );
}

function QuickAuditContent() {
  const searchParams = useSearchParams();
  const url = searchParams.get("url");
  const { isSignedIn, getToken } = useAuth();
  const [result, setResult] = useState<QuickResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!url) { setError("No URL provided"); setLoading(false); return; }
    let cancelled = false;
    (async () => {
      try {
        // Pass auth token if logged in — backend will save results to DB
        const headers: Record<string, string> = { "Content-Type": "application/json" };
        if (isSignedIn) {
          const token = await getToken();
          if (token) headers["Authorization"] = `Bearer ${token}`;
        }

        const resp = await fetch(`${API_BASE}/api/v1/quick-audit`, {
          method: "POST",
          headers,
          body: JSON.stringify({ url }),
        });
        if (!resp.ok) {
          const body = await resp.json().catch(() => ({ detail: "Audit failed" }));
          throw new Error(body.detail || `HTTP ${resp.status}`);
        }
        if (!cancelled) setResult(await resp.json());
      } catch (e: any) {
        if (!cancelled) setError(e.message);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [url]);

  return (
    <main className="min-h-screen bg-brand-navy text-white">
      {/* Nav — changes based on auth */}
      <nav className="flex items-center justify-between px-6 py-4 max-w-7xl mx-auto">
        <Link href="/" className="font-display text-xl font-bold">
          <span className="text-brand-orange">Axel</span>SEO
        </Link>
        {isSignedIn ? (
          <Link href="/dashboard" className="rounded-md bg-brand-orange px-5 py-2 text-sm font-semibold transition-colors hover:bg-orange-600">
            Dashboard
          </Link>
        ) : (
          <Link href="/auth/sign-up" className="rounded-md bg-brand-orange px-5 py-2 text-sm font-semibold transition-colors hover:bg-orange-600">
            Sign Up Free
          </Link>
        )}
      </nav>

      <div className="max-w-4xl mx-auto px-6 py-12">
        {/* URL header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-white/10">
              <Globe className="h-5 w-5 text-brand-orange" />
            </div>
            <div>
              <h1 className="font-display text-xl font-bold">{url || "Quick Audit"}</h1>
              <p className="text-xs text-gray-400">Free single-page SEO analysis</p>
            </div>
          </div>
          {result && (
            <DownloadPdfButton result={result} />
          )}
        </div>

        {/* Loading */}
        {loading && (
          <div className="flex flex-col items-center py-20">
            <Loader2 className="h-10 w-10 text-brand-orange animate-spin mb-4" />
            <p className="text-gray-300 font-medium">Analyzing page...</p>
            <p className="text-xs text-gray-500 mt-2">This usually takes 15-30 seconds</p>
          </div>
        )}

        {/* Error */}
        {error && (
          <div className="flex flex-col items-center py-20">
            <AlertCircle className="h-10 w-10 text-red-400 mb-4" />
            <p className="text-red-300 font-medium">Audit failed</p>
            <p className="text-sm text-gray-400 mt-2">{error}</p>
            <Link href="/" className="mt-6 text-sm text-brand-orange hover:underline">Try another URL</Link>
          </div>
        )}

        {/* Results */}
        {result && (
          <div className="space-y-8">
            {/* Score gauges */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-6">
              <ScoreCircle score={result.scores.seo} label="SEO" />
              <ScoreCircle score={result.scores.performance} label="Performance" />
              <ScoreCircle score={result.scores.accessibility} label="Accessibility" />
              <ScoreCircle score={result.scores.best_practices} label="Best Practices" />
            </div>

            {/* CWV */}
            {(result.cwv.lcp_ms || result.cwv.cls != null) && (
              <div className="grid grid-cols-3 gap-4">
                <MetricCard label="LCP" value={result.cwv.lcp_ms ? `${(result.cwv.lcp_ms / 1000).toFixed(1)}s` : "--"} target="< 2.5s" good={result.cwv.lcp_ms != null && result.cwv.lcp_ms <= 2500} />
                <MetricCard label="INP" value={result.cwv.inp_ms ? `${Math.round(result.cwv.inp_ms)}ms` : "--"} target="< 200ms" good={result.cwv.inp_ms != null && result.cwv.inp_ms <= 200} />
                <MetricCard label="CLS" value={result.cwv.cls != null ? result.cwv.cls.toFixed(2) : "--"} target="< 0.1" good={result.cwv.cls != null && result.cwv.cls <= 0.1} />
              </div>
            )}

            {/* Issues */}
            <div className="rounded-xl border border-white/10 bg-white/[0.02] p-6">
              <h3 className="font-display text-base font-semibold mb-4">Issues Found ({result.issues_summary.total})</h3>
              <div className="flex gap-4 mb-6">
                <span className="flex items-center gap-1.5 text-sm"><span className="h-2.5 w-2.5 rounded-full bg-red-500" /> {result.issues_summary.critical} Critical</span>
                <span className="flex items-center gap-1.5 text-sm"><span className="h-2.5 w-2.5 rounded-full bg-amber-500" /> {result.issues_summary.warning} Warnings</span>
                <span className="flex items-center gap-1.5 text-sm"><span className="h-2.5 w-2.5 rounded-full bg-blue-400" /> {result.issues_summary.info} Info</span>
              </div>
              {result.top_issues.length > 0 && (
                <div className="space-y-2">
                  {result.top_issues.slice(0, 8).map((issue, i) => (
                    <div key={i} className="flex items-start gap-3 py-2 border-t border-white/5 first:border-0">
                      <span className={`mt-1 h-2 w-2 rounded-full shrink-0 ${
                        issue.severity === "error" || issue.severity === "critical" ? "bg-red-500" :
                        issue.severity === "warning" ? "bg-amber-500" : "bg-blue-400"
                      }`} />
                      <div>
                        <p className="text-sm text-gray-200">{issue.message.split(" — ")[0]}</p>
                        <p className="text-xs text-gray-500 mt-0.5">{issue.category.replace(/_/g, " ")}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Saved audit notice */}
            {result.saved && result.audit_id && (
              <div className="rounded-xl border border-green-500/30 bg-green-500/5 p-4 flex items-center justify-between">
                <p className="text-sm text-green-300">Audit saved to your dashboard</p>
                <Link href={`/dashboard/audits/${result.audit_id}`} className="text-sm font-medium text-green-400 hover:text-green-300 transition-colors">
                  View full details →
                </Link>
              </div>
            )}

            {/* CTA — different for logged-in vs anonymous */}
            {isSignedIn ? (
              <div className="rounded-xl border border-brand-orange/30 bg-brand-orange/5 p-8 text-center">
                <h3 className="font-display text-xl font-bold mb-2">Run a full site audit</h3>
                <p className="text-sm text-gray-400 mb-6">
                  Crawl the entire site (up to 10,000 pages), get detailed issue breakdowns,
                  and download a branded PDF report.
                </p>
                <div className="flex items-center justify-center gap-4">
                  <Link
                    href={`/dashboard/audits/new?url=${encodeURIComponent(url || "")}`}
                    className="inline-flex items-center gap-2 rounded-lg bg-brand-orange px-6 py-3 font-semibold text-white transition-colors hover:bg-orange-600"
                  >
                    Full Site Audit <ArrowRight className="h-4 w-4" />
                  </Link>
                  <Link href="/dashboard" className="text-sm text-gray-400 hover:text-white transition-colors">
                    Go to Dashboard
                  </Link>
                </div>
              </div>
            ) : (
              <div className="rounded-xl border border-brand-orange/30 bg-brand-orange/5 p-8 text-center">
                <h3 className="font-display text-xl font-bold mb-2">Want the full picture?</h3>
                <p className="text-sm text-gray-400 mb-6">
                  Sign up free to crawl the entire site (up to 10,000 pages), get detailed fix guidance,
                  download branded PDF reports, and track scores over time.
                </p>
                <div className="flex items-center justify-center gap-4">
                  <Link href="/auth/sign-up" className="inline-flex items-center gap-2 rounded-lg bg-brand-orange px-6 py-3 font-semibold text-white transition-colors hover:bg-orange-600">
                    Sign Up Free <ArrowRight className="h-4 w-4" />
                  </Link>
                  <Link href="/" className="text-sm text-gray-400 hover:text-white transition-colors">
                    Audit another URL
                  </Link>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </main>
  );
}

function ScoreCircle({ score, label }: { score: number; label: string }) {
  const color = score >= 90 ? "text-green-400 border-green-400/30" : score >= 50 ? "text-amber-400 border-amber-400/30" : "text-red-400 border-red-400/30";
  return (
    <div className="flex flex-col items-center">
      <div className={`flex h-20 w-20 items-center justify-center rounded-full border-4 ${color}`}>
        <span className={`font-display text-2xl font-bold ${color.split(" ")[0]}`}>{Math.round(score)}</span>
      </div>
      <p className="text-xs text-gray-500 mt-2">{label}</p>
    </div>
  );
}

function MetricCard({ label, value, target, good }: { label: string; value: string; target: string; good: boolean }) {
  return (
    <div className="rounded-lg bg-white/5 border border-white/10 p-4 text-center">
      <p className={`font-display text-xl font-bold ${good ? "text-green-400" : "text-amber-400"}`}>{value}</p>
      <p className="text-xs text-gray-500 mt-1">{label}</p>
      <p className="text-[10px] text-gray-600">Target: {target}</p>
    </div>
  );
}

function DownloadPdfButton({ result }: { result: QuickResult }) {
  const [downloading, setDownloading] = useState(false);

  const handleDownload = async () => {
    setDownloading(true);
    try {
      const resp = await fetch(`${API_BASE}/api/v1/quick-audit/pdf`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(result),
      });
      if (!resp.ok) throw new Error("PDF generation failed");

      const blob = await resp.blob();
      const url = URL.createObjectURL(blob);
      const filename = resp.headers.get("Content-Disposition")?.match(/filename="(.+)"/)?.[1] || "report.pdf";
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      a.click();
      URL.revokeObjectURL(url);
    } catch (e) {
      alert("Failed to generate PDF. Please try again.");
    } finally {
      setDownloading(false);
    }
  };

  return (
    <button
      onClick={handleDownload}
      disabled={downloading}
      className="inline-flex items-center gap-2 rounded-lg border border-white/20 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-white/10 disabled:opacity-50"
    >
      {downloading ? (
        <><Loader2 className="h-3.5 w-3.5 animate-spin" /> Generating...</>
      ) : (
        <><Download className="h-3.5 w-3.5" /> Download PDF</>
      )}
    </button>
  );
}
