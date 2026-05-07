"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Search, Loader2 } from "lucide-react";

export function HeroAuditForm() {
  const [url, setUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!url.trim()) return;

    let normalizedUrl = url.trim();
    if (!normalizedUrl.startsWith("http")) {
      normalizedUrl = `https://${normalizedUrl}`;
    }

    setLoading(true);
    router.push(`/quick-audit?url=${encodeURIComponent(normalizedUrl)}`);
  };

  return (
    <form onSubmit={handleSubmit} className="mt-10 flex items-center justify-center gap-3 max-w-xl mx-auto">
      <div className="relative flex-1">
        <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-500" />
        <input
          type="text"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder="Enter a URL to audit..."
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
        ) : (
          "Run Free Audit"
        )}
      </button>
    </form>
  );
}
