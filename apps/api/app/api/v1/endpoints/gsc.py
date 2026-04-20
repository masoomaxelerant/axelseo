"""Google Search Console integration endpoints.

OAuth flow:
  1. GET  /auth-url?client_id=...     → returns Google OAuth URL
  2. GET  /callback?code=...&state=... → Google redirects here with auth code
  3. GET  /properties                  → list GSC properties (temp token in session)
  4. POST /connect                     → associate a GSC property with a client
  5. GET  /data/{client_id}            → get latest keyword data
  6. POST /disconnect/{client_id}      → revoke token and delete connection
"""

import uuid

from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.responses import RedirectResponse
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.auth import get_clerk_user_id
from app.core.database import get_db
from app.core.logging import get_logger
from app.models.gsc_data import GSCConnection, GSCKeywordSnapshot
from app.schemas.gsc import (
    GSCAuthUrlResponse,
    GSCConnectRequest,
    GSCConnectionResponse,
    GSCSnapshotResponse,
)
from app.services.gsc import (
    exchange_code_for_tokens,
    fetch_search_analytics,
    get_auth_url,
    list_properties,
    revoke_token,
)

logger = get_logger(__name__)
router = APIRouter()

# Temporary in-memory store for OAuth flow tokens (replaced by session/Redis in production)
_pending_tokens: dict[str, str] = {}


@router.get("/auth-url", response_model=GSCAuthUrlResponse)
async def gsc_auth_url(
    client_id: uuid.UUID = Query(..., description="Client to connect GSC for"),
    clerk_user_id: str = Depends(get_clerk_user_id),
):
    """Generate a Google OAuth URL for GSC authorization."""
    auth_url, state = get_auth_url(str(client_id))
    logger.info("gsc.auth_url_generated", client_id=str(client_id), user=clerk_user_id)
    return GSCAuthUrlResponse(auth_url=auth_url, state=state)


@router.get("/callback")
async def gsc_callback(
    code: str = Query(...),
    state: str = Query(...),
    db: AsyncSession = Depends(get_db),
):
    """OAuth callback — Google redirects here after user grants access.

    The state parameter contains the client_id.
    Exchanges the auth code for tokens and stores the encrypted refresh token.
    """
    try:
        encrypted_refresh_token, access_token = exchange_code_for_tokens(code, state)
    except Exception as e:
        logger.error("gsc.callback_failed", error=str(e))
        raise HTTPException(status_code=400, detail=f"OAuth failed: {str(e)}")

    # Store temporarily so the frontend can list properties and pick one
    client_id = state
    _pending_tokens[client_id] = encrypted_refresh_token

    # Redirect to frontend with success flag
    return RedirectResponse(
        url=f"http://localhost:3000/dashboard/clients/{client_id}?gsc=connected",
        status_code=302,
    )


@router.get("/properties")
async def gsc_list_properties(
    client_id: uuid.UUID = Query(...),
    clerk_user_id: str = Depends(get_clerk_user_id),
):
    """List available GSC properties after OAuth flow."""
    encrypted_token = _pending_tokens.get(str(client_id))
    if not encrypted_token:
        # Check if already connected
        raise HTTPException(status_code=400, detail="No pending OAuth token — start the auth flow first")

    try:
        properties = list_properties(encrypted_token)
    except Exception as e:
        logger.error("gsc.list_properties_failed", error=str(e))
        raise HTTPException(status_code=400, detail=f"Failed to list properties: {str(e)}")

    return {"properties": properties, "client_id": str(client_id)}


@router.post("/connect", response_model=GSCConnectionResponse, status_code=201)
async def gsc_connect(
    payload: GSCConnectRequest,
    db: AsyncSession = Depends(get_db),
    clerk_user_id: str = Depends(get_clerk_user_id),
):
    """Finalize GSC connection — associate a property with a client."""
    encrypted_token = _pending_tokens.pop(str(payload.client_id), None)
    if not encrypted_token:
        raise HTTPException(status_code=400, detail="No pending OAuth token")

    # Check for existing connection
    existing = await db.execute(
        select(GSCConnection).where(GSCConnection.client_id == payload.client_id)
    )
    if existing.scalar_one_or_none():
        raise HTTPException(status_code=409, detail="GSC already connected for this client")

    connection = GSCConnection(
        client_id=payload.client_id,
        gsc_property=payload.gsc_property,
        encrypted_refresh_token=encrypted_token,
        connected_by=clerk_user_id,
    )
    db.add(connection)
    await db.commit()
    await db.refresh(connection)

    logger.info("gsc.connected", client_id=str(payload.client_id), property=payload.gsc_property)

    # Trigger initial data fetch
    from app.worker.tasks import fetch_gsc_data
    fetch_gsc_data.delay(str(connection.id))

    return connection


@router.get("/data/{client_id}", response_model=GSCSnapshotResponse | None)
async def gsc_get_data(
    client_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    clerk_user_id: str = Depends(get_clerk_user_id),
):
    """Get the latest GSC keyword data for a client."""
    result = await db.execute(
        select(GSCConnection).where(GSCConnection.client_id == client_id)
    )
    connection = result.scalar_one_or_none()
    if not connection:
        return None

    # Get latest snapshot
    snapshot_result = await db.execute(
        select(GSCKeywordSnapshot)
        .where(GSCKeywordSnapshot.connection_id == connection.id)
        .order_by(GSCKeywordSnapshot.fetched_at.desc())
        .limit(1)
    )
    snapshot = snapshot_result.scalar_one_or_none()
    if not snapshot:
        return None

    return GSCSnapshotResponse(
        date_range_start=snapshot.date_range_start,
        date_range_end=snapshot.date_range_end,
        top_queries=snapshot.top_queries,
        top_pages=snapshot.top_pages,
        opportunity_queries=snapshot.opportunity_queries,
        device_breakdown=snapshot.device_breakdown,
        country_breakdown=snapshot.country_breakdown,
        fetched_at=snapshot.fetched_at,
    )


@router.get("/status/{client_id}")
async def gsc_connection_status(
    client_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    clerk_user_id: str = Depends(get_clerk_user_id),
):
    """Check if GSC is connected for a client."""
    result = await db.execute(
        select(GSCConnection).where(GSCConnection.client_id == client_id)
    )
    connection = result.scalar_one_or_none()
    if not connection:
        return {"connected": False}

    return {
        "connected": True,
        "gsc_property": connection.gsc_property,
        "last_fetch_at": connection.last_fetch_at,
        "created_at": connection.created_at,
    }


@router.post("/disconnect/{client_id}")
async def gsc_disconnect(
    client_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    clerk_user_id: str = Depends(get_clerk_user_id),
):
    """Disconnect GSC — revoke token and delete all data."""
    result = await db.execute(
        select(GSCConnection).where(GSCConnection.client_id == client_id)
    )
    connection = result.scalar_one_or_none()
    if not connection:
        raise HTTPException(status_code=404, detail="No GSC connection found")

    # Revoke the token at Google
    revoke_token(connection.encrypted_refresh_token)

    # Delete connection (cascades to snapshots)
    await db.delete(connection)
    await db.commit()

    logger.info("gsc.disconnected", client_id=str(client_id), user=clerk_user_id)
    return {"status": "disconnected"}
