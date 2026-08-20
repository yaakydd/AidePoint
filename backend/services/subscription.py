import os
import logging
import httpx
from cachetools import TTLCache

log = logging.getLogger("aidepoint")

SUPABASE_URL = os.getenv("SUPABASE_URL", "")# project URL
SUPABASE_SERVICE_KEY = os.getenv("SUPABASE_SERVICE_KEY", "")  # service role, payments write

# Single source of truth for plan tier keys/limits on the backend. These
# MUST match frontend/constants/SubscriptionPlans.js (PLANS.basic/max/pro)
# -- the frontend gates chat input and pre-checks scan counts using those
# numbers, and the server enforces the same numbers as the real limit.
# If either side changes limits, update both files together.
DEFAULT_TIER: str = "basic"

CHAT_MESSAGE_LIMITS: dict[str, int] = {
    "basic": 15,
    "max": 100,
    "pro": 500,
}
DEFAULT_CHAT_LIMIT: int = CHAT_MESSAGE_LIMITS[DEFAULT_TIER]

# daily_limit=None means unlimited (matches frontend's `Infinity`).
# bonus_scans/save_goal mirror the frontend's reward mechanic: once a
# technician has saved >= save_goal images today (consent-gated on the
# frontend), they get `bonus_scans` extra scans for the rest of that day.
SCAN_LIMITS: dict[str, dict] = {
    "basic": {"daily_limit": 5, "save_goal": 5, "bonus_scans": 1},
    "max": {"daily_limit": 30, "save_goal": 5, "bonus_scans": 3},
    "pro": {"daily_limit": None, "save_goal": 5, "bonus_scans": 0},
}

_subscription_tier_cache: TTLCache = TTLCache(maxsize=10_000, ttl=300)


def get_subscription_tier(supabase_client, user_id: str) -> str:
    """
    Looks up the requesting user's subscription_tier from profiles.
    Shared by every server-side limit check (AideBot chat, /predict scan
    limit) so there is exactly one place that decides "what tier is this
    user on" and exactly one place that decides what the fallback is.

    Defaults to DEFAULT_TIER ("basic") if the profile row is missing, the
    column is unset, or it holds a value that isn't a known tier key
    (e.g. a leftover "free"/"monthly"/"annual" from before the tier
    vocabulary was unified with the frontend) -- a lookup failure or an
    unrecognized tier should degrade to the safe default, not raise or
    silently KeyError downstream in a limits dict.

    Cached per user_id for 5 minutes so this isn't re-queried on every
    single chat message or scan.
    """
    cached_tier: str | None = _subscription_tier_cache.get(user_id)
    if cached_tier is not None:
        return cached_tier

    tier: str = DEFAULT_TIER
    profile_lookup = (
        supabase_client.table("profiles")
        .select("subscription_tier")
        .eq("id", user_id)
        .execute()
    )
    if profile_lookup.data:
        candidate = profile_lookup.data[0].get("subscription_tier")
        if candidate in CHAT_MESSAGE_LIMITS:
            tier = candidate

    _subscription_tier_cache[user_id] = tier
    return tier


async def _update_subscription_tier(user_id: str, plan_id: str) -> None:
    """
    Shared by both the webhook and the verify-on-return path, since both
    are ways of learning the same fact ("this user paid") and should apply
    the identical update rather than drifting into two slightly different
    code paths over time.
    """
    if not SUPABASE_SERVICE_KEY:
        log.error("SUPABASE_SERVICE_KEY not set, cannot update subscription_tier")
        return

    async with httpx.AsyncClient(timeout=8.0) as client:
        resp = await client.patch(
            f"{SUPABASE_URL}/rest/v1/profiles?id=eq.{user_id}",
            headers={
                "Authorization": f"Bearer {SUPABASE_SERVICE_KEY}",
                "apikey": SUPABASE_SERVICE_KEY,
                "Content-Type": "application/json",
                "Prefer": "return=minimal",
            },
            json={"subscription_tier": plan_id},
        )
    if resp.status_code >= 300:
        log.error("Failed to update subscription_tier for %s: %s %s",
                   user_id, resp.status_code, resp.text)
