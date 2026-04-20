import fs from "fs";
import path from "path";
import { createTemplateEngine, loadTemplate } from "./template-engine";

const hbs = createTemplateEngine();
const template = loadTemplate(hbs, "report");
const styles = fs.readFileSync(path.join(__dirname, "templates", "styles", "report.css"), "utf-8");

const data = {
  audit: {
    id: "s1", url: "https://acme-corp.com", auditDate: "2026-04-20",
    pagesCrawled: 120, maxPages: 500,
    scores: { seo: 54, performance: 45, accessibility: 62, bestPractices: 78 },
    coreWebVitals: { lcp: { value: 4200, rating: "poor" }, inp: { value: 320, rating: "needs-improvement" }, cls: { value: 0.22, rating: "needs-improvement" } },
    issues: [{ severity: "critical", category: "title", message: "Missing titles", howToFix: "Add titles", pagesAffected: 8 }],
    siteStructure: { totalPages: 120, maxDepth: 5, brokenLinks: 7, redirectChains: 3, orphanPages: 8, avgLoadTimeMs: 3200 },
    keywords: [{ keyword: "test kw", position: 5, impressions: 100, clicks: 10, ctr: 0.1 }],
    pages: [{ url: "/", title: "Home", statusCode: 200, score: 80, loadTimeMs: 1200, issues: 2 }],
  },
  client: { name: "Acme Corp", domain: "acme-corp.com" },
  consultant: { name: "Syed", email: "s@a.com", title: "Consultant" },
  options: { includeAppendix: true, whitelabel: false },
  styles,
  criticalCount: 1, warningCount: 0, infoCount: 0, totalIssues: 1,
  criticalIssues: [{ severity: "critical", category: "title", message: "Missing", howToFix: "Fix", pagesAffected: 8 }],
  warningIssues: [] as any[], infoIssues: [] as any[],
  topPriorities: [{ category: "title", message: "Missing", pagesAffected: 8 }],
  quickWins: [{ title: "Fix titles", description: "Add them" }],
  strategicRecs: [{ title: "Improve perf", description: "Optimize" }],
  opportunityKeywords: [] as any[],
};

const html = template(data);
fs.writeFileSync("/tmp/debug-report.html", html);

// Count top-level page divs
const lines = html.split("\n");
let count = 0;
for (const line of lines) {
  if (line.includes('class="page') && !line.includes("page-header") && !line.includes("page-footer") && !line.includes("page-title")) {
    count++;
    console.log(`Page ${count}: ${line.trim().substring(0, 60)}`);
  }
}
console.log(`\nTotal page divs: ${count}`);
console.log(`HTML written to /tmp/debug-report.html (${(html.length/1024).toFixed(0)} KB)`);
