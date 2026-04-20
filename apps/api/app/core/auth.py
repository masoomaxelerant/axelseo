"""Clerk JWT verification middleware.

In development (when CLERK_PUBLISHABLE_KEY is empty), auth is bypassed
and a dev user ID is returned so the API can be used without Clerk setup.
"""

import base64

import httpx
from fastapi import Depends, HTTPException
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer

from app.core.config import settings
from app.core.logging import get_logger

logger = get_logger(__name__)
security = HTTPBearer(auto_error=False)

DEV_USER_ID = "dev_user_local"


async def verify_clerk_token(
    credentials: HTTPAuthorizationCredentials | None = Depends(security),
) -> dict:
    """Verify a Clerk JWT and return decoded claims.

    If Clerk is not configured (no publishable key), returns a dev user
    so the API works locally without Clerk.
    """
    # Dev bypass — no Clerk keys configured
    if not settings.clerk_publishable_key:
        logger.debug("auth.dev_bypass", user=DEV_USER_ID)
        return {"sub": DEV_USER_ID}

    if credentials is None:
        raise HTTPException(status_code=401, detail="Missing authorization header")

    token = credentials.credentials

    try:
        import jwt as pyjwt
        from jwt import PyJWKClient

        pk = settings.clerk_publishable_key
        key_part = pk.split("_")[-1]
        padding = 4 - len(key_part) % 4
        if padding != 4:
            key_part += "=" * padding
        frontend_api = base64.b64decode(key_part).decode("utf-8").rstrip("$")
        jwks_url = f"https://{frontend_api}/.well-known/jwks.json"

        jwks_client = PyJWKClient(jwks_url)
        signing_key = jwks_client.get_signing_key_from_jwt(token)

        decoded = pyjwt.decode(
            token,
            signing_key.key,
            algorithms=["RS256"],
            options={"verify_aud": False},
        )
        return decoded

    except Exception as e:
        logger.warning("auth.token_verification_failed", error=str(e))
        raise HTTPException(status_code=401, detail="Invalid or expired token")


async def get_clerk_user_id(claims: dict = Depends(verify_clerk_token)) -> str:
    """Extract the Clerk user ID from verified JWT claims."""
    return claims["sub"]
