import os
import logging
import jwt
from jwt import PyJWKClient
from fastapi import HTTPException, Request, status
from supabase import Client

log = logging.getLogger("aidepoint")

SUPABASE_URL = os.getenv("SUPABASE_URL", "")

# Supabase now signs access tokens with ES256 (asymmetric) keys, not a
# shared HS256 secret. We verify against the project's published JWKS
# instead of a static secret. PyJWKClient caches the fetched keys and
# only re-fetches when it sees an unknown key ID (e.g. after rotation),
# so this doesn't add a network call on every request.
JWKS_URL = f"{SUPABASE_URL}/auth/v1/.well-known/jwks.json"
_jwks_client = PyJWKClient(JWKS_URL) if SUPABASE_URL else None


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
    Extracts the Bearer token from the Authorization header and verifies
    it locally against the project's published JWKS (ES256), with no
    outbound network call on the common path (JWKS is cached after the
    first fetch). Supabase-issued access tokens are standard signed JWTs,
    so this is equivalent to hitting /auth/v1/user for the purpose of
    confirming the token is valid and unexpired, without depending on
    Render's outbound networking or Supabase's Auth API being reachable
    on the hot path of every single prediction request.

    Returns a dict with at least "id" and "email" on success, raises 401
    on an invalid/expired token, and 503 if SUPABASE_URL isn't configured
    (a misconfiguration, not a bad token, so it shouldn't be reported to
    the caller as 401).
    """
    if _jwks_client is None:
        log.error("SUPABASE_URL not set -- cannot verify tokens.")
        raise HTTPException(
            status_code=503,
            detail="Auth is not configured on the server.",
        )

    auth_header = request.headers.get("Authorization", "")
    if not auth_header.startswith("Bearer "):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Missing or malformed Authorization header",
        )

    token = auth_header[len("Bearer "):]

    try:
        signing_key = _jwks_client.get_signing_key_from_jwt(token)
        payload = jwt.decode(
            token,
            signing_key.key,
            algorithms=["ES256"],
            audience="authenticated",
        )
    except jwt.ExpiredSignatureError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired session. Please log in again.",
        )
    except jwt.InvalidTokenError:
        log.warning("Rejected invalid Supabase token")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired session. Please log in again.",
        )

    return {
        "id": payload.get("sub"),
        "email": payload.get("email"),
    }