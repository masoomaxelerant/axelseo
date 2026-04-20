"""Google Search Console API client.

Handles OAuth flow, property listing, and data fetching.
Uses the Google API Python Client with read-only scope.
"""

from __future__ import annotations

from datetime import date, timedelta
from typing import Any

from google.oauth2.credentials import Credentials
from google_auth_oauthlib.flow import Flow
from googleapiclient.discovery import build

from app.core.config import settings
from app.core.encryption import decrypt_token, encrypt_token
from app.core.logging import get_logger

logger = get_logger(__name__)

SCOPES = ["https://www.googleapis.com/auth/webmasters.readonly"]


def create_oauth_flow(state: str | None = None) -> Flow:
    """Create a Google OAuth flow for GSC authorization."""
    flow = Flow.from_client_config(
        {
            "web": {
                "client_id": settings.google_client_id,
                "client_secret": settings.google_client_secret,
                "auth_uri": "https://accounts.google.com/o/oauth2/auth",
                "token_uri": "https://oauth2.googleapis.com/token",
                "redirect_uris": [settings.google_redirect_uri],
            }
        },
        scopes=SCOPES,
        state=state,
    )
    flow.redirect_uri = settings.google_redirect_uri
    return flow


def get_auth_url(client_id: str) -> tuple[str, str]:
    """Generate an OAuth authorization URL.

    Returns (auth_url, state) where state encodes the client_id
    so the callback knows which client to associate the token with.
    """
    flow = create_oauth_flow(state=client_id)
    auth_url, state = flow.authorization_url(
        access_type="offline",
        include_granted_scopes="true",
        prompt="consent",
    )
    return auth_url, state


def exchange_code_for_tokens(code: str, state: str) -> tuple[str, str]:
    """Exchange an authorization code for tokens.

    Returns (encrypted_refresh_token, access_token).
    """
    flow = create_oauth_flow(state=state)
    flow.fetch_token(code=code)
    credentials = flow.credentials

    if not credentials.refresh_token:
        raise ValueError("No refresh token received — user may need to re-authorize with prompt=consent")

    encrypted = encrypt_token(credentials.refresh_token)
    return encrypted, credentials.token


def _build_service(encrypted_refresh_token: str):
    """Build a GSC service client from an encrypted refresh token."""
    refresh_token = decrypt_token(encrypted_refresh_token)
    credentials = Credentials(
        token=None,
        refresh_token=refresh_token,
        token_uri="https://oauth2.googleapis.com/token",
        client_id=settings.google_client_id,
        client_secret=settings.google_client_secret,
        scopes=SCOPES,
    )
    return build("searchconsole", "v1", credentials=credentials)


def list_properties(encrypted_refresh_token: str) -> list[dict[str, str]]:
    """List GSC properties accessible with the given token.

    Returns a list of dicts: [{siteUrl, permissionLevel}]
    """
    service = _build_service(encrypted_refresh_token)
    response = service.sites().list().execute()
    sites = response.get("siteEntry", [])

    return [
        {
            "site_url": site["siteUrl"],
            "permission_level": site.get("permissionLevel", "unknown"),
        }
        for site in sites
    ]


def fetch_search_analytics(
    encrypted_refresh_token: str,
    site_url: str,
    days: int = 90,
) -> dict[str, Any]:
    """Fetch search analytics data from GSC.

    Returns a dict with:
      - top_queries: top 100 queries by clicks
      - top_pages: top 50 pages by impressions
      - opportunity_queries: queries ranked 11-20
      - device_breakdown: clicks/impressions by device
      - country_breakdown: clicks/impressions by country
    """
    service = _build_service(encrypted_refresh_token)
    end_date = date.today() - timedelta(days=3)  # GSC data has ~3 day lag
    start_date = end_date - timedelta(days=days)

    date_range = {
        "startDate": start_date.isoformat(),
        "endDate": end_date.isoformat(),
    }

    logger.info("gsc.fetching", site_url=site_url, start=date_range["startDate"], end=date_range["endDate"])

    # Top queries by clicks
    top_queries = _query_analytics(
        service, site_url, date_range,
        dimensions=["query"],
        row_limit=100,
    )

    # Top pages by impressions
    top_pages = _query_analytics(
        service, site_url, date_range,
        dimensions=["page"],
        row_limit=50,
    )

    # Device breakdown
    device_data = _query_analytics(
        service, site_url, date_range,
        dimensions=["device"],
        row_limit=10,
    )

    # Country breakdown
    country_data = _query_analytics(
        service, site_url, date_range,
        dimensions=["country"],
        row_limit=20,
    )

    # Opportunity queries (position 11-20)
    opportunity = [
        q for q in top_queries
        if 11 <= q.get("position", 0) <= 20
    ]

    # Also fetch queries specifically in the 11-20 range with more rows
    if len(opportunity) < 10:
        all_queries = _query_analytics(
            service, site_url, date_range,
            dimensions=["query"],
            row_limit=500,
        )
        opportunity = [
            q for q in all_queries
            if 11 <= q.get("position", 0) <= 20
        ]
        opportunity.sort(key=lambda q: q.get("impressions", 0), reverse=True)
        opportunity = opportunity[:20]

    device_breakdown = {}
    for row in device_data:
        device = row.get("device", "unknown")
        device_breakdown[device] = {
            "clicks": row.get("clicks", 0),
            "impressions": row.get("impressions", 0),
        }

    return {
        "top_queries": top_queries,
        "top_pages": top_pages,
        "opportunity_queries": opportunity,
        "device_breakdown": device_breakdown,
        "country_breakdown": country_data,
        "date_range_start": date_range["startDate"],
        "date_range_end": date_range["endDate"],
    }


def _query_analytics(
    service,
    site_url: str,
    date_range: dict[str, str],
    dimensions: list[str],
    row_limit: int = 100,
) -> list[dict[str, Any]]:
    """Execute a Search Analytics query and return normalized rows."""
    try:
        response = (
            service.searchanalytics()
            .query(
                siteUrl=site_url,
                body={
                    "startDate": date_range["startDate"],
                    "endDate": date_range["endDate"],
                    "dimensions": dimensions,
                    "rowLimit": row_limit,
                    "dataState": "final",
                },
            )
            .execute()
        )
    except Exception as e:
        logger.warning("gsc.query_failed", dimensions=dimensions, error=str(e))
        return []

    rows = response.get("rows", [])
    result = []
    for row in rows:
        keys = row.get("keys", [])
        entry: dict[str, Any] = {
            "clicks": row.get("clicks", 0),
            "impressions": row.get("impressions", 0),
            "ctr": round(row.get("ctr", 0), 4),
            "position": round(row.get("position", 0), 1),
        }
        # Map dimension keys to named fields
        for i, dim in enumerate(dimensions):
            if i < len(keys):
                entry[dim] = keys[i]
        result.append(entry)

    return result


def revoke_token(encrypted_refresh_token: str) -> bool:
    """Revoke a Google OAuth token."""
    import httpx

    refresh_token = decrypt_token(encrypted_refresh_token)
    try:
        resp = httpx.post(
            "https://oauth2.googleapis.com/revoke",
            params={"token": refresh_token},
            headers={"Content-Type": "application/x-www-form-urlencoded"},
        )
        return resp.status_code == 200
    except Exception as e:
        logger.warning("gsc.revoke_failed", error=str(e))
        return False
