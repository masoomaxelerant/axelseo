"""CLI entry point for manual crawl testing: axelseo-crawl <url>"""

from __future__ import annotations

import argparse
import asyncio
import json
import sys

import structlog


def setup_logging(verbose: bool = False) -> None:
    structlog.configure(
        processors=[
            structlog.stdlib.filter_by_level,
            structlog.stdlib.add_log_level,
            structlog.processors.TimeStamper(fmt="iso"),
            structlog.dev.ConsoleRenderer(),
        ],
        wrapper_class=structlog.stdlib.BoundLogger,
        context_class=dict,
        logger_factory=structlog.PrintLoggerFactory(),
        cache_logger_on_first_use=True,
    )

    import logging

    logging.basicConfig(
        level=logging.DEBUG if verbose else logging.INFO,
        stream=sys.stdout,
    )


async def run_crawl(args: argparse.Namespace) -> None:
    from axelseo_crawler import CrawlConfig, Crawler

    config = CrawlConfig(
        start_url=args.url,
        max_pages=args.max_pages,
        max_depth=args.max_depth,
        requests_per_second=args.rps,
        respect_robots_txt=not args.ignore_robots,
        take_screenshots=args.screenshots,
    )

    pages: list[dict] = []

    async with Crawler(config) as crawler:
        async for page in crawler.crawl():
            print(f"  [{page.status_code}] {page.final_url} ({page.performance.load_time_ms:.0f}ms)")
            pages.append({
                "url": page.final_url,
                "status": page.status_code,
                "title": page.title,
                "meta_description": page.meta_description,
                "h1_count": len([h for h in page.headings if h.level == 1]),
                "links": len(page.links),
                "images": len(page.images),
                "load_ms": page.performance.load_time_ms,
                "error": page.error,
            })

        summary = crawler.summary

    print("\n--- Crawl Summary ---")
    print(f"Pages crawled:  {summary.pages_crawled}")
    print(f"Pages failed:   {summary.pages_failed}")
    print(f"Pages skipped:  {summary.pages_skipped}")
    print(f"Internal links: {summary.internal_links}")
    print(f"External links: {summary.external_links}")
    print(f"Broken links:   {len(summary.broken_links)}")
    print(f"Elapsed:        {summary.elapsed_seconds}s")

    if args.output:
        output = {"summary": summary.model_dump(mode="json"), "pages": pages}
        with open(args.output, "w") as f:
            json.dump(output, f, indent=2, default=str)
        print(f"\nResults written to {args.output}")


def main() -> None:
    parser = argparse.ArgumentParser(
        prog="axelseo-crawl",
        description="AxelSEO web crawler — crawl a site and extract SEO data",
    )
    parser.add_argument("url", help="URL to start crawling from")
    parser.add_argument("--max-pages", type=int, default=50, help="Max pages to crawl (default: 50)")
    parser.add_argument("--max-depth", type=int, default=3, help="Max link depth (default: 3)")
    parser.add_argument("--rps", type=float, default=2.0, help="Requests per second (default: 2)")
    parser.add_argument("--ignore-robots", action="store_true", help="Ignore robots.txt")
    parser.add_argument("--screenshots", action="store_true", help="Take page screenshots")
    parser.add_argument("--output", "-o", type=str, help="Write JSON results to file")
    parser.add_argument("--verbose", "-v", action="store_true", help="Verbose logging")

    args = parser.parse_args()
    setup_logging(args.verbose)
    asyncio.run(run_crawl(args))


if __name__ == "__main__":
    main()
