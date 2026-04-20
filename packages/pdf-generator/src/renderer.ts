import puppeteer from "puppeteer";

export interface RenderOptions {
  format?: "A4" | "Letter";
  landscape?: boolean;
  printBackground?: boolean;
}

/**
 * Render an HTML string to a PDF buffer using Puppeteer.
 */
export async function renderPdf(
  html: string,
  options: RenderOptions = {}
): Promise<Buffer> {
  const browser = await puppeteer.launch({
    headless: true,
    args: ["--no-sandbox", "--disable-setuid-sandbox", "--disable-gpu"],
  });

  try {
    const page = await browser.newPage();
    await page.setViewport({ width: 794, height: 1123 });

    await page.setContent(html, {
      waitUntil: "domcontentloaded",
      timeout: 15_000,
    });

    // Wait for fonts
    await page.evaluate(`
      Promise.race([
        document.fonts.ready,
        new Promise(r => setTimeout(r, 5000)),
      ])
    `);

    const pdf = await page.pdf({
      width: "210mm",
      height: "297mm",
      printBackground: options.printBackground ?? true,
      margin: { top: "0", right: "0", bottom: "0", left: "0" },
      preferCSSPageSize: true,
    });

    return Buffer.from(pdf);
  } finally {
    await browser.close();
  }
}
