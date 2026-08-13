import os
import logging
import httpx
from fastapi import HTTPException, Request, status
from supabase import Client

log = logging.getLogger("aidepoint")

SUPABASE_URL = os.getenv("SUPABASE_URL", "")# your project URL
SUPABASE_ANON_KEY  = os.getenv("SUPABASE_ANON_KEY", "")   # public anon key

def get_supabase_client(request: Request) -> Client:
    """
    Returns the Supabase service-role client created at startup and
    stored on app.state (see main.py's lifespan). Raises 503 if the
    client wasn't configured (missing SUPABASE_URL/SUPABASE_SERVICE_KEY),
    since a None client silently reaching a caller that expects a
    working client would fail confusingly deep in a query instead.
    """
    supabase_client = request.app.state.supabase_client
    if supabase_client is None:
        raise HTTPException(
            status_code=503,
            detail="Supabase client not configured on the server.",
        )
    return supabase_client

# Auth: verify Supabase JWT 
async def verify_supabase_token(request: Request) -> dict:
    """
    Extracts the Bearer token from the Authorization header and
    verifies it against Supabase's /auth/v1/user endpoint.
    Returns the user dict on success, raises 401 on failure.
    """
    auth_header = request.headers.get("Authorization", "")
    if not auth_header.startswith("Bearer "):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Missing or malformed Authorization header",
        )

    token = auth_header[len("Bearer "):]

    try:
        async with httpx.AsyncClient(timeout=8.0) as client:
            resp = await client.get(
                f"{SUPABASE_URL}/auth/v1/user",
                headers={
                    "Authorization": f"Bearer {token}",
                    "apikey": SUPABASE_ANON_KEY,
                },
            )
    except httpx.RequestError as exc:
        log.exception("Supabase auth check failed")
        raise HTTPException(
            status_code=503,
            detail=str(exc),
        )

    if resp.status_code != 200:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired session. Please log in again.",
        )

    return resp.json()   # contains id, email, etc.
