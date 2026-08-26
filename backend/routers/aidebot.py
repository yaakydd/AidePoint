import os
import json
import logging
import asyncio
from dataclasses import asdict, dataclass
from datetime import datetime, timezone
from typing import cast

import httpx
from fastapi import APIRouter, HTTPException, Depends, Request, status
from postgrest import CountMethod
from pydantic import BaseModel
from starlette.concurrency import run_in_threadpool
from supabase import Client

from auth import verify_supabase_token, get_supabase_client
from services.subscription import (
    CHAT_MESSAGE_LIMITS,
    DEFAULT_CHAT_LIMIT,
    get_subscription_tier,
)

log = logging.getLogger("aidepoint")
router = APIRouter(prefix="/aidebot", tags=["aidebot"])

GEMINI_API_KEY: str | None = os.environ.get("GEMINI_API_KEY")
GEMINI_MODEL = "gemini-3.5-flash-lite"
GEMINI_URL = (
    f"https://generativelanguage.googleapis.com/v1beta/models/"
    f"{GEMINI_MODEL}:generateContent?key={GEMINI_API_KEY}"
)

# FIX (disclaimer): removed the "note that a qualified physician must
# confirm..." instruction. The disclaimer is now shown persistently in
# the UI under the input box (ChatStyles.disclaimerRow), so repeating it
# in every model-generated reply was redundant. All accuracy/grounding
# instructions (defer to `condition`, don't invent findings, disclose
# what's missing) are unchanged.
SYSTEM_INSTRUCTION = """You are AideBot, the in-app assistant for AidePoint, an AI-assisted blood
smear screening tool used by lab technicians. A technician photographs a
blood smear on a microscope, then the app returns an anaemia probability, a
confidence level (high/moderate/low), morphology findings (flagged cell
shape abnormalities), an estimated CBC pattern summary and a per-cell
shape-severity overlay on the image (a green-to-red gradient, not a
fixed category), these are image-based estimates, not laboratory
measurements and you should say so if asked how reliable a number is.

When report context includes a "condition" field, it is the app's
authoritative verdict ("anemic", "healthy", or "unknown") -- always defer
to that value rather than re-deriving it yourself from is_anemic/
is_unreliable. "unknown" means the read itself couldn't be trusted (poor
image quality, an out-of-distribution sample, or unusual cell shape) or a
non-anemia finding was flagged; explain it as "the screening couldn't
produce a reliable anemic/healthy verdict for this sample", not as a
diagnosis of its own.

You help technicians understand a specific result: what the probability
and confidence mean, what a flagged morphology finding or condition
(sickle cell, iron deficiency, malaria-related, thalassemia, pernicious,
megaloblastic, aplastic, haemolytic) generally indicates and what a
cell's position on the severity gradient means. When report data is
given to you as context, ground your answer in those exact numbers and
findings, do not invent findings that aren't in the data, and say so
plainly if something wasn't included in the report you were given.

You are a support and interpretation tool, not a diagnostic authority.
Keep answers concise and practical for someone reading them on a phone
at a lab bench, not a long clinical essay."""

MAX_HISTORY_MESSAGES = 10

_gemini_client: httpx.AsyncClient = httpx.AsyncClient(timeout=30.0)


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

    condition: str
    anemia_probability: float | None
    is_anemic: bool | None
    prediction_confidence: str | None
    is_unreliable: bool | None
    unreliable_reasons: list | None
    morphology_findings: dict | None
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

    NOTE: this makes a blocking supabase-py call. Callers running inside
    an async route MUST invoke this via run_in_threadpool -- see
    aidebot_chat() below. Calling it directly from an async def would
    block the whole event loop for every concurrent request.
    """
    lookup = (
        supabase_client.table("prediction_records")
        .select(
            "prediction_id, technician_id, anemia_probability, is_anemic, "
            "prediction_confidence, is_unreliable, unreliable_reasons, "
            "morphology_findings, cbc_pattern_summary, explanation, condition"
        )
        .eq("prediction_id", prediction_id)
        .execute()
    )

    if not lookup.data:
        raise HTTPException(status_code=404, detail="Prediction not found.")
    record = cast(dict, lookup.data[0])
    if record["technician_id"] != requesting_user_id:
        raise HTTPException(
            status_code=403,
            detail="This prediction does not belong to your account.",
        )

    condition = record["condition"]

    return ReportContext(
        condition=condition,
        anemia_probability=record["anemia_probability"],
        is_anemic=record["is_anemic"],
        prediction_confidence=record["prediction_confidence"],
        is_unreliable=record["is_unreliable"],
        unreliable_reasons=record["unreliable_reasons"],
        morphology_findings=record["morphology_findings"],
        cbc_pattern_summary=record["cbc_pattern_summary"],
        explanation=record["explanation"],
    )


def _check_and_record_rate_limit(supabase_client: Client, user_id: str) -> None:
    """
    Counts today's aidebot_messages rows for this user (UTC day) and
    raises 429 if at or over that user's tier-specific daily limit.
    NOTE: this is only ever a lower bound the client can also enforce for
    UX purposes (see Chatbot.jsx), but this table count is the real,
    authoritative limit -- it can't be reset by reinstalling the app.

    NOTE: this makes blocking supabase-py calls. Must be run via
    run_in_threadpool from async route handlers -- see aidebot_chat().
    """
    start_of_today: str = datetime.now(timezone.utc).replace(
        hour=0, minute=0, second=0, microsecond=0
    ).isoformat()

    tier: str = get_subscription_tier(supabase_client, user_id)
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
    silent failure here would mean the rate limit stops enforcing.

    NOTE: blocking supabase-py call. Run as a background task from the
    async route, not awaited directly -- see aidebot_chat()."""
    try:
        supabase_client.table("aidebot_messages").insert({"user_id": user_id}).execute()
    except Exception as exc:
        log.error("Failed to record aidebot usage for user=%s: %s", user_id, exc)


def _parse_gemini_reply(response_json: dict) -> GeminiReply:
    """Walks the nested, all-optional candidates/content/parts chain in
    a Gemini generateContent response and returns whatever text was
    found, or None if any level was missing."""
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

    # FIX (latency): _check_and_record_rate_limit does blocking supabase-py
    # I/O. Calling it directly inside this async def would freeze the
    # entire event loop -- every other in-flight request on this server --
    # for the duration of that DB call. run_in_threadpool moves it off
    # the event loop.
    await run_in_threadpool(_check_and_record_rate_limit, supabase_client, user["id"])

    trimmed_history: list[ChatMessage] = payload.history[-MAX_HISTORY_MESSAGES:]
    contents: list[dict] = [
        {"role": message.role, "parts": [{"text": message.text}]}
        for message in trimmed_history
        if message.text and message.text != "..."
    ]

    if not contents:
        raise HTTPException(status_code=400, detail="No valid messages in history.")

    if payload.prediction_id is not None:
        # FIX (latency): same blocking-call issue as above.
        report_context: ReportContext = await run_in_threadpool(
            _fetch_verified_report_context, supabase_client, payload.prediction_id, user["id"]
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

    reply_text = parsed.text.strip()

    # FIX (latency): fire usage logging as a background task instead of
    # awaiting it. It's already documented as best-effort/non-critical --
    # no reason to make the user wait on this write after they already
    # have their reply.
    asyncio.create_task(run_in_threadpool(_record_message, supabase_client, user["id"]))

    return {"reply": reply_text}
