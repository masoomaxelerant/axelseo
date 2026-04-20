/**
 * Extracts SEO data from the current page DOM.
 * This runs as an injected script in the page context via chrome.scripting.executeScript.
 */
export function extractSEOData() {
  const doc = document;
  const url = window.location.href;

  // Title
  const titleEl = doc.querySelector("title");
  const title = titleEl?.textContent?.trim() || null;

  // Meta description
  const metaDesc = doc.querySelector<HTMLMetaElement>('meta[name="description"]');
  const metaDescription = metaDesc?.content?.trim() || null;

  // Canonical
  const canonicalEl = doc.querySelector<HTMLLinkElement>('link[rel="canonical"]');
  const canonical = canonicalEl?.href || null;

  // Meta robots
  const robotsEl = doc.querySelector<HTMLMetaElement>('meta[name="robots"]');
  const metaRobots = robotsEl?.content?.trim() || null;

  // Headings
  const headings: { level: number; text: string }[] = [];
  for (let level = 1; level <= 6; level++) {
    doc.querySelectorAll(`h${level}`).forEach((h) => {
      const text = h.textContent?.trim();
      if (text) headings.push({ level, text });
    });
  }
  const h1s = headings.filter((h) => h.level === 1);

  // Open Graph
  const ogGet = (prop: string) =>
    doc.querySelector<HTMLMetaElement>(`meta[property="og:${prop}"]`)?.content?.trim() || null;

  // Twitter Card
  const twitterCard =
    doc.querySelector<HTMLMetaElement>('meta[name="twitter:card"]')?.content?.trim() || null;

  // Schema.org JSON-LD
  const schemaTypes: string[] = [];
  doc.querySelectorAll('script[type="application/ld+json"]').forEach((el) => {
    try {
      const data = JSON.parse(el.textContent || "");
      const items = Array.isArray(data) ? data : [data];
      items.forEach((item) => {
        if (item["@type"]) {
          const types = Array.isArray(item["@type"]) ? item["@type"] : [item["@type"]];
          schemaTypes.push(...types);
        }
      });
    } catch {}
  });

  // Images
  const images = doc.querySelectorAll("img");
  const imagesWithoutAlt = Array.from(images).filter((img) => !img.alt?.trim()).length;

  // Links
  const links = doc.querySelectorAll("a[href]");
  const origin = window.location.origin;
  let internalLinks = 0;
  let externalLinks = 0;
  links.forEach((a) => {
    try {
      const href = (a as HTMLAnchorElement).href;
      if (href.startsWith(origin) || href.startsWith("/")) internalLinks++;
      else if (href.startsWith("http")) externalLinks++;
    } catch {}
  });

  // Word count
  const bodyText = doc.body?.innerText || "";
  const wordCount = bodyText.split(/\s+/).filter(Boolean).length;

  // Misc
  const lang = doc.documentElement.lang || null;
  const charsetEl = doc.querySelector<HTMLMetaElement>('meta[charset]');
  const charset = charsetEl?.getAttribute("charset") || null;
  const viewportEl = doc.querySelector<HTMLMetaElement>('meta[name="viewport"]');
  const viewport = viewportEl?.content || null;

  return {
    url,
    title,
    titleLength: title?.length || 0,
    metaDescription,
    metaDescriptionLength: metaDescription?.length || 0,
    canonical,
    metaRobots,
    h1Count: h1s.length,
    h1First: h1s[0]?.text || null,
    headings,
    ogTitle: ogGet("title"),
    ogDescription: ogGet("description"),
    ogImage: ogGet("image"),
    ogUrl: ogGet("url"),
    twitterCard,
    schemaTypes,
    imageCount: images.length,
    imagesWithoutAlt,
    linkCount: links.length,
    internalLinks,
    externalLinks,
    wordCount,
    lang,
    charset,
    viewport,
    hasHttps: url.startsWith("https://"),
  };
}
