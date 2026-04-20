import puppeteer from "puppeteer";
import path from "path";
import fs from "fs";

export interface ReportData {
  auditId: string;
  url: string;
  scores: {
    performance: number;
    accessibility: number;
    bestPractices: number;
    seo: number;
  };
  coreWebVitals: {
    lcp: number | null;
    inp: number | null;
    cls: number | null;
  };
  issuesSummary: {
    errors: number;
    warnings: number;
    info: number;
  };
  pagesCrawled: number;
  generatedAt: string;
}

export async function generateReport(data: ReportData): Promise<Buffer> {
  const templatePath = path.join(__dirname, "templates", "report.html");
  let html = fs.readFileSync(templatePath, "utf-8");

  // Replace template placeholders
  html = html
    .replace("{{url}}", data.url)
    .replace("{{date}}", data.generatedAt)
    .replace("{{pagesCrawled}}", String(data.pagesCrawled))
    .replace("{{seoScore}}", String(data.scores.seo))
    .replace("{{performanceScore}}", String(data.scores.performance))
    .replace("{{accessibilityScore}}", String(data.scores.accessibility))
    .replace("{{bestPracticesScore}}", String(data.scores.bestPractices));

  const browser = await puppeteer.launch({ headless: true });
  const page = await browser.newPage();
  await page.setContent(html, { waitUntil: "networkidle0" });

  const pdf = await page.pdf({
    format: "A4",
    printBackground: true,
    margin: { top: "1cm", right: "1cm", bottom: "1cm", left: "1cm" },
  });

  await browser.close();
  return Buffer.from(pdf);
}
