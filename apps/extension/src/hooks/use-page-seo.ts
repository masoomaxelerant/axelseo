import { useEffect, useState } from "react";
import { extractSEOData } from "~/src/lib/extract-seo";
import type { PageSEOData } from "~/src/types/page-data";

export function usePageSEO() {
  const [data, setData] = useState<PageSEOData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function run() {
      try {
        const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
        if (!tab?.id || !tab.url?.startsWith("http")) {
          setError("Cannot analyze this page");
          setLoading(false);
          return;
        }

        const results = await chrome.scripting.executeScript({
          target: { tabId: tab.id },
          func: extractSEOData,
        });

        if (results?.[0]?.result) {
          setData(results[0].result as PageSEOData);
        } else {
          setError("Could not extract page data");
        }
      } catch (e: any) {
        setError(e.message || "Failed to analyze page");
      } finally {
        setLoading(false);
      }
    }
    run();
  }, []);

  return { data, loading, error };
}
