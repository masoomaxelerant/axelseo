import React from "react";

interface SEOItemProps {
  label: string;
  value: string | null;
  status?: "good" | "warning" | "error" | "info";
  mono?: boolean;
}

const statusColors = {
  good: "#16A34A",
  warning: "#D97706",
  error: "#DC2626",
  info: "#6B7280",
};

export function SEOItem({ label, value, status = "info", mono }: SEOItemProps) {
  return (
    <div style={{ padding: "6px 0", borderBottom: "1px solid #F3F4F6" }}>
      <div style={{ fontSize: 10, color: "#9CA3AF", fontWeight: 500, marginBottom: 2 }}>
        {label}
        {status !== "info" && (
          <span style={{
            display: "inline-block",
            width: 6, height: 6,
            borderRadius: "50%",
            background: statusColors[status],
            marginLeft: 6,
            verticalAlign: "middle",
          }} />
        )}
      </div>
      <div style={{
        fontSize: 12,
        color: value ? "#111827" : "#D1D5DB",
        fontFamily: mono ? "monospace" : "inherit",
        wordBreak: "break-all",
        lineHeight: 1.4,
      }}>
        {value || "Not found"}
      </div>
    </div>
  );
}
