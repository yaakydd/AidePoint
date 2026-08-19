import os
import time
import logging
from dataclasses import asdict
from fastapi import APIRouter, File, Form, UploadFile, HTTPException, Depends, Request, status
from fastapi.responses import JSONResponse
from pydantic import BaseModel

from auth import verify_supabase_token
from services.image_quality import assess_image_quality, should_block_inference
from services.shape_screening import run_shape_screening, detect_cell_contours, ShapeScreeningResult
from services.preprocess import preprocess_image, PreprocessResult
from services.cbc_uncertainty import build_cbc_pattern_summary, serialize_pattern_summary
from services.morphology_explanations import build_explanation, classify_confidence, Explanation
from services.audit_trail import build_prediction_record, persist_prediction_record
from services.prediction_helpers import _extract_image_quality_fields, _build_morphology_findings
from services.condition import resolve_condition

log = logging.getLogger("aidepoint")
router = APIRouter()

MODEL_VERSION: str = os.getenv("MODEL_VERSION", "unversioned")
MAX_IMAGE_BYTES: int = 10 * 1024 * 1024   # 10 MB hard limit
ALLOWED_MIME_TYPES: set[str] = {"image/jpeg", "image/png", "image/jpg"}

class NotesUpdate(BaseModel):
    notes: str

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

    #  Read and size-check 
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
        )

    contours = detect_cell_contours(preprocessed.raw_resized_image)
    shape_result: ShapeScreeningResult = run_shape_screening(
        preprocessed.raw_resized_image, contours=contours
    )
    quality_result = assess_image_quality(
        preprocessed.raw_resized_image, shape_result.cells_detected
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
    result["image_quality_reasons"] = (
        list(quality_result.failure_reasons) if result["image_quality_warning"] else []
    )

    # morphology_findings has to exist before condition is decided --
    # resolve_condition() needs it to know whether a non-anemia flag fired.
    morphology_findings = _build_morphology_findings(result["morphology_probs"])

    # The single canonical condition decision (services/condition.py),
    # computed immediately after the model call so everything downstream
    # -- the explanation, the audit record, and the response -- is built
    # from the same final condition rather than racing ahead of it.
    condition = resolve_condition(
        is_anemic=result["is_anemic"],
        is_unreliable=result["is_unreliable"],
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

    cbc_pattern_summary = serialize_pattern_summary(
        build_cbc_pattern_summary(result["cbc"], _cbc_mean_absolute_errors)
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
                },
                explanation=explanation_dict,
                temperature=temperature,
                blood_pressure=blood_pressure,
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
        "inference_ms": elapsed_ms,
        "was_cropped": preprocessed.was_cropped,
        "original_preview_base64": preprocessed.original_preview_base64,
        "cropped_preview_base64": preprocessed.cropped_preview_base64,
        "image_quality": quality_result.__dict__,
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
    -- .eq("technician_id", ...) below is doing real access control here,
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