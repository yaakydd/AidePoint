# main.py
# FastAPI backend for AidePoint.
# Hosted on Railway. Receives blood smear images, runs ONNX inference,
# returns structured clinical JSON to the React Native app.

import os
import time
import logging
from contextlib import asynccontextmanager

import httpx
import numpy as np
from fastapi import (
    FastAPI, File, UploadFile, HTTPException,
    Depends, Request, status,
)
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from preprocess import preprocess_image
from model import AidePointONNX

# ── Logging ──────────────────────────────────────────────────────────────────
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s  %(levelname)s  %(message)s",
)
log = logging.getLogger("aidepoint")

# ── Config from environment variables (set these in Railway dashboard) ────────
ONNX_MODEL_PATH    = os.getenv("ONNX_MODEL_PATH", "aidepoint_stable.onnx")
SUPABASE_URL       = os.getenv("SUPABASE_URL", "")        # your project URL
SUPABASE_ANON_KEY  = os.getenv("SUPABASE_ANON_KEY", "")   # public anon key
MAX_IMAGE_BYTES    = 10 * 1024 * 1024   # 10 MB hard limit
ALLOWED_MIME_TYPES = {"image/jpeg", "image/png", "image/jpg"}

# ── Model singleton ───────────────────────────────────────────────────────────
# Loaded once at startup, reused for every request. Thread-safe.
_model: AidePointONNX | None = None


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Load model at startup, release at shutdown."""
    global _model
    log.info("Loading ONNX model ...")
    _model = AidePointONNX(ONNX_MODEL_PATH)
    log.info("Model ready ✓")
    yield
    log.info("Shutting down.")


# ── App ───────────────────────────────────────────────────────────────────────
app = FastAPI(
    title="AidePoint API",
    version="1.0.0",
    description="AI-powered anemia detection from RBC microscope images",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],   # tighten to your domain in production
    allow_methods=["GET", "POST"],
    allow_headers=["*"],
)


# ── Auth: verify Supabase JWT ─────────────────────────────────────────────────
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
                    "apikey":        SUPABASE_ANON_KEY,
                },
            )
    except httpx.RequestError as exc:
        log.error("Supabase auth check failed: %s", exc)
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Authentication service unreachable",
        )

    if resp.status_code != 200:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired session. Please log in again.",
        )

    return resp.json()   # contains id, email, etc.


# ── Routes ────────────────────────────────────────────────────────────────────

@app.get("/health")
async def health():
    """Railway uses this to confirm the service is alive."""
    return {
        "status": "ok",
        "model_loaded": _model is not None,
    }


@app.post("/predict")
async def predict(
    file: UploadFile = File(...),
    user: dict = Depends(verify_supabase_token),
):
    """
    Accepts a blood smear image, runs ONNX inference, returns clinical JSON.

    Security:
      - Supabase JWT required (verify_supabase_token dependency)
      - File size capped at 10 MB
      - Only JPEG/PNG accepted
      - Model is never re-loaded per request (singleton)

    Non-functional:
      - Inference time logged for monitoring
      - All errors return structured JSON, never raw Python tracebacks
    """
    if _model is None:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Model not loaded yet. Try again in a few seconds.",
        )

    # ── Validate file type ──────────────────────────────────────────────────
    content_type = file.content_type or ""
    if content_type not in ALLOWED_MIME_TYPES:
        raise HTTPException(
            status_code=status.HTTP_415_UNSUPPORTED_MEDIA_TYPE,
            detail=f"Unsupported file type: {content_type}. Send JPEG or PNG.",
        )

    # ── Read and size-check ─────────────────────────────────────────────────
    image_bytes = await file.read()
    if len(image_bytes) > MAX_IMAGE_BYTES:
        raise HTTPException(
            status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            detail="Image exceeds 10 MB limit.",
        )
    if len(image_bytes) == 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Empty file received.",
        )

    # ── Preprocess ──────────────────────────────────────────────────────────
    # CHANGED: preprocess_image() now returns two values — the model-ready
    # tensor, and the raw resized image the reliability gate needs.
    try:
        image_array, raw_resized_bgr = preprocess_image(image_bytes)
    except Exception as exc:
        log.warning("Preprocessing failed for user %s: %s", user.get("id"), exc)
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Could not read image. Ensure it is a valid JPEG or PNG.",
        )

    # ── Inference ───────────────────────────────────────────────────────────
    t0 = time.perf_counter()
    try:
        result = _model.predict(image_array, raw_resized_bgr)
    except Exception as exc:
        log.error("Inference error for user %s: %s", user.get("id"), exc)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Inference failed. Please try again.",
        )
    elapsed_ms = round((time.perf_counter() - t0) * 1000, 1)

    # CHANGED: now also logs whether the reliability gate flagged this
    # request, so unreliable-result rates are visible in Railway logs
    # rather than only showing up as a silent field in the JSON response.
    log.info(
        "predict  user=%s  is_anemic=%s  probability=%.3f  unreliable=%s  time=%sms",
        user.get("id"), result["is_anemic"], result["anemia_probability"],
        result["is_unreliable"], elapsed_ms,
    )

    return JSONResponse(content={
        **result,
        "inference_ms": elapsed_ms,
    })


# ── Global error handler — never expose raw tracebacks ───────────────────────
@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    log.error("Unhandled error: %s", exc, exc_info=True)
    return JSONResponse(
        status_code=500,
        content={"detail": "An unexpected error occurred. Please try again."},
    )
