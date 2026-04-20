#!/usr/bin/env node

/**
 * CLI: generate-report <audit-json> -o report.pdf
 *
 * Usage:
 *   npx ts-node src/cli.ts sample.json -o report.pdf
 *   generate-report audit-data.json -o output.pdf
 */

import fs from "fs";
import path from "path";
import { generateReport } from "./index";
import type { ReportInput } from "./types";

async function main() {
  const args = process.argv.slice(2);

  if (args.length === 0 || args.includes("--help") || args.includes("-h")) {
    console.log(`
  generate-report — AxelSEO PDF Report Generator

  Usage:
    generate-report <audit-json> [options]
    generate-report --sample -o report.pdf

  Options:
    -o, --output <path>   Output PDF path (default: report.pdf)
    --sample              Generate a report with sample data
    --no-appendix         Exclude the appendix pages
    --whitelabel          Remove Axelerant branding
    -h, --help            Show this help
    `);
    process.exit(0);
  }

  const useSample = args.includes("--sample");
  const noAppendix = args.includes("--no-appendix");
  const whitelabel = args.includes("--whitelabel");

  let outputPath = "report.pdf";
  const outputIdx = args.indexOf("-o") !== -1 ? args.indexOf("-o") : args.indexOf("--output");
  if (outputIdx !== -1 && args[outputIdx + 1]) {
    outputPath = args[outputIdx + 1];
  }

  let input: ReportInput;

  if (useSample) {
    input = getSampleData();
  } else {
    const jsonPath = args.find((a) => !a.startsWith("-") && a !== outputPath);
    if (!jsonPath) {
      console.error("Error: provide a JSON file path or use --sample");
      process.exit(1);
    }
    const raw = fs.readFileSync(jsonPath, "utf-8");
    input = JSON.parse(raw) as ReportInput;
  }

  input.options = {
    ...input.options,
    includeAppendix: !noAppendix,
    whitelabel,
  };

  console.log(`Generating PDF report for ${input.client.domain}...`);
  const startTime = Date.now();

  const pdfBuffer = await generateReport(input);

  fs.writeFileSync(outputPath, pdfBuffer);
  const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
  const sizeMB = (pdfBuffer.length / 1048576).toFixed(1);

  console.log(`Done in ${elapsed}s — ${outputPath} (${sizeMB} MB)`);
}

function getSampleData(): ReportInput {
  return {
    audit: {
      id: "sample-001",
      url: "https://acme-corp.com",
      auditDate: new Date().toISOString(),
      pagesCrawled: 120,
      maxPages: 500,
      scores: { seo: 54, performance: 45, accessibility: 62, bestPractices: 78 },
      coreWebVitals: {
        lcp: { value: 4200, rating: "poor" },
        inp: { value: 320, rating: "needs-improvement" },
        cls: { value: 0.22, rating: "needs-improvement" },
      },
      issues: [
        { severity: "critical", category: "title", message: "8 pages missing title tags", howToFix: "Add unique, descriptive <title> tags to each page.", pagesAffected: 8 },
        { severity: "critical", category: "meta_description", message: "12 pages missing meta descriptions", howToFix: "Write compelling 120-160 character meta descriptions.", pagesAffected: 12 },
        { severity: "critical", category: "duplicate_title", message: "Duplicate titles found on 6 pages", howToFix: "Each page needs a unique title.", pagesAffected: 6 },
        { severity: "critical", category: "missing_h1", message: "4 pages missing H1 tags", howToFix: "Add a descriptive H1 tag to each page.", pagesAffected: 4 },
        { severity: "critical", category: "canonical", message: "15 pages missing canonical URLs", howToFix: "Add rel=canonical to prevent duplicate content.", pagesAffected: 15 },
        { severity: "warning", category: "image_alt", message: "24 images missing alt text", howToFix: "Add descriptive alt attributes to all images.", pagesAffected: 18 },
        { severity: "warning", category: "title_length", message: "Title tags too long on 10 pages", howToFix: "Shorten titles to under 60 characters.", pagesAffected: 10 },
        { severity: "warning", category: "thin_content", message: "6 pages have thin content (< 300 words)", howToFix: "Expand content with useful information.", pagesAffected: 6 },
        { severity: "warning", category: "heading_hierarchy", message: "Heading skips on 8 pages", howToFix: "Use sequential heading levels (H1 > H2 > H3).", pagesAffected: 8 },
        { severity: "warning", category: "open_graph", message: "No Open Graph tags on 30 pages", howToFix: "Add og:title, og:description, og:image meta tags.", pagesAffected: 30 },
        { severity: "warning", category: "schema_org", message: "No structured data on any page", howToFix: "Add JSON-LD schema markup.", pagesAffected: 120 },
        { severity: "warning", category: "image_dimensions", message: "15 images missing width/height", howToFix: "Add explicit dimensions to prevent layout shift.", pagesAffected: 10 },
        { severity: "info", category: "twitter_card", message: "No Twitter Card tags", howToFix: "Add twitter:card meta tags for social sharing.", pagesAffected: 120 },
        { severity: "info", category: "breadcrumb_schema", message: "No BreadcrumbList structured data", howToFix: "Add breadcrumb schema for navigation rich snippets.", pagesAffected: 120 },
        { severity: "info", category: "generic_anchor_text", message: "12 links use generic anchor text", howToFix: "Replace 'click here' with descriptive link text.", pagesAffected: 8 },
      ],
      siteStructure: {
        totalPages: 120, maxDepth: 5, brokenLinks: 7,
        redirectChains: 3, orphanPages: 8, avgLoadTimeMs: 3200,
      },
      keywords: [
        { keyword: "digital agency services", position: 3, impressions: 12000, clicks: 840, ctr: 0.07 },
        { keyword: "web development company", position: 8, impressions: 8500, clicks: 340, ctr: 0.04 },
        { keyword: "custom software development", position: 12, impressions: 15000, clicks: 450, ctr: 0.03 },
        { keyword: "drupal development agency", position: 5, impressions: 3200, clicks: 256, ctr: 0.08 },
        { keyword: "react development services", position: 15, impressions: 9000, clicks: 180, ctr: 0.02 },
        { keyword: "digital transformation consulting", position: 18, impressions: 6000, clicks: 120, ctr: 0.02 },
      ],
      pages: [
        { url: "/", title: "Acme Corp — Digital Agency", statusCode: 200, score: 54, loadTimeMs: 2800, issues: 3 },
        { url: "/about", title: "About Us", statusCode: 200, score: 62, loadTimeMs: 2200, issues: 2 },
        { url: "/services", title: null, statusCode: 200, score: 38, loadTimeMs: 3500, issues: 5 },
        { url: "/blog", title: "Blog — Acme Corp", statusCode: 200, score: 71, loadTimeMs: 2100, issues: 1 },
        { url: "/contact", title: "Contact", statusCode: 200, score: 45, loadTimeMs: 4100, issues: 4 },
        { url: "/old-page", title: "Old Page", statusCode: 404, score: null, loadTimeMs: 0, issues: 1 },
      ],
    },
    client: { name: "Acme Corp", domain: "acme-corp.com" },
    consultant: { name: "Syed Masoom", email: "masoom.haider@axelerant.com", title: "SEO Consultant" },
    options: { includeAppendix: true, whitelabel: false },
  };
}

main().catch((err) => {
  console.error("Error:", err.message);
  process.exit(1);
});
