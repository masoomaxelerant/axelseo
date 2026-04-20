import React from "react";

interface LengthBarProps {
  value: number;
  min: number;
  max: number;
  label: string;
}

export function LengthBar({ value, min, max, label }: LengthBarProps) {
  const status = value === 0 ? "missing" : value < min ? "short" : value > max ? "long" : "good";
  const colors = {
    missing: { bar: "#EF4444", bg: "#FEE2E2", text: "#DC2626", label: "Missing" },
    short: { bar: "#F59E0B", bg: "#FEF3C7", text: "#D97706", label: "Too short" },
    long: { bar: "#F59E0B", bg: "#FEF3C7", text: "#D97706", label: "Too long" },
    good: { bar: "#22C55E", bg: "#DCFCE7", text: "#16A34A", label: "Good" },
  };
  const c = colors[status];
  const pct = Math.min((value / (max * 1.2)) * 100, 100);

  return (
    <div style={{ marginBottom: 4 }}>
      <div style={{ display: "flex", justifyContent: "space-between", fontSize: 10, color: "#6B7280" }}>
        <span>{label}</span>
        <span style={{ color: c.text, fontWeight: 600 }}>
          {value === 0 ? c.label : `${value} chars — ${c.label}`}
        </span>
      </div>
      <div style={{ height: 4, borderRadius: 2, background: c.bg, marginTop: 2 }}>
        <div style={{ height: 4, borderRadius: 2, background: c.bar, width: `${pct}%`, transition: "width 0.3s" }} />
      </div>
    </div>
  );
}
