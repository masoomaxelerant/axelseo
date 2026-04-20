import React from "react";

interface SectionProps {
  title: string;
  children: React.ReactNode;
  defaultOpen?: boolean;
}

export function Section({ title, children, defaultOpen = true }: SectionProps) {
  const [open, setOpen] = React.useState(defaultOpen);

  return (
    <div style={{ marginBottom: 8 }}>
      <button
        onClick={() => setOpen(!open)}
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          width: "100%",
          padding: "8px 0",
          background: "none",
          border: "none",
          cursor: "pointer",
          borderBottom: "2px solid #FF5C00",
          marginBottom: 4,
        }}
      >
        <span style={{ fontSize: 12, fontWeight: 700, color: "#0D1B2A", fontFamily: "'Space Grotesk', sans-serif" }}>
          {title}
        </span>
        <span style={{ fontSize: 10, color: "#9CA3AF" }}>{open ? "−" : "+"}</span>
      </button>
      {open && <div>{children}</div>}
    </div>
  );
}
