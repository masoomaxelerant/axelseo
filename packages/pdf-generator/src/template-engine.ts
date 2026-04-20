import Handlebars from "handlebars";
import fs from "fs";
import path from "path";
import { scoreGaugeSvg, severityBarSvg, cwvBadgeSvg } from "./charts";

export function createTemplateEngine(): typeof Handlebars {
  const hbs = Handlebars.create();

  // ── Formatting helpers ──

  hbs.registerHelper("formatDate", (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString("en-US", {
      year: "numeric", month: "long", day: "numeric",
    });
  });

  hbs.registerHelper("formatNumber", (n: number) => {
    return n?.toLocaleString("en-US") ?? "—";
  });

  hbs.registerHelper("formatMs", (ms: number) => {
    if (ms == null) return "—";
    return ms >= 1000 ? `${(ms / 1000).toFixed(1)}s` : `${Math.round(ms)}ms`;
  });

  hbs.registerHelper("formatPercent", (n: number) => {
    if (n == null) return "—";
    return `${(n * 100).toFixed(1)}%`;
  });

  hbs.registerHelper("formatBytes", (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1048576) return `${(bytes / 1024).toFixed(0)} KB`;
    return `${(bytes / 1048576).toFixed(1)} MB`;
  });

  hbs.registerHelper("round", (n: number) => {
    return n != null ? Math.round(n) : "—";
  });

  // ── Score / color helpers ──

  hbs.registerHelper("scoreColor", (score: number) => {
    if (score >= 90) return "#22C55E";
    if (score >= 50) return "#F59E0B";
    return "#EF4444";
  });

  hbs.registerHelper("scoreLabel", (score: number) => {
    if (score >= 90) return "Excellent";
    if (score >= 70) return "Good";
    if (score >= 50) return "Needs Work";
    return "Poor";
  });

  hbs.registerHelper("severityColor", (severity: string) => {
    if (severity === "critical") return "#EF4444";
    if (severity === "warning") return "#F59E0B";
    return "#60A5FA";
  });

  hbs.registerHelper("severityLabel", (severity: string) => {
    if (severity === "critical") return "Critical";
    if (severity === "warning") return "Warning";
    return "Info";
  });

  hbs.registerHelper("ratingColor", (rating: string) => {
    if (rating === "good") return "#22C55E";
    if (rating === "needs-improvement") return "#F59E0B";
    return "#EF4444";
  });

  hbs.registerHelper("ratingLabel", (rating: string) => {
    if (rating === "good") return "Good";
    if (rating === "needs-improvement") return "Needs Improvement";
    return "Poor";
  });

  // ── Chart helpers ──

  hbs.registerHelper("scoreGauge", (score: number, label: string) => {
    return new hbs.SafeString(scoreGaugeSvg(score, label, 120));
  });

  hbs.registerHelper("scoreGaugeLarge", (score: number, label: string) => {
    return new hbs.SafeString(scoreGaugeSvg(score, label, 150));
  });

  hbs.registerHelper("severityBar", (critical: number, warning: number, info: number) => {
    return new hbs.SafeString(severityBarSvg(critical, warning, info));
  });

  hbs.registerHelper("cwvBadge", (label: string, value: string, target: string, rating: string) => {
    return new hbs.SafeString(cwvBadgeSvg(label, value, target, rating));
  });

  // ── Logic helpers ──

  hbs.registerHelper("eq", (a: unknown, b: unknown) => a === b);
  hbs.registerHelper("gt", (a: number, b: number) => a > b);
  hbs.registerHelper("lt", (a: number, b: number) => a < b);
  hbs.registerHelper("add", (a: number, b: number) => a + b);

  hbs.registerHelper("take", (arr: unknown[], count: number) => {
    return arr?.slice(0, count) ?? [];
  });

  hbs.registerHelper("filterSeverity", (issues: Array<{ severity: string }>, severity: string) => {
    return issues?.filter((i) => i.severity === severity) ?? [];
  });

  hbs.registerHelper("pluralize", (count: number, singular: string, plural: string) => {
    return count === 1 ? singular : plural;
  });

  hbs.registerHelper("currentYear", () => new Date().getFullYear());

  // ── Register partials ──
  const partialsDir = path.join(__dirname, "templates", "partials");
  if (fs.existsSync(partialsDir)) {
    for (const file of fs.readdirSync(partialsDir)) {
      if (file.endsWith(".hbs")) {
        const name = file.replace(".hbs", "");
        const content = fs.readFileSync(path.join(partialsDir, file), "utf-8");
        hbs.registerPartial(name, content);
      }
    }
  }

  return hbs;
}

export function loadTemplate(hbs: typeof Handlebars, name: string): HandlebarsTemplateDelegate {
  const templatePath = path.join(__dirname, "templates", `${name}.hbs`);
  const source = fs.readFileSync(templatePath, "utf-8");
  return hbs.compile(source);
}
