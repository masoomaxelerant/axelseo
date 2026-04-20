/**
 * @axelseo/pdf-generator — Generate branded PDF audit reports.
 *
 * Usage:
 *   import { generateReport } from '@axelseo/pdf-generator';
 *   const pdf = await generateReport({ audit, client, consultant });
 */

import fs from "fs";
import path from "path";
import { createTemplateEngine, loadTemplate } from "./template-engine";
import { renderPdf } from "./renderer";
import type { ReportInput, ReportIssue } from "./types";

export type { ReportInput, ReportOptions, AuditData, ClientData, ConsultantData } from "./types";

/**
 * Generate a branded PDF report from audit data.
 * Returns a Buffer containing the PDF file.
 */
export async function generateReport(input: ReportInput): Promise<Buffer> {
  const { audit, client, consultant, options = {} } = input;

  // Set defaults
  const opts = {
    includeAppendix: options.includeAppendix ?? true,
    whitelabel: options.whitelabel ?? false,
  };

  // Load CSS
  const cssPath = path.join(__dirname, "templates", "styles", "report.css");
  const styles = fs.readFileSync(cssPath, "utf-8");

  // Prepare template data
  const criticalIssues = audit.issues.filter((i) => i.severity === "critical");
  const warningIssues = audit.issues.filter((i) => i.severity === "warning");
  const infoIssues = audit.issues.filter((i) => i.severity === "info");

  const topPriorities = criticalIssues.slice(0, 3);

  // Generate recommendations from issues
  const quickWins = generateQuickWins(audit.issues);
  const strategicRecs = generateStrategicRecs(audit.issues, audit);

  // Opportunity keywords (position 11-20)
  const opportunityKeywords = (audit.keywords ?? [])
    .filter((k) => k.position >= 11 && k.position <= 20)
    .sort((a, b) => a.position - b.position)
    .slice(0, 10)
    .map((k) => ({
      ...k,
      potentialClicks: Math.round(k.impressions * 0.05), // estimate ~5% CTR on page 1
    }));

  const templateData = {
    audit,
    client,
    consultant,
    options: opts,
    styles,
    criticalCount: criticalIssues.length,
    warningCount: warningIssues.length,
    infoCount: infoIssues.length,
    totalIssues: audit.issues.length,
    criticalIssues,
    warningIssues,
    infoIssues,
    topPriorities,
    quickWins,
    strategicRecs,
    opportunityKeywords,
  };

  // Compile template
  const hbs = createTemplateEngine();
  const template = loadTemplate(hbs, "report");
  const html = template(templateData);

  // Render to PDF
  return renderPdf(html);
}

function generateQuickWins(issues: ReportIssue[]): Array<{ title: string; description: string }> {
  const wins: Array<{ title: string; description: string }> = [];

  const hasMissingTitles = issues.some((i) => i.category === "title" && i.severity === "critical");
  const hasMissingMeta = issues.some((i) => i.category === "meta_description" && i.severity === "critical");
  const hasMissingAlt = issues.some((i) => i.category === "image_alt");
  const hasMissingCanonical = issues.some((i) => i.category === "canonical");
  const hasMissingOG = issues.some((i) => i.category === "open_graph");

  if (hasMissingTitles) {
    wins.push({ title: "Add missing title tags", description: "Write unique, keyword-rich titles under 60 characters for each page missing a <title> tag." });
  }
  if (hasMissingMeta) {
    wins.push({ title: "Write meta descriptions", description: "Add compelling 120-160 character meta descriptions to pages that are missing them." });
  }
  if (hasMissingAlt) {
    wins.push({ title: "Add image alt text", description: "Add descriptive alt attributes to all images. This improves both SEO and accessibility." });
  }
  if (hasMissingCanonical) {
    wins.push({ title: "Set canonical URLs", description: "Add rel=canonical tags to prevent duplicate content issues." });
  }
  if (hasMissingOG) {
    wins.push({ title: "Add Open Graph tags", description: "Add og:title, og:description, and og:image to control social sharing appearance." });
  }

  return wins.slice(0, 5);
}

function generateStrategicRecs(issues: ReportIssue[], audit: ReportInput["audit"]): Array<{ title: string; description: string }> {
  const recs: Array<{ title: string; description: string }> = [];

  if (audit.scores.performance < 70) {
    recs.push({ title: "Improve page load performance", description: "Optimize images, implement lazy loading, minimize JavaScript bundles, and enable caching to bring performance above 70." });
  }
  if (audit.siteStructure.brokenLinks > 0) {
    recs.push({ title: "Fix broken links and redirects", description: "Audit all 4xx pages, set up 301 redirects where content has moved, and update internal links." });
  }
  if (audit.siteStructure.orphanPages > 3) {
    recs.push({ title: "Improve internal linking", description: "Create a linking strategy to connect orphan pages to your main content. Consider adding breadcrumbs and related content sections." });
  }
  if (issues.some((i) => i.category === "schema_org")) {
    recs.push({ title: "Implement structured data", description: "Add JSON-LD schema markup (Organization, WebPage, Article, FAQ) to enable rich snippets in search results." });
  }
  if (audit.coreWebVitals.lcp.rating !== "good") {
    recs.push({ title: "Optimize Largest Contentful Paint", description: "Reduce server response time, preload critical resources, optimize hero images, and defer non-critical CSS/JS." });
  }

  return recs.slice(0, 5);
}
