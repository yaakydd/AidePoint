# backend/routers/aidebot.py
#
# Server-side counterpart to utils/gemini.js. Holds GEMINI_API_KEY and
# SYSTEM_INSTRUCTION here, not in the client bundle -- the app never
# talks to Gemini directly, only to this endpoint.
#
# report_context is no longer accepted as freeform client-supplied JSON
# (a client could previously send fabricated data, or another patient's
# real data, with nothing to stop it). The client now sends only
# prediction_id; this router fetches the real record from
# prediction_records and verifies technician_id == the requesting user
# before using it as grounding context -- same ownership check pattern
# human_review.py already uses for review submissions.

import os
import json
import logging
import httpx
from fastapi import APIRouter, HTTPException, Depends, Request, status
from pydantic import BaseModel
from supabase import Client

from auth import verify_supabase_token
from routers.human_review import get_supabase_client  # reuse the same app.state-backed client

log = logging.getLogger("aidepoint")
router = APIRouter(prefix="/aidebot", tags=["aidebot"])

GEMINI_API_KEY = os.environ.get("GEMINI_API_KEY")
GEMINI_MODEL = "gemini-2.5-flash"
GEMINI_URL = (
    f"https://generativelanguage.googleapis.com/v1beta/models/"
    f"{GEMINI_MODEL}:generateContent?key={GEMINI_API_KEY}"
)

SYSTEM_INSTRUCTION = """You are AideBot, the in-app assistant for AidePoint, an AI-assisted blood
smear screening tool used by lab technicians. A technician photographs a
blood smear on a microscope; the app returns an anaemia probability, a
confidence level (high/moderate/low), morphology findings (flagged cell
shape abnormalities), an estimated CBC pattern summary, and a per-cell
shape-severity overlay on the image (a green-to-red gradient, not a
fixed category), these are image-based estimates, not laboratory
measurements, and you should say so if asked how reliable a number is.

You help technicians understand a specific result: what the probability
and confidence mean, what a flagged morphology finding or condition
(sickle cell, iron deficiency, malaria-related, thalassemia, pernicious,
megaloblastic, aplastic, haemolytic) generally indicates, and what a
cell's position on the severity gradient means. When report data is
given to you as context, ground your answer in those exact numbers and
findings, do not invent findings that aren't in the data, and say so
plainly if something wasn't included in the report you were given.

You are a support and interpretation tool, not a diagnostic authority.
Every substantive answer about a result should note that a qualified
physician must confirm any diagnosis or treatment decision, this
mirrors the disclaimer already shown elsewhere in the app, so don't
contradict it. Keep answers concise and practical for someone reading
them on a phone at a lab bench, not a long clinical essay."""

MAX_HISTORY_MESSAGES = 10

# Rate limit -- tiered by subscription_tier (the same field
# services/subscription.py writes to profiles after a successful
# Paystack payment). Free users get a modest daily allowance to try
# AideBot; paying users get the higher limit. Falls back to the "free"
# limit for any tier value not explicitly listed here (including a
# missing/None subscription_tier), so an unrecognized or unset tier
# fails closed to the more restrictive limit rather than silently
# granting unlimited access.
CHAT_MESSAGE_LIMITS = {
    "free": 5,
    "monthly": 50,
    "annual": 50,
}
DEFAULT_CHAT_LIMIT = CHAT_MESSAGE_LIMITS["free"]


class ChatMessage(BaseModel):
    role: str  # 'user' | 'model'
    text: str


class ChatRequest(BaseModel):
    history: list[ChatMessage]
    # Replaces the old freeform report_context dict. The client sends
    # only the ID of the prediction currently being discussed; the
    # backend fetches and verifies ownership before using it as grounding.
    prediction_id: str | None = None


def _fetch_verified_report_context(
    supabase_client: Client, prediction_id: str, requesting_user_id: str
) -> dict:
    """
    Fetches a prediction_records row and confirms it belongs to the
    requesting technician before returning it as chat context. Raises
    404 if the prediction doesn't exist, 403 if it belongs to someone
    else -- both are treated as client errors, not server errors, since
    either means the request itself is invalid for this user.
    """
    lookup = (
        supabase_client.table("prediction_records")
        .select(
            "prediction_id, technician_id, anemia_probability, is_anemic, "
            "prediction_confidence, is_unreliable, unreliable_reasons, "
            "morphology_findings, cbc_pattern_summary, explanation"
        )
        .eq("prediction_id", prediction_id)
        .execute()
    )

    if not lookup.data:
        raise HTTPException(status_code=404, detail="Prediction not found.")

    record = lookup.data[0]
    if record.get("technician_id") != requesting_user_id:
        raise HTTPException(
            status_code=403,
            detail="This prediction does not belong to your account.",
        )

    # Only the fields relevant to grounding a chat answer -- not the
    # full audit row (no need to hand image hashes etc. to Gemini).
    return {
        "anemia_probability": record.get("anemia_probability"),
        "is_anemic": record.get("is_anemic"),
        "prediction_confidence": record.get("prediction_confidence"),
        "is_unreliable": record.get("is_unreliable"),
        "unreliable_reasons": record.get("unreliable_reasons"),
        "morphology_findings": record.get("morphology_findings"),
        "cbc_pattern_summary": record.get("cbc_pattern_summary"),
        "explanation": record.get("explanation"),
    }


def _get_subscription_tier(supabase_client: Client, user_id: str) -> str:
    """
    Looks up the requesting user's subscription_tier from profiles --
    the same column services/subscription.py's _update_subscription_tier
    writes to after a verified Paystack payment. Defaults to "free" if
    the profile row is missing or the column is unset, rather than
    raising -- a lookup failure here should degrade to the free tier's
    limit, not block the chat endpoint entirely.
    """
    profile_lookup = (
        supabase_client.table("profiles")
        .select("subscription_tier")
        .eq("id", user_id)
        .execute()
    )
    if not profile_lookup.data:
        return "free"
    return profile_lookup.data[0].get("subscription_tier") or "free"


def _check_and_record_rate_limit(supabase_client: Client, user_id: str) -> None:
    """
    Counts today's aidebot_messages rows for this user (UTC day) and
    raises 429 if at or over that user's tier-specific daily limit. Same
    "source of truth is the table itself, not a local counter" approach
    scanStorage.js uses for daily scan limits -- correct across
    devices/restarts.
    """
    from datetime import datetime, timezone
    start_of_today = datetime.now(timezone.utc).replace(
        hour=0, minute=0, second=0, microsecond=0
    ).isoformat()

    tier = _get_subscription_tier(supabase_client, user_id)
    daily_limit = CHAT_MESSAGE_LIMITS.get(tier, DEFAULT_CHAT_LIMIT)

    count_result = (
        supabase_client.table("aidebot_messages")
        .select("id", count="exact")
        .eq("user_id", user_id)
        .gte("created_at", start_of_today)
        .execute()
    )
    today_count = count_result.count or 0

    if today_count >= daily_limit:
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail=f"Daily AideBot message limit reached ({daily_limit}/day). Try again tomorrow.",
        )


def _record_message(supabase_client: Client, user_id: str) -> None:
    """Best-effort usage log -- a failure here shouldn't block a reply
    the user is already waiting on, but it's logged loudly since a
    silent failure here would mean the rate limit stops enforcing."""
    try:
        supabase_client.table("aidebot_messages").insert({"user_id": user_id}).execute()
    except Exception as exc:
        log.error("Failed to record aidebot usage for user=%s: %s", user_id, exc)


@router.post("/chat")
async def aidebot_chat(
    payload: ChatRequest,
    user: dict = Depends(verify_supabase_token),
    supabase_client: Client = Depends(get_supabase_client),
):
    if not GEMINI_API_KEY:
        raise HTTPException(
            status_code=500,
            detail="Server is missing GEMINI_API_KEY. Set it in the backend environment.",
        )

    _check_and_record_rate_limit(supabase_client, user["id"])

    trimmed_history = payload.history[-MAX_HISTORY_MESSAGES:]
    contents = [
        {"role": message.role, "parts": [{"text": message.text}]}
        for message in trimmed_history
        if message.text and message.text != "..."
    ]

    if not contents:
        raise HTTPException(status_code=400, detail="No valid messages in history.")

    if payload.prediction_id is not None:
        report_context = _fetch_verified_report_context(
            supabase_client, payload.prediction_id, user["id"]
        )
        context_message = {
            "role": "user",
            "parts": [{
                "text": (
                    "Context: here is the report/prediction data for the "
                    "result currently being discussed. Use it to answer "
                    "accurately; do not repeat it back verbatim unless "
                    "asked.\n\n" + json.dumps(report_context)
                )
            }],
        }
        contents = [context_message] + contents

    request_body = {
        "system_instruction": {"parts": [{"text": SYSTEM_INSTRUCTION}]},
        "contents": contents,
        "generationConfig": {
            "temperature": 0.4,
            "maxOutputTokens": 512,
        },
    }

    try:
        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.post(GEMINI_URL, json=request_body)
    except httpx.TimeoutException:
        raise HTTPException(status_code=504, detail="Gemini request timed out.")
    except httpx.RequestError as exc:
        raise HTTPException(status_code=502, detail=f"Could not reach Gemini: {exc}")

    if response.status_code != 200:
        raise HTTPException(
            status_code=502,
            detail=f"Gemini request failed ({response.status_code}): {response.text}",
        )

    data = response.json()
    reply = (
        data.get("candidates", [{}])[0]
        .get("content", {})
        .get("parts", [{}])[0]
        .get("text")
    )
    if not reply:
        raise HTTPException(status_code=502, detail="Gemini returned no usable response.")

    _record_message(supabase_client, user["id"])

    return {"reply": reply.strip()}
