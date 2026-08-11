import os
import logging
import httpx

log = logging.getLogger("aidepoint")

SUPABASE_URL = os.getenv("SUPABASE_URL", "")# your project URL
SUPABASE_SERVICE_KEY = os.getenv("SUPABASE_SERVICE_KEY", "")  # service role — payments write


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
                "apikey":        SUPABASE_SERVICE_KEY,
                "Content-Type":  "application/json",
                "Prefer":        "return=minimal",
            },
            json={"subscription_tier": plan_id},
        )
    if resp.status_code >= 300:
        log.error("Failed to update subscription_tier for %s: %s %s",
                   user_id, resp.status_code, resp.text)