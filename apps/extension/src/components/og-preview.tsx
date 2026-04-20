import React from "react";

interface OGPreviewProps {
  title: string | null;
  description: string | null;
  image: string | null;
  url: string | null;
}

export function OGPreview({ title, description, image, url }: OGPreviewProps) {
  if (!title && !description && !image) {
    return (
      <div style={{ padding: 12, background: "#FEE2E2", borderRadius: 6, fontSize: 11, color: "#DC2626" }}>
        No Open Graph tags found. Social shares will use defaults.
      </div>
    );
  }

  return (
    <div style={{
      border: "1px solid #E5E7EB",
      borderRadius: 8,
      overflow: "hidden",
      fontSize: 11,
    }}>
      {image && (
        <div style={{ height: 100, background: "#F3F4F6", overflow: "hidden" }}>
          <img
            src={image}
            alt=""
            style={{ width: "100%", height: "100%", objectFit: "cover" }}
            onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
          />
        </div>
      )}
      <div style={{ padding: "8px 10px" }}>
        {url && <div style={{ fontSize: 9, color: "#9CA3AF", marginBottom: 2 }}>{url}</div>}
        {title && <div style={{ fontWeight: 600, color: "#111827", marginBottom: 2 }}>{title}</div>}
        {description && <div style={{ color: "#6B7280", lineHeight: 1.3 }}>{description}</div>}
      </div>
    </div>
  );
}
