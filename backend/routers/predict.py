import os
import time
import logging
import cv2
from dataclasses import asdict
from fastapi import APIRouter, File, Form, UploadFile, HTTPException, Depends, Request, status
from fastapi.responses import JSONResponse
from pydantic import BaseModel

from auth import verify_supabase_token
from services.image_quality import assess_image_quality, should_block_inference
from services.shape_screening import (
    run_shape_screening,
    detect_cell_contours,
    count_measurable_cells,
    ShapeScreeningResult,
)
from services.preprocess import preprocess_image, PreprocessResult
from services.cbc_uncertainty import (
    build_cbc_pattern_summary,
    build_unavailable_cbc_pattern_summary,
    serialize_pattern_summary,
)
from services.morphology_explanations import build_explanation, classify_confidence, Explanation
from services.audit_trail import build_prediction_record, persist_prediction_record
from services.image_storage import route_and_upload_screening_image
from services.prediction_helpers import (
    _extract_image_quality_fields,
    _build_morphology_findings,
    check_and_enforce_scan_limit,
    get_scan_limit_status,
)
from services.condition import resolve_condition

log = logging.getLogger("aidepoint")
router = APIRouter()

MODEL_VERSION: str = os.getenv("MODEL_VERSION", "unversioned")
MAX_IMAGE_BYTES: int = 10 * 1024 * 1024   # 10 MB hard limit
ALLOWED_MIME_TYPES: set[str] = {"image/jpeg", "image/png", "image/jpg"}

class NotesUpdate(BaseModel):
    notes: str


@router.get("/predict/scan-limit")
async def get_scan_limit(
    request: Request,
    user: dict = Depends(verify_supabase_token),
) -> JSONResponse:
    """
    Read-only "how many scans does this technician have left today"
    check, for the Scan screen's SCANS TODAY banner to populate on
    mount instead of staying blank until the first scan of the session
    completes. Uses the same ScanLimitStatus/count logic as /predict's
    own enforcement (see get_scan_limit_status), so this can never
    disagree with what /predict will actually allow.

    scans_remaining_today is null for unlimited tiers or if the scan
    limit store is unavailable, same convention as /predict's response
    -- the app already treats null as "hide the count".
    """
    _supabase_client = request.app.state.supabase_client
    scan_limit_status = get_scan_limit_status(_supabase_client, user["id"])

    return JSONResponse(
        {
            "scans_remaining_today": (
                scan_limit_status.scans_remaining if scan_limit_status else None
            ),
            "daily_limit": (
                scan_limit_status.effective_limit if scan_limit_status else None
            ),
        }
    )


@router.post("/predict")
async def predict(
    request: Request,
    file: UploadFile = File(...),
    patient_sample_id: str = Form(...),
    temperature: str | None = Form(None),
    blood_pressure: str | None = Form(None),
    user: dict = Depends(verify_supabase_token),
) -> JSONResponse:
    """
    Accepts a blood smear image, runs ONNX inference, returns clinical JSON.

    Security:
      - Supabase JWT required (verify_supabase_token dependency)
      - File size capped at 10 MB
      - Only JPEG/PNG/JPG accepted
      - Model is never re-loaded per request (singleton)

    Non-functional:
      - Inference time logged for monitoring
      - All errors return structured JSON, never raw Python tracebacks
      - Every completed prediction is persisted to prediction_records for
        audit purposes, independent of the response returned to the app

    Scan limit contract:
      - check_and_enforce_scan_limit() is the single, authoritative place
        the daily limit (base + consent-gated bonus) is computed and
        enforced. Its ScanLimitStatus is carried through to
        response_payload as scans_remaining_today, so the app's "N
        remaining" banner and this endpoint's own 429 enforcement always
        agree -- they were previously computed independently on the
        client (a separate scans table, local midnight, no consent
        check on the bonus) and could disagree with the server.

    Condition contract (see services/condition.py -- the single place this
    is decided; this docstring is a summary, not the source of truth):
      - is_unreliable always wins -> "unknown", regardless of is_anemic.
        A low-quality/out-of-distribution read is exactly as untrustworthy
        whether the model leaned anemic or not.
      - Otherwise, is_anemic decides "anemic" vs a provisional "healthy",
        and a provisional "healthy" is downgraded to "unknown" if a
        non-anemia morphology flag fired.
      - anemia_probability and prediction_confidence are always real
        values from the model (never forced to None); reliability is
        communicated via prediction_confidence (capped at "low" whenever
        is_unreliable is true, see classify_confidence) and via
        unreliable_reasons, not by withholding the number.
      - cell_overlay / cell_count / flagged_count are only populated when
        condition is determinate ("anemic" or "healthy"); they're zeroed
        out whenever condition is "unknown", since per-cell shape data is
        exactly the thing a "the read itself can't be trusted" verdict
        shouldn't imply confidence in.
    """

    _model = request.app.state.model
    _cbc_mean_absolute_errors = request.app.state.cbc_mean_absolute_errors
    _supabase_client = request.app.state.supabase_client

    if _model is None:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Model not loaded yet. Try again in a few seconds.",
        )

    # Authoritative daily scan-limit check. Runs before we even read the
    # upload, so an over-limit request fails cheaply. scan_limit_status is
    # threaded through to response_payload below so the app's "N
    # remaining" display and this endpoint's own enforcement always agree.
    scan_limit_status = check_and_enforce_scan_limit(_supabase_client, user["id"])

    if not patient_sample_id.strip():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="patient_sample_id is required and cannot be blank.",
        )
    if len(patient_sample_id) > 255:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="patient_sample_id is too long (max 255 characters).",
        )

    # Validate file type
    content_type: str = file.content_type or ""
    if content_type not in ALLOWED_MIME_TYPES:
        raise HTTPException(
            status_code=status.HTTP_415_UNSUPPORTED_MEDIA_TYPE,
            detail=f"Unsupported file type: {content_type}. Send JPEG,JPG or PNG.",
        )

    # Read and size-check
    image_bytes: bytes = await file.read()
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

    try:
        preprocessed: PreprocessResult = preprocess_image(image_bytes)
    except Exception as exc:
        log.warning("Preprocessing failed for user %s: %s", user.get("id"), exc)
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Could not read image. Ensure it is a valid JPEG or PNG.",
        ) from exc

    contours = detect_cell_contours(preprocessed.raw_resized_image)

    # cells_detected must use the same filtered-contour definition
    # shape_screening.py itself uses (not a raw contour count) --
    # assess_image_quality's MINIMUM_CELLS_FOR_RELIABLE_ANALYSIS check
    # directly drives quality_score, so a mismatched definition here
    # would silently change quality_score / is_unreliable.
    measurable_cell_count = count_measurable_cells(contours)
    quality_result = assess_image_quality(
        preprocessed.raw_resized_image, measurable_cell_count
    )

    shape_result: ShapeScreeningResult = run_shape_screening(
        preprocessed.raw_resized_image,
        contours=contours,
        image_quality_is_poor=(quality_result.quality_score == "poor"),
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

    # Inference
    t0 = time.perf_counter()
    try:
        result = _model.predict(
            preprocessed.model_input,
            preprocessed.raw_resized_image,
            shape_screening_result=shape_result,
            contours=contours,
        )
    except Exception as exc:
        log.error("Inference error for user %s: %s", user.get("id"), exc)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Inference failed. Please try again.",
        )
    elapsed_ms: float = round((time.perf_counter() - t0) * 1000, 1)

    result["image_quality_warning"] = quality_result.quality_score == "poor"

    # Quality checks (blur/brightness/contrast/staining/cell-count) are a
    # peer validation layer alongside cell-shape screening and the
    # embedding/OOD reliability gate -- all three feed the same
    # is_unreliable signal, not just the two that happened to be wired up
    # first. A "poor" quality photo must not be able to produce a
    # confident-looking anemic/healthy verdict; it degrades the result
    # the same way an out-of-distribution or unscoreable-shape image
    # already does.
    if quality_result.quality_score == "poor":
        result["is_unreliable"] = True
        result["unreliable_reasons"] = [
            *result["unreliable_reasons"],
            *quality_result.failure_reasons,
        ]

    # morphology_findings has to exist before condition is decided --
    # resolve_condition() needs it to know whether a non-anemia flag fired.
    morphology_findings = _build_morphology_findings(result["morphology_probs"])

    # The single canonical condition decision (services/condition.py),
    # computed immediately after the model call (and after the quality
    # gate above is folded into is_unreliable) so everything downstream
    # -- the explanation, the audit record, and the response -- is built
    # from the same final condition rather than racing ahead of it.
    condition = resolve_condition(
        is_anemic=result["is_anemic"],
        is_off_scope=shape_result.needs_review,
        morphology_findings=morphology_findings,
    )
    # Cell overlay/count are only meaningful for a determinate condition.
    # get_cell_overlay() in model.py runs unconditionally (by design, so a
    # failure there never blocks the core anemia prediction), so it must be
    # zeroed out here, before anything else reads it -- build_explanation()
    # below summarizes cell_overlay into cell_level_summary, and that
    # summary gets persisted to the audit trail, so this has to happen
    # before both, not just before the JSON response is assembled.
    if condition == "unknown":
        result["cell_overlay"] = {
            **result["cell_overlay"],
            "cells": [],
            "cell_count": 0,
            "flagged_count": 0,
        }

    # Route the analyzed image into the "screenings" bucket
    # (anemia/healthy/unknown prefix) and attach its confidence score.
    # Best-effort: a storage failure must not fail the /predict response,
    # matching how persist_prediction_record's failure is handled below.
    _, _png_encoded = cv2.imencode(".png", preprocessed.raw_resized_image)
    storage_route = route_and_upload_screening_image(
        supabase_client=_supabase_client,
        technician_id=user["id"],
        patient_session_id=patient_sample_id,
        analyzed_image_png_bytes=_png_encoded.tobytes(),
        anemia_probability=result["anemia_probability"],
        decision_threshold=result["decision_threshold"],
        is_unreliable=result["is_unreliable"],
        known_image_consent=(
            scan_limit_status.image_consent if scan_limit_status else None
        ),
    )

    # Same "unknown" gate cell_overlay already applies just above -- a
    # 0-cell / off-scope image has no real cell data behind any of the six
    # CBC fields for THIS request, regardless of each field's normal
    # global reliability tier (MCV/MCH/MCHC's tier is good enough on
    # average to otherwise print a directional statement even here, which
    # presented a null result as a real one -- see
    # build_unavailable_cbc_pattern_summary's docstring).
    cbc_pattern_summary = serialize_pattern_summary(
        build_unavailable_cbc_pattern_summary()
        if condition == "unknown"
        else build_cbc_pattern_summary(result["cbc"], _cbc_mean_absolute_errors)
    )

    explanation: Explanation = build_explanation(
        anemia_probability=result["anemia_probability"],
        decision_threshold=result["decision_threshold"],
        morphology_probabilities=result["morphology_probs"],
        cell_overlay=result["cell_overlay"].get("cells", []),
        is_unreliable=result["is_unreliable"],
    )
    prediction_confidence = explanation.confidence
    explanation_dict = asdict(explanation)

    log.info(
        "predict  user=%s  is_anemic=%s  probability=%.3f  unreliable=%s  time=%sms",
        user.get("id"), result["is_anemic"], result["anemia_probability"],
        result["is_unreliable"], elapsed_ms,
    )

    prediction_id: str | None = None
    if _supabase_client is not None:
        try:
            quality_score, quality_breakdown = _extract_image_quality_fields(quality_result)
            record = build_prediction_record(
                patient_sample_id=patient_sample_id,
                technician_id=user["id"],
                original_image_bytes=image_bytes,
                analyzed_image_bytes=preprocessed.raw_resized_image.tobytes(),
                was_cropped=preprocessed.was_cropped,
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
                    "condition": condition,
                },
                explanation=explanation_dict,
                temperature=temperature,
                blood_pressure=blood_pressure,
                storage_bucket_path=(storage_route.storage_path if storage_route else None),
                storage_confidence_score=(storage_route.confidence_score if storage_route else None),
            )
            prediction_id = persist_prediction_record(_supabase_client, record)
        except Exception as exc:
            log.error(
                "Failed to persist prediction record for user=%s sample=%s: %s",
                user.get("id"), patient_sample_id, exc,
            )
    else:
        log.error(
            "Supabase client not configured -- prediction for user=%s "
            "sample=%s was not persisted.", user.get("id"), patient_sample_id,
        )

    response_payload = {
        **result,
        "condition": condition,
        "cbc_pattern_summary": cbc_pattern_summary,
        "morphology_findings": morphology_findings,
        "explanation": explanation_dict,
        "prediction_confidence": prediction_confidence,
        "prediction_id": prediction_id,
        "storage_bucket": (storage_route.bucket_prefix if storage_route else None),
        "storage_confidence_score": (storage_route.confidence_score if storage_route else None),
        "inference_ms": elapsed_ms,
        "was_cropped": preprocessed.was_cropped,
        "original_preview_base64": preprocessed.original_preview_base64,
        "cropped_preview_base64": preprocessed.cropped_preview_base64,
        "image_quality": quality_result.__dict__,
        "scans_remaining_today": (
            scan_limit_status.scans_remaining if scan_limit_status else None
        ),
    }

    return JSONResponse(content=response_payload)

@router.patch("/predict/{prediction_id}/notes")
async def update_prediction_notes(
    prediction_id: str,
    body: NotesUpdate,
    request: Request,
    user: dict = Depends(verify_supabase_token),
) -> JSONResponse:
    """
    The only technician-authored field on a prediction record. Scoped to
    technician_id so a tech can only ever edit notes on their own scans
    .eq("technician_id", ...) below is doing real access control here,
    not just a convenience filter, since the service-role client bypasses
    RLS and would otherwise let any authenticated caller edit any row.
    """
    supabase_client = request.app.state.supabase_client
    if supabase_client is None:
        raise HTTPException(status_code=503, detail="Supabase client not configured on the server.")

    response = (
        supabase_client.table("prediction_records")
        .update({"lab_tech_notes": body.notes})
        .eq("prediction_id", prediction_id)
        .eq("technician_id", user["id"])
        .execute()
    )

    if not response.data:
        raise HTTPException(
            status_code=404,
            detail="Prediction record not found, or does not belong to this technician.",
        )

    return JSONResponse(content={"prediction_id": prediction_id, "lab_tech_notes": body.notes})
