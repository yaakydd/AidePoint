# backend/routers/aidebot.py
#
# Server-side counterpart to utils/gemini.js. Holds GEMINI_API_KEY and
# SYSTEM_INSTRUCTION here, not in the client bundle -- the app never
# talks to Gemini directly, only to this endpoint.
#
# Requires GEMINI_API_KEY set as a real server-side env var (not an
# EXPO_PUBLIC_ one -- that prefix is an Expo/client-bundling convention
# and has no meaning here).

import os
import httpx
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

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
fixed category) -- these are image-based estimates, not laboratory
measurements, and you should say so if asked how reliable a number is.

You help technicians understand a specific result: what the probability
and confidence mean, what a flagged morphology finding or condition
(sickle cell, iron deficiency, malaria-related, thalassemia, pernicious,
megaloblastic, aplastic, haemolytic) generally indicates, and what a
cell's position on the severity gradient means. When report data is
given to you as context, ground your answer in those exact numbers and
findings -- do not invent findings that aren't in the data, and say so
plainly if something wasn't included in the report you were given.

You are a support and interpretation tool, not a diagnostic authority.
Every substantive answer about a result should note that a qualified
physician must confirm any diagnosis or treatment decision -- this
mirrors the disclaimer already shown elsewhere in the app, so don't
contradict it. Keep answers concise and practical for someone reading
them on a phone at a lab bench, not a long clinical essay."""

# Same cap as the client's MAX_HISTORY_MESSAGES, enforced again here so
# a client bug (or a direct API call bypassing the app) can't send an
# arbitrarily large history and blow up request size/cost anyway.
MAX_HISTORY_MESSAGES = 20


class ChatMessage(BaseModel):
    role: str  # 'user' | 'model'
    text: str


class ChatRequest(BaseModel):
    history: list[ChatMessage]
    # Optional structured snapshot of the report/prediction the
    # technician is currently viewing (scanId, anemia_probability,
    # confidence, morphology_findings, cbc_pattern_summary, etc). When
    # present, this is injected as grounding context so AideBot answers
    # about THIS result instead of generic/possibly-invented numbers.
    # The client should only send the current report's own data -- never
    # another patient's -- since this is not access-controlled per report
    # on the backend.
    report_context: dict | None = None


@router.post("/chat")
async def aidebot_chat(payload: ChatRequest):
    if not GEMINI_API_KEY:
        raise HTTPException(
            status_code=500,
            detail="Server is missing GEMINI_API_KEY. Set it in the backend environment.",
        )

    trimmed_history = payload.history[-MAX_HISTORY_MESSAGES:]
    contents = [
        {"role": message.role, "parts": [{"text": message.text}]}
        for message in trimmed_history
        if message.text and message.text != "..."
    ]

    if not contents:
        raise HTTPException(status_code=400, detail="No valid messages in history.")

    # If the client sent the current report's data, prepend it as a
    # user-turn "context" message before the real conversation, so
    # Gemini answers about this specific result rather than guessing.
    # It's inserted as its own turn (not folded into system_instruction)
    # so it can change every request without editing the fixed prompt.
    if payload.report_context is not None:
        import json
        context_message = {
            "role": "user",
            "parts": [{
                "text": (
                    "Context: here is the report/prediction data for the "
                    "result currently being discussed. Use it to answer "
                    "accurately; do not repeat it back verbatim unless "
                    "asked.\n\n" + json.dumps(payload.report_context)
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

    return {"reply": reply.strip()}
