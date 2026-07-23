# main.py
# FastAPI backend for AidePoint.
# Hosted on Railway. Receives blood smear images, runs ONNX inference,
# returns structured clinical JSON to the React Native app. Also handles
# Paystack subscription billing.
import os
import time
import hmac
import hashlib
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
from pydantic import BaseModel

from preprocess import preprocess_image
from model import AidePointONNX

# Logging 
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s  %(levelname)s  %(message)s",
)
log = logging.getLogger("aidepoint")

#  Config from environment variables 
ONNX_MODEL_PATH    = os.getenv("ONNX_MODEL_PATH", "aidepoint_stable.onnx")
SUPABASE_URL       = os.getenv("SUPABASE_URL", "")        # your project URL
SUPABASE_ANON_KEY  = os.getenv("SUPABASE_ANON_KEY", "")   # public anon key
SUPABASE_SERVICE_KEY = os.getenv("SUPABASE_SERVICE_KEY", "")  # service role — payments write
MAX_IMAGE_BYTES    = 10 * 1024 * 1024   # 10 MB hard limit
ALLOWED_MIME_TYPES = {"image/jpeg", "image/png", "image/jpg"}

PAYSTACK_SECRET_KEY = os.getenv("PAYSTACK_SECRET_KEY", "")
PAYSTACK_BASE_URL   = "https://api.paystack.co"

# Prices live here, not in the client. The app sends a plan_id; the server
# decides what that plan actually costs. Trusting a client-sent amount
# would let anyone pay ₵1 for a subscription just by editing the request.
# GHS here, converted to pesewas (x100) right before calling Paystack,
# since Paystack's API always wants the smallest currency unit.
PLAN_PRICES_GHS = {
    "monthly": 30.00,
    "annual":  300.00,
}

# Model singleton 
# Loaded once at startup, reused for every request. Thread-safe.
_model: AidePointONNX | None = None


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Load model at startup, release at shutdown."""
    global _model
    log.info("Loading ONNX model ...")
    _model = AidePointONNX(ONNX_MODEL_PATH)
    log.info("Model ready")
    yield
    log.info("Shutting down.")


app = FastAPI(
    title="AidePoint API",
    version="1.1.0",
    description="AI-powered anemia detection from RBC microscope images",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],   # tighten to your domain in production
    allow_methods=["GET", "POST"],
    allow_headers=["*"],
)


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
                    "apikey":        SUPABASE_ANON_KEY,
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


#  Routes 

@app.get("/health")
async def health():
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

    # Validate file type 
    content_type = file.content_type or ""
    if content_type not in ALLOWED_MIME_TYPES:
        raise HTTPException(
            status_code=status.HTTP_415_UNSUPPORTED_MEDIA_TYPE,
            detail=f"Unsupported file type: {content_type}. Send JPEG or PNG.",
        )

    #  Read and size-check 
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

    # preprocess_image() now returns a dict -- the model-ready tensor,
    # the raw resized image the reliability/shape checks need, and the
    # before/after crop preview data used by the app's transparency trail.
    try:
        preprocessed = preprocess_image(image_bytes)
    except Exception as exc:
        log.warning("Preprocessing failed for user %s: %s", user.get("id"), exc)
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Could not read image. Ensure it is a valid JPEG or PNG.",
        )

    #  Inference 
    t0 = time.perf_counter()
    try:
        result = _model.predict(
            preprocessed["model_input"], preprocessed["raw_resized_image"]
        )
    except Exception as exc:
        log.error("Inference error for user %s: %s", user.get("id"), exc)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Inference failed. Please try again.",
        )
    elapsed_ms = round((time.perf_counter() - t0) * 1000, 1)

    # Logs whether the reliability gate flagged this request, so
    # unreliable-result rates are visible in Railway logs rather than only
    # showing up as a silent field in the JSON response.
    log.info(
        "predict  user=%s  is_anemic=%s  probability=%.3f  unreliable=%s  time=%sms",
        user.get("id"), result["is_anemic"], result["anemia_probability"],
        result["is_unreliable"], elapsed_ms,
    )

    return JSONResponse(content={
        **result,
        "inference_ms": elapsed_ms,
        "was_cropped": preprocessed["was_cropped"],
        "original_preview_base64": preprocessed["original_preview_base64"],
        "cropped_preview_base64": preprocessed["cropped_preview_base64"],
    })


# Payments (Paystack) 
# Ghana-only, GHS-only app, needs recurring billing — Paystack fits better
# here than Flutterwave for this specific combination. Decision already
# made before this code was written; not re-litigating it here.

class InitializePaymentRequest(BaseModel):
    plan_id: str  # "monthly" or "annual" — validated against PLAN_PRICES_GHS below


@app.post("/payments/initialize")
async def initialize_payment(
    body: InitializePaymentRequest,
    user: dict = Depends(verify_supabase_token),
):
    """
    Starts a Paystack transaction and hands the app a checkout URL.
    The amount is looked up server-side from PLAN_PRICES_GHS — never taken
    from the request body — so a modified client can't pay less than the
    real price.
    """
    if body.plan_id not in PLAN_PRICES_GHS:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Unknown plan_id '{body.plan_id}'. "
                   f"Valid options: {list(PLAN_PRICES_GHS.keys())}",
        )
    if not PAYSTACK_SECRET_KEY:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Payments are not configured on this server.",
        )

    amount_ghs = PLAN_PRICES_GHS[body.plan_id]
    amount_pesewas = int(round(amount_ghs * 100))  # Paystack wants the smallest unit

    async with httpx.AsyncClient(timeout=10.0) as client:
        resp = await client.post(
            f"{PAYSTACK_BASE_URL}/transaction/initialize",
            headers={
                "Authorization": f"Bearer {PAYSTACK_SECRET_KEY}",
                "Content-Type":  "application/json",
            },
            json={
                "email":  user.get("email"),
                "amount": amount_pesewas,
                # metadata rides along to the webhook/verify response, so
                # there's no need for a separate pending-payments table
                # for a first version of this — the reference itself plus
                # this metadata is enough to reconcile a payment.
                "metadata": {
                    "user_id": user.get("id"),
                    "plan_id": body.plan_id,
                },
            },
        )

    data = resp.json()
    if resp.status_code >= 300 or not data.get("status"):
        log.error("Paystack initialize failed for user %s: %s", user.get("id"), data)
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="Could not start payment. Please try again.",
        )

    return {
        "authorization_url": data["data"]["authorization_url"],
        "reference":          data["data"]["reference"],
    }


@app.post("/payments/webhook")
async def paystack_webhook(request: Request):
    """
    Paystack calls this directly — no user is logged in on this request,
    so there's no Supabase JWT to check. Instead, trust is established by
    verifying the request itself came from Paystack, via an HMAC-SHA512
    signature over the raw request body using PAYSTACK_SECRET_KEY.

    This is the authoritative path for confirming a payment — a client-
    side redirect back to the app after checkout is NOT proof of payment
    (the user could close the browser, lose connection, or the redirect
    itself could be spoofed). This webhook is what actually grants access.
    """
    raw_body = await request.body()
    signature = request.headers.get("x-paystack-signature", "")

    expected_signature = hmac.new(
        PAYSTACK_SECRET_KEY.encode("utf-8"),
        raw_body,
        hashlib.sha512,
    ).hexdigest()

    # constant-time comparison — a naive `==` here would leak timing
    # information an attacker could use to forge a valid signature byte
    # by byte, which defeats the point of checking it at all
    if not hmac.compare_digest(expected_signature, signature):
        log.warning("Rejected webhook with invalid signature")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid signature",
        )

    event = await request.json()

    if event.get("event") == "charge.success":
        metadata = event.get("data", {}).get("metadata", {})
        user_id = metadata.get("user_id")
        plan_id = metadata.get("plan_id")

        if user_id and plan_id:
            await _update_subscription_tier(user_id, plan_id)
            log.info("Subscription updated via webhook: user=%s plan=%s", user_id, plan_id)
        else:
            # Not fatal — Paystack still gets its 200, just logged for
            # investigation. Returning an error here would make Paystack
            # retry a webhook that will never have the missing metadata.
            log.error("charge.success webhook missing user_id/plan_id in metadata: %s", event)

    # Paystack expects a 200 regardless of what the event was, as
    # acknowledgement it was received — anything else triggers retries.
    return {"status": "received"}


@app.get("/payments/verify/{reference}")
async def verify_payment(
    reference: str,
    user: dict = Depends(verify_supabase_token),
):
    """
    Lets the app proactively confirm payment right after the browser
    redirects back, instead of waiting on webhook delivery (which can lag
    by seconds to minutes). Applies the same subscription update the
    webhook would — both paths are allowed to independently grant access,
    since either one alone is sufficient proof of a successful charge.
    """
    if not PAYSTACK_SECRET_KEY:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Payments are not configured on this server.",
        )

    async with httpx.AsyncClient(timeout=10.0) as client:
        resp = await client.get(
            f"{PAYSTACK_BASE_URL}/transaction/verify/{reference}",
            headers={"Authorization": f"Bearer {PAYSTACK_SECRET_KEY}"},
        )
    data = resp.json()

    if resp.status_code >= 300 or not data.get("status"):
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="Could not verify payment with Paystack.",
        )

    charge = data["data"]
    metadata = charge.get("metadata", {})

    # Confirms the payment belongs to the person asking about it — without
    # this, one logged-in user could probe another user's reference and
    # have it silently applied to themselves.
    if metadata.get("user_id") != user.get("id"):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="This payment reference does not belong to your account.",
        )

    if charge.get("status") == "success":
        plan_id = metadata.get("plan_id")
        if plan_id:
            await _update_subscription_tier(user["id"], plan_id)
        return {"verified": True, "plan_id": plan_id}

    return {"verified": False, "status": charge.get("status")}


#  Global error handler, never expose raw tracebacks 
@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    log.error("Unhandled error: %s", exc, exc_info=True)
    return JSONResponse(
        status_code=500,
        content={"detail": "An unexpected error occurred. Please try again."},
    )
