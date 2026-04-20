import React, { useState } from "react";
import { usePageSEO } from "~/src/hooks/use-page-seo";
import { useAuth } from "~/src/hooks/use-auth";
import { APP_BASE, apiFetch } from "~/src/lib/api";
import { LengthBar } from "~/src/components/length-bar";
import { SEOItem } from "~/src/components/seo-item";
import { Section } from "~/src/components/section";
import { OGPreview } from "~/src/components/og-preview";
import type { Project } from "~/src/types/page-data";

const STYLE: React.CSSProperties = {
  width: 380,
  maxHeight: 580,
  overflowY: "auto",
  fontFamily: "Inter, -apple-system, sans-serif",
  fontSize: 12,
  color: "#374151",
  background: "#FFFFFF",
};

export default function Popup() {
  const { data, loading, error } = usePageSEO();
  const { isLoggedIn, loading: authLoading } = useAuth();

  return (
    <div style={STYLE}>
      {/* Header */}
      <div style={{
        background: "#0D1B2A",
        padding: "12px 16px",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
      }}>
        <span style={{ fontFamily: "'Space Grotesk', sans-serif", fontWeight: 700, fontSize: 16 }}>
          <span style={{ color: "#FF5C00" }}>Axel</span>
          <span style={{ color: "#FFFFFF" }}>SEO</span>
        </span>
        <span style={{ fontSize: 9, color: "#6B7280" }}>
          {isLoggedIn ? "Connected" : "Not connected"}
        </span>
      </div>

      {/* Loading */}
      {loading && (
        <div style={{ padding: 40, textAlign: "center", color: "#9CA3AF" }}>
          <div style={{ fontSize: 20, marginBottom: 8 }}>Analyzing...</div>
          <div style={{ fontSize: 11 }}>Extracting SEO data from this page</div>
        </div>
      )}

      {/* Error */}
      {error && (
        <div style={{ padding: 20, textAlign: "center" }}>
          <div style={{ color: "#DC2626", fontWeight: 600, marginBottom: 4 }}>Cannot analyze</div>
          <div style={{ color: "#9CA3AF", fontSize: 11 }}>{error}</div>
        </div>
      )}

      {/* Results */}
      {data && (
        <div style={{ padding: "8px 16px 16px" }}>
          {/* URL bar */}
          <div style={{
            padding: "6px 10px",
            background: "#F3F4F6",
            borderRadius: 6,
            fontSize: 11,
            color: "#6B7280",
            marginBottom: 12,
            display: "flex",
            alignItems: "center",
            gap: 6,
          }}>
            <span style={{
              width: 8, height: 8, borderRadius: "50%",
              background: data.hasHttps ? "#22C55E" : "#EF4444",
              flexShrink: 0,
            }} />
            <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              {data.url}
            </span>
          </div>

          {/* Title & Meta */}
          <Section title="Title & Meta">
            <SEOItem
              label="Title"
              value={data.title}
              status={data.title ? (data.titleLength > 60 ? "warning" : data.titleLength < 30 ? "warning" : "good") : "error"}
            />
            <LengthBar value={data.titleLength} min={30} max={60} label="Title length" />

            <SEOItem
              label="Meta Description"
              value={data.metaDescription}
              status={data.metaDescription ? (data.metaDescriptionLength > 160 ? "warning" : data.metaDescriptionLength < 120 ? "warning" : "good") : "error"}
            />
            <LengthBar value={data.metaDescriptionLength} min={120} max={160} label="Description length" />

            <SEOItem
              label="Canonical URL"
              value={data.canonical}
              status={data.canonical ? "good" : "warning"}
              mono
            />
            <SEOItem
              label="Meta Robots"
              value={data.metaRobots}
              status={data.metaRobots?.includes("noindex") ? "warning" : "info"}
            />
          </Section>

          {/* Headings */}
          <Section title="Headings">
            <SEOItem
              label="H1 Tag"
              value={data.h1First ? `${data.h1First}${data.h1Count > 1 ? ` (+${data.h1Count - 1} more)` : ""}` : null}
              status={data.h1Count === 0 ? "error" : data.h1Count > 1 ? "warning" : "good"}
            />
            <div style={{ fontSize: 10, color: "#9CA3AF", marginTop: 4 }}>
              H1: {data.headings.filter(h => h.level === 1).length} |
              H2: {data.headings.filter(h => h.level === 2).length} |
              H3: {data.headings.filter(h => h.level === 3).length} |
              H4+: {data.headings.filter(h => h.level >= 4).length}
            </div>
          </Section>

          {/* Open Graph */}
          <Section title="Social Preview" defaultOpen={false}>
            <OGPreview
              title={data.ogTitle}
              description={data.ogDescription}
              image={data.ogImage}
              url={data.ogUrl}
            />
            <SEOItem label="Twitter Card" value={data.twitterCard} status={data.twitterCard ? "good" : "info"} />
          </Section>

          {/* Schema.org */}
          <Section title="Structured Data" defaultOpen={false}>
            {data.schemaTypes.length > 0 ? (
              <div style={{ display: "flex", flexWrap: "wrap", gap: 4, padding: "6px 0" }}>
                {data.schemaTypes.map((t, i) => (
                  <span key={i} style={{
                    padding: "2px 8px",
                    background: "#EFF6FF",
                    color: "#2563EB",
                    borderRadius: 4,
                    fontSize: 10,
                    fontWeight: 500,
                  }}>
                    {t}
                  </span>
                ))}
              </div>
            ) : (
              <div style={{ padding: "8px 0", fontSize: 11, color: "#DC2626" }}>
                No Schema.org structured data found
              </div>
            )}
          </Section>

          {/* Quick Stats */}
          <Section title="Page Stats" defaultOpen={false}>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8, padding: "6px 0" }}>
              <Stat label="Images" value={String(data.imageCount)} sub={data.imagesWithoutAlt > 0 ? `${data.imagesWithoutAlt} no alt` : "All have alt"} warn={data.imagesWithoutAlt > 0} />
              <Stat label="Links" value={String(data.linkCount)} sub={`${data.internalLinks} int / ${data.externalLinks} ext`} />
              <Stat label="Words" value={String(data.wordCount)} sub={data.wordCount < 300 ? "Thin content" : "OK"} warn={data.wordCount < 300} />
            </div>
            <SEOItem label="Language" value={data.lang} />
            <SEOItem label="Viewport" value={data.viewport} status={data.viewport ? "good" : "error"} />
          </Section>

          {/* Actions */}
          <div style={{ marginTop: 12, display: "flex", gap: 8 }}>
            <button
              onClick={() => {
                const auditUrl = `${APP_BASE}/dashboard/audits/new?url=${encodeURIComponent(data.url)}`;
                chrome.tabs.create({ url: auditUrl });
              }}
              style={{
                flex: 1,
                padding: "8px 12px",
                background: "#FF5C00",
                color: "#FFFFFF",
                border: "none",
                borderRadius: 6,
                fontSize: 11,
                fontWeight: 600,
                cursor: "pointer",
              }}
            >
              Full Audit
            </button>
            <SaveToProjectButton url={data.url} isLoggedIn={isLoggedIn} />
          </div>
        </div>
      )}
    </div>
  );
}

function Stat({ label, value, sub, warn }: { label: string; value: string; sub?: string; warn?: boolean }) {
  return (
    <div style={{ textAlign: "center", padding: 6, background: "#F9FAFB", borderRadius: 6 }}>
      <div style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: 16, fontWeight: 700, color: "#0D1B2A" }}>{value}</div>
      <div style={{ fontSize: 9, color: "#9CA3AF" }}>{label}</div>
      {sub && <div style={{ fontSize: 8, color: warn ? "#DC2626" : "#9CA3AF", marginTop: 2 }}>{sub}</div>}
    </div>
  );
}

function SaveToProjectButton({ url, isLoggedIn }: { url: string; isLoggedIn: boolean }) {
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const handleSave = async () => {
    if (!isLoggedIn) {
      chrome.tabs.create({ url: `${APP_BASE}/auth/sign-in` });
      return;
    }
    setSaving(true);
    try {
      // In a real implementation, this would show a project picker dropdown
      // For now, just open the app with the URL pre-filled
      chrome.tabs.create({ url: `${APP_BASE}/dashboard/audits/new?url=${encodeURIComponent(url)}` });
      setSaved(true);
    } finally {
      setSaving(false);
    }
  };

  return (
    <button
      onClick={handleSave}
      disabled={saving}
      style={{
        flex: 1,
        padding: "8px 12px",
        background: "#FFFFFF",
        color: "#0D1B2A",
        border: "1px solid #E5E7EB",
        borderRadius: 6,
        fontSize: 11,
        fontWeight: 600,
        cursor: "pointer",
      }}
    >
      {saved ? "Saved" : saving ? "..." : isLoggedIn ? "Save to Project" : "Log In"}
    </button>
  );
}
