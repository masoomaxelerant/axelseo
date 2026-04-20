"""
Lighthouse runner — executes Google Lighthouse via Node subprocess.
"""

import json
import subprocess


async def run_lighthouse(url: str) -> dict | None:
    """Run Lighthouse audit on a URL and return the JSON result."""
    try:
        result = subprocess.run(
            [
                "npx",
                "lighthouse",
                url,
                "--output=json",
                "--chrome-flags=--headless --no-sandbox",
                "--only-categories=performance,accessibility,best-practices,seo",
                "--quiet",
            ],
            capture_output=True,
            text=True,
            timeout=120,
        )
        if result.returncode == 0:
            return json.loads(result.stdout)
    except (subprocess.TimeoutExpired, json.JSONDecodeError):
        pass
    return None
