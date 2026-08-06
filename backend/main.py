import os
import time
import hmac
import hashlib
import json
import logging
from contextlib import asynccontextmanager
from dotenv import load_dotenv

load_dotenv()

import httpx
import numpy as np
from fastapi import (
    FastAPI, File, Form, UploadFile, HTTPException,
    Depends, Request, status,
)
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from pydantic import BaseModel
from supabase import create_client, Client
from image_quality import assess_image_quality, should_block_inference
from shape_screening import run_shape_screening
from preprocess import preprocess_image
from model import AidePointONNX
from cbc_uncertainty import build_cbc_pattern_summary, serialize_pattern_summary
from morphology_explanations import build_explanation, classify_confidence
from audit_trail import build_prediction_record, persist_prediction_record
from human_review import router as human_review_router

# Logging 
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s  %(levelname)s  %(message)s",
)
log = logging.getLogger("aidepoint")

#  Config from environment variables 
ONNX_MODEL_PATH    = os.getenv("ONNX_MODEL_PATH", "AidePoint.onnx")
MODEL_VERSION       = os.getenv("MODEL_VERSION", "unversioned")
SUPABASE_URL = os.getenv("SUPABASE_URL", "")# your project URL
SUPABASE_ANON_KEY  = os.getenv("SUPABASE_ANON_KEY", "")   # public anon key
SUPABASE_SERVICE_KEY = os.getenv("SUPABASE_SERVICE_KEY", "")  # service role — payments write
MAX_IMAGE_BYTES    = 10 * 1024 * 1024   # 10 MB hard limit
ALLOWED_MIME_TYPES = {"image/jpeg", "image/png", "image/jpg"}

PAYSTACK_SECRET_KEY = os.getenv("PAYSTACK_SECRET_KEY", "")
PAYSTACK_BASE_URL   = "https://api.paystack.co"

EVAL_REPORT_PATH = os.getenv(
    "EVAL_REPORT_PATH",
    os.path.join(os.path.dirname(__file__), "eval_report.json"),
)

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

# CBC per-field mean absolute error, loaded once at startup from the same
# eval_report.json model.py reads. model.py only exposes the *derived*
# confidence labels (CBC_CONFIDENCE_LABELS), not this raw MAE dict, and
# build_cbc_pattern_summary needs the raw numbers to compute its own
# per-field reliability tier -- so this is read independently here rather
# than importing a private value out of model.py.
_cbc_mean_absolute_errors: dict[str, float] = {}

# Supabase client for writes that need to bypass row-level security
# (prediction record inserts, subscription tier updates). Auth
# verification still goes through the raw httpx call against
# /auth/v1/user below -- that only needs the user's own token, not a
# service-role client, so it's left as-is rather than routed through this
# client for no reason.
_supabase_client: Client | None = None


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Load model, eval report stats, and Supabase client at startup."""
    global _model, _cbc_mean_absolute_errors, _supabase_client

    log.info("Loading ONNX model ...")
    _model = AidePointONNX(ONNX_MODEL_PATH)
    log.info("Model ready")

    if os.path.exists(EVAL_REPORT_PATH):
        with open(EVAL_REPORT_PATH) as eval_report_file:
            eval_report = json.load(eval_report_file)
        _cbc_mean_absolute_errors = eval_report.get("cbc_mae_per_field", {})
    else:
        log.warning(
            "%s not found -- CBC pattern summaries will mark every field "
            "as not_estimable until this file is present.", EVAL_REPORT_PATH,
        )

    if SUPABASE_URL and SUPABASE_SERVICE_KEY:
        _supabase_client = create_client(SUPABASE_URL, SUPABASE_SERVICE_KEY)
    else:
        log.error(
            "SUPABASE_URL or SUPABASE_SERVICE_KEY not set -- prediction "
            "records will fail to persist."
        )

    # human_review.py's get_supabase_client dependency reads this off
    # app.state rather than importing _supabase_client directly, since
    # that module needs a client that reflects whatever got created here
    # at startup, including the "not configured" None case.
    app.state.supabase_client = _supabase_client

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
    # Defaults to "*" only because no production domain has been set yet
    # -- once the app has a real deployed frontend URL, set
    # ALLOWED_ORIGINS as a comma-separated env var (e.g.
    # "https://aidepoint.app,https://staging.aidepoint.app") rather than
    # leaving this open to any origin on a service handling patient data.
    allow_origins=os.getenv("ALLOWED_ORIGINS", "*").split(","),
    allow_methods=["GET", "POST"],
    allow_headers=["*"],
)

app.include_router(human_review_router)


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


def _extract_image_quality_fields(quality_result) -> tuple[str, dict]:
    """
    Pulls the fields audit_trail.py's build_prediction_record needs out
    of assess_image_quality's ImageQualityResult. That dataclass is flat
    (quality_score alongside blur/brightness/contrast/etc, not nested
    under its own "breakdown" key), so the breakdown stored in the audit
    record is everything except quality_score itself -- the individual
    measurements that explain how that score was reached.
    """
    quality_score = quality_result.quality_score
    breakdown = {
        "blur_score": quality_result.blur_score,
        "brightness_score": quality_result.brightness_score,
        "contrast_score": quality_result.contrast_score,
        "cells_detected": quality_result.cells_detected,
        "staining_quality": quality_result.staining_quality,
        "failure_reasons": quality_result.failure_reasons,
    }
    return quality_score, breakdown


def _build_morphology_findings(morphology_probs: dict[str, float]) -> dict[str, dict]:
    """
    Full per-flag record for storage -- all 9 flags with their raw
    probability and whether they cleared the reporting threshold used in
    morphology_explanations.py, not just the subset surfaced in
    observed_indicators. The stored audit record should retain what the
    model actually output, independent of what a report chooses to
    display.
    """
    reporting_threshold = 0.5
    return {
        flag_name: {
            "probability": probability,
            "flagged": probability >= reporting_threshold,
        }
        for flag_name, probability in morphology_probs.items()
    }


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
    patient_sample_id: str = Form(...),
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
      - Every completed prediction is persisted to prediction_records for
        audit purposes, independent of the response returned to the app
    """
    if _model is None:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Model not loaded yet. Try again in a few seconds.",
        )

    if not patient_sample_id.strip():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="patient_sample_id is required and cannot be blank.",
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


    # Image quality check: runs before the model. Answers "is this photo
    # even usable" (blur, brightness, cell count) -- a separate, earlier
    # question from the reliability gate further down, which asks "does
    # this usable photo look like our training data."
    shape_result = run_shape_screening(preprocessed["raw_resized_image"])
    quality_result = assess_image_quality(
        preprocessed["raw_resized_image"], shape_result["cells_detected"]
    )

    if should_block_inference(quality_result):
            log.info(
                "predict blocked for user=%s: no usable cells detected (%s)",
                user.get("id"), quality_result.failure_reasons,
            )
            raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail={
                "error": "image_unusable",
                "message": "No cells could be detected in this image. Please retake the photo.",
                "image_quality": quality_result.__dict__,
            },
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
    # Photo quality is deliberately kept separate from is_unreliable.
    # is_unreliable (from run_reliability_gate + shape_screening) answers
    # "does this sample look like something the model wasn't trained to
    # recognize" -- a genuine out-of-distribution signal, which is the
    # closest honest proxy for "this might be a different disease
    # entirely." Quality problems (blur, poor staining, bad lighting) are
    # a completely different question -- "is this photo usable at all" --
    # and mixing the two meant a blurry photo of a perfectly healthy
    # sample and a well-photographed malaria smear both ended up tagged
    # identically as "unreliable," with no way to tell them apart
    # downstream.
    result["image_quality_warning"] = quality_result.quality_score == "poor"
    result["image_quality_reasons"] = (
        list(quality_result.failure_reasons) if result["image_quality_warning"] else []
    )

    # Uncertainty-relabeled CBC pattern summary, replacing raw regression
    # values with directional estimates + confidence tiers -- see
    # cbc_uncertainty.py for why presenting the raw numbers alone is a
    # patient safety issue, not just a display preference.
    cbc_pattern_summary = serialize_pattern_summary(
        build_cbc_pattern_summary(result["cbc"], _cbc_mean_absolute_errors)
    )

    # Human-readable explanation of which morphology indicators and
    # cell-level findings support this prediction.
    explanation = build_explanation(
        anemia_probability=result["anemia_probability"],
        decision_threshold=result["decision_threshold"],
        morphology_probabilities=result["morphology_probs"],
        cell_overlay=result["cell_overlay"].get("cells", []),
    )
    prediction_confidence = explanation["confidence"]

    # Same shape used for the audit trail record below -- built once here
    # and reused, rather than computed twice, so the API response and the
    # persisted record can never silently drift apart from each other.
    morphology_findings = _build_morphology_findings(result["morphology_probs"])

    # Logs whether the reliability gate flagged this request, so
    # unreliable-result rates are visible in Railway logs rather than only
    # showing up as a silent field in the JSON response.
    log.info(
        "predict  user=%s  is_anemic=%s  probability=%.3f  unreliable=%s  time=%sms",
        user.get("id"), result["is_anemic"], result["anemia_probability"],
        result["is_unreliable"], elapsed_ms,
    )

    # Persist the audit trail record. This happens after inference
    # succeeds but before the response is returned -- a prediction that
    # was shown to a technician and not logged is worse than one that
    # failed outright, since it leaves no trace to investigate later.
    prediction_id = None
    if _supabase_client is not None:
        try:
            quality_score, quality_breakdown = _extract_image_quality_fields(quality_result)
            record = build_prediction_record(
                patient_sample_id=patient_sample_id,
                technician_id=user["id"],
                original_image_bytes=image_bytes,
                analyzed_image_bytes=preprocessed["raw_resized_image"].tobytes(),
                was_cropped=preprocessed["was_cropped"],
                model_name="AidePointONNX",
                model_version=MODEL_VERSION,
                decision_threshold=result["decision_threshold"],
                image_quality_result={
                    "quality_score": quality_score,
                    "breakdown": quality_breakdown,
                },
                prediction_result={
                    "anemia_probability": result["anemia_probability"],
                    "is_anemic": result["is_anemic"],
                    "prediction_confidence": prediction_confidence,
                    "is_unreliable": result["is_unreliable"],
                    "unreliable_reasons": result["unreliable_reasons"],
                    "morphology_findings": morphology_findings,
                    "cbc_pattern_summary": cbc_pattern_summary,
                },
                explanation=explanation,
            )
            prediction_id = persist_prediction_record(_supabase_client, record)
        except Exception as exc:
            # A failed audit write should not block the technician from
            # seeing a result they're waiting on in a clinical setting --
            # but it must be loud in the logs, since this is the one
            # failure mode that leaves no other trace.
            log.error(
                "Failed to persist prediction record for user=%s sample=%s: %s",
                user.get("id"), patient_sample_id, exc,
            )
    else:
        log.error(
            "Supabase client not configured -- prediction for user=%s "
            "sample=%s was not persisted.", user.get("id"), patient_sample_id,
        )

    return JSONResponse(content={
        **result,
        "cbc_pattern_summary": cbc_pattern_summary,
        "morphology_findings": morphology_findings,
        "explanation": explanation,
        "prediction_confidence": prediction_confidence,
        "prediction_id": prediction_id,
        "inference_ms": elapsed_ms,
        "was_cropped": preprocessed["was_cropped"],
        "original_preview_base64": preprocessed["original_preview_base64"],
        "cropped_preview_base64": preprocessed["cropped_preview_base64"],
        "image_quality": quality_result.__dict__,
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