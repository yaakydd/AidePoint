# Server-side counterpart to utils/gemini.js. Holds GEMINI_API_KEY and
# SYSTEM_INSTRUCTION here, not in the client bundle but rather the app never
# talks to Gemini directly, only to this endpoint.

import os
import json
import logging
from dataclasses import asdict, dataclass
from datetime import datetime, timezone
from typing import cast

import httpx
from cachetools import TTLCache
from fastapi import APIRouter, HTTPException, Depends, Request, status
from postgrest import CountMethod
from pydantic import BaseModel
from supabase import Client

from auth import verify_supabase_token, get_supabase_client

log = logging.getLogger("aidepoint")
router = APIRouter(prefix="/aidebot", tags=["aidebot"])

GEMINI_API_KEY: str | None = os.environ.get("GEMINI_API_KEY")
GEMINI_MODEL = "gemini-3.5-flash-lite"
GEMINI_URL = (
    f"https://generativelanguage.googleapis.com/v1beta/models/"
    f"{GEMINI_MODEL}:generateContent?key={GEMINI_API_KEY}"
)

SYSTEM_INSTRUCTION = """You are AideBot, the in-app assistant for AidePoint, an AI-assisted blood
smear screening tool used by lab technicians. A technician photographs a
blood smear on a microscope, then the app returns an anaemia probability, a
confidence level (high/moderate/low), morphology findings (flagged cell
shape abnormalities), an estimated CBC pattern summary and a per-cell
shape-severity overlay on the image (a green-to-red gradient, not a
fixed category), these are image-based estimates, not laboratory
measurements and you should say so if asked how reliable a number is.

You help technicians understand a specific result: what the probability
and confidence mean, what a flagged morphology finding or condition
(sickle cell, iron deficiency, malaria-related, thalassemia, pernicious,
megaloblastic, aplastic, haemolytic) generally indicates and what a
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

# Rate limit is tiered by subscription_tier (the same field
# services/subscription.py writes to profiles after a successful
# Paystack payment). Free users get a modest daily allowance to try
# AideBot; paying users get the higher limit. Falls back to the "free"
# limit for any tier value not explicitly listed here (including a
# missing/None subscription_tier), so an unrecognized or unset tier
# fails closed to the more restrictive limit rather than silently
# granting unlimited access.
CHAT_MESSAGE_LIMITS: dict[str, int] = {
    "free": 5,
    "monthly": 25,
    "annual": 50,
}
DEFAULT_CHAT_LIMIT: int = CHAT_MESSAGE_LIMITS["free"]

# Shared, module-level httpx client for calls to Gemini, reused across
# every request instead of opening a fresh connection (and re-doing the
# TLS handshake) on every single chat message. httpx.AsyncClient is
# safe to share across concurrent requests within one process.
_gemini_client: httpx.AsyncClient = httpx.AsyncClient(timeout=30.0)

# Short-lived cache of subscription_tier per user, since it only changes
# right after a payment (see services/subscription.py) but was otherwise
# being re-fetched from profiles on every single chat message. A 5-minute
# TTL means a tier upgrade takes up to 5 minutes to be reflected in the
# chat rate limit is an acceptable staleness window for a daily message
# cap, in exchange for skipping a Supabase round trip on most requests.
_subscription_tier_cache: TTLCache = TTLCache(maxsize=10_000, ttl=300)


class ChatMessage(BaseModel):
    role: str  # 'user' or 'model'
    text: str


class ChatRequest(BaseModel):
    history: list[ChatMessage]
    prediction_id: str | None = None


@dataclass
class ReportContext:
    """Grounding data handed to Gemini for one chat turn, the subset
    of a prediction_records row relevant to answering a question about
    it, not the full audit row (no need to hand image hashes etc. to
    Gemini)."""

    anemia_probability: float | None
    is_anemic: bool | None
    prediction_confidence: str | None
    is_unreliable: bool | None
    unreliable_reasons: list | None
    morphology_findings: list | None
    cbc_pattern_summary: dict | None
    explanation: str | None


@dataclass
class GeminiReply:
    """Parsed text out of a Gemini generateContent response. text is
    None if the response was missing candidates/content/parts at any
    level, so callers can distinguish "no usable reply" from an error
    Gemini itself raised."""

    text: str | None


def _fetch_verified_report_context(
    supabase_client: Client, prediction_id: str, requesting_user_id: str
) -> ReportContext:
    """
    Fetches a prediction_records row and confirms it belongs to the
    requesting technician before returning it as chat context. Raises
    404 if the prediction doesn't exist, 403 if it belongs to someone
    else both are treated as client errors not server errors, since
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

    # lookup.data is typed as list[JSON], and JSON is a broad union
    # (str | int | float | bool | Sequence[JSON] | Mapping[str, JSON] |
    # None). Supabase's Python client returns plain dict rows at
    # runtime, but the type checker has no way to know that, so this
    # cast narrows it explicitly rather than fighting the checker with
    # a bare annotation (which doesn't narrow, only declares).
    record = cast(dict, lookup.data[0])
    if record["technician_id"] != requesting_user_id:
        raise HTTPException(
            status_code=403,
            detail="This prediction does not belong to your account.",
        )

    return ReportContext(
        anemia_probability=record["anemia_probability"],
        is_anemic=record["is_anemic"],
        prediction_confidence=record["prediction_confidence"],
        is_unreliable=record["is_unreliable"],
        unreliable_reasons=record["unreliable_reasons"],
        morphology_findings=record["morphology_findings"],
        cbc_pattern_summary=record["cbc_pattern_summary"],
        explanation=record["explanation"],
    )


def _get_subscription_tier(supabase_client: Client, user_id: str) -> str:
    """
    Looks up the requesting user's subscription_tier from profiles --
    the same column services/subscription.py's _update_subscription_tier
    writes to after a verified Paystack payment. Defaults to "free" if
    the profile row is missing or the column is unset, rather than
    raising a lookup failure here should degrade to the free tier's
    limit, not block the chat endpoint entirely.

    Cached per user_id for _subscription_tier_cache's TTL, since this
    was previously queried on every single chat message despite rarely
    changing.
    """
    cached_tier: str | None = _subscription_tier_cache.get(user_id)
    if cached_tier is not None:
        return cached_tier

    profile_lookup = (
        supabase_client.table("profiles")
        .select("subscription_tier")
        .eq("id", user_id)
        .execute()
    )
    tier: str = "free"
    if profile_lookup.data:
        profile_row = cast(dict, profile_lookup.data[0])
        tier = profile_row["subscription_tier"] or "free"

    _subscription_tier_cache[user_id] = tier
    return tier


def _check_and_record_rate_limit(supabase_client: Client, user_id: str) -> None:
    """
    Counts today's aidebot_messages rows for this user (UTC day) and
    raises 429 if at or over that user's tier-specific daily limit. Same
    "source of truth is the table itself, not a local counter" approach
    scanStorage.js uses for daily scan limits  correct across
    devices/restarts.
    """
    start_of_today: str = datetime.now(timezone.utc).replace(
        hour=0, minute=0, second=0, microsecond=0
    ).isoformat()

    tier: str = _get_subscription_tier(supabase_client, user_id)
    daily_limit: int = CHAT_MESSAGE_LIMITS.get(tier, DEFAULT_CHAT_LIMIT)

    count_result = (
        supabase_client.table("aidebot_messages")
        .select("id", count=CountMethod.exact)
        .eq("user_id", user_id)
        .gte("created_at", start_of_today)
        .execute()
    )
    today_count: int = count_result.count or 0

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


def _parse_gemini_reply(response_json: dict) -> GeminiReply:
    """Walks the nested, all-optional candidates/content/parts chain in
    a Gemini generateContent response and returns whatever text was
    found, or None if any level was missing. response_json.get(...)
    returns JSON | None at every step (dict.get is typed against the
    broad JSON union here too), so each level is cast to the shape we
    know Gemini actually returns before indexing into it."""
    candidates = cast(list, response_json.get("candidates") or [{}])
    content = cast(dict, candidates[0].get("content") or {})
    parts = cast(list, content.get("parts") or [{}])
    text = cast("str | None", parts[0].get("text"))
    return GeminiReply(text=text)


@router.post("/chat")
async def aidebot_chat(
    payload: ChatRequest,
    user: dict = Depends(verify_supabase_token),
    supabase_client: Client = Depends(get_supabase_client),
) -> dict[str, str]:
    if not GEMINI_API_KEY:
        raise HTTPException(
            status_code=500,
            detail="Server is missing GEMINI_API_KEY. Set it in the backend environment.",
        )

    _check_and_record_rate_limit(supabase_client, user["id"])

    trimmed_history: list[ChatMessage] = payload.history[-MAX_HISTORY_MESSAGES:]
    contents: list[dict] = [
        {"role": message.role, "parts": [{"text": message.text}]}
        for message in trimmed_history
        if message.text and message.text != "..."
    ]

    if not contents:
        raise HTTPException(status_code=400, detail="No valid messages in history.")

    if payload.prediction_id is not None:
        report_context: ReportContext = _fetch_verified_report_context(
            supabase_client, payload.prediction_id, user["id"]
        )
        context_message: dict = {
            "role": "user",
            "parts": [{
                "text": (
                    "Context: here is the report/prediction data for the "
                    "result currently being discussed. Use it to answer "
                    "accurately; do not repeat it back verbatim unless "
                    "asked.\n\n" + json.dumps(asdict(report_context))
                )
            }],
        }
        contents = [context_message] + contents

    request_body: dict = {
        "system_instruction": {"parts": [{"text": SYSTEM_INSTRUCTION}]},
        "contents": contents,
        "generationConfig": {
            "temperature": 0.4,
            "maxOutputTokens": 512,
            "thinkingConfig": {
                "thinkingLevel": "LOW"
            },
        },
    }
    
    try:
        response = await _gemini_client.post(GEMINI_URL, json=request_body)
    except httpx.TimeoutException:
        raise HTTPException(status_code=504, detail="Gemini request timed out.")
    except httpx.RequestError as exc:
        raise HTTPException(status_code=502, detail=f"Could not reach Gemini: {exc}")

    if response.status_code != 200:
        raise HTTPException(
            status_code=502,
            detail=f"Gemini request failed ({response.status_code}): {response.text}",
        )

    data: dict = response.json()
    parsed: GeminiReply = _parse_gemini_reply(data)
    if not parsed.text:
        raise HTTPException(status_code=502, detail="Gemini returned no usable response.")

    _record_message(supabase_client, user["id"])

    return {"reply": parsed.text.strip()}