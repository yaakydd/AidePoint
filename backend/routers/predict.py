import os
import time
import logging
from dataclasses import asdict
from fastapi import APIRouter, File, Form, UploadFile, HTTPException, Depends, Request, status
from fastapi.responses import JSONResponse

from auth import verify_supabase_token
from services.image_quality import assess_image_quality, should_block_inference
from services.shape_screening import run_shape_screening, ShapeScreeningResult
from services.preprocess import preprocess_image, PreprocessResult
from services.cbc_uncertainty import build_cbc_pattern_summary, serialize_pattern_summary
from services.morphology_explanations import build_explanation, classify_confidence, Explanation
from services.audit_trail import build_prediction_record, persist_prediction_record
from services.prediction_helpers import _extract_image_quality_fields, _build_morphology_findings

log = logging.getLogger("aidepoint")
router = APIRouter()

MODEL_VERSION: str = os.getenv("MODEL_VERSION", "unversioned")
MAX_IMAGE_BYTES: int = 10 * 1024 * 1024   # 10 MB hard limit
ALLOWED_MIME_TYPES: set[str] = {"image/jpeg", "image/png", "image/jpg"}


@router.post("/predict")
async def predict(
    request: Request,
    file: UploadFile = File(...),
    patient_sample_id: str = Form(...),
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

    # preprocess_image() now returns a PreprocessResult dataclass, the
    # model-ready tensor, the raw resized image the reliability/shape
    # checks need and the before/after crop preview data used by the
    # app's transparency trail.
    try:
        preprocessed: PreprocessResult = preprocess_image(image_bytes)
    except Exception as exc:
        log.warning("Preprocessing failed for user %s: %s", user.get("id"), exc)
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Could not read image. Ensure it is a valid JPEG or PNG.",
        )

    # Image quality check: runs before the model. Answers "is this photo
    # even usable" (blur, brightness, cell count), a separate, earlier
    # question from the reliability gate further down, which asks "does
    # this usable photo look like our training data."
    shape_result: ShapeScreeningResult = run_shape_screening(preprocessed.raw_resized_image)
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
            preprocessed.model_input, preprocessed.raw_resized_image
        )
    except Exception as exc:
        log.error("Inference error for user %s: %s", user.get("id"), exc)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Inference failed. Please try again.",
        )
    elapsed_ms: float = round((time.perf_counter() - t0) * 1000, 1)
    # Photo quality is deliberately kept separate from is_unreliable.
    # is_unreliable (from run_reliability_gate + shape_screening) answers
    # "does this sample look like something the model wasn't trained to
    # recognize". This is a genuine out-of-distribution signal, which is the
    # closest honest proxy for "this might be a different disease
    # entirely." Quality problems (blur, poor staining, bad lighting) are
    # a completely different question . "is this photo usable at all"
    # and mixing the two meant a blurry photo of a perfectly healthy
    # sample and a well-photographed malaria smear both ended up tagged
    # identically as "unreliable," with no way to tell them apart
    # downstream.
    result["image_quality_warning"] = quality_result.quality_score == "poor"
    result["image_quality_reasons"] = (
        list(quality_result.failure_reasons) if result["image_quality_warning"] else []
    )

    # Uncertainty-relabeled CBC pattern summary, replacing raw regression
    # values with directional estimates + confidence tiers. Use
    # cbc_uncertainty.py as reference for why presenting the raw numbers alone is a
    # patient safety issue, not just a display preference.
    cbc_pattern_summary = serialize_pattern_summary(
        build_cbc_pattern_summary(result["cbc"], _cbc_mean_absolute_errors)
    )

    # Human-readable explanation of which morphology indicators and
    # cell-level findings support this prediction. build_explanation now
    # returns an Explanation dataclass and is converted to a plain dict here
    # with asdict() since this same value is (a) spread into the JSON
    # response below and (b) passed into build_prediction_record(), whose
    # PredictionRecord.explanation field expects a plain dict, not a
    # dataclass instance.
    explanation: Explanation = build_explanation(
        anemia_probability=result["anemia_probability"],
        decision_threshold=result["decision_threshold"],
        morphology_probabilities=result["morphology_probs"],
        cell_overlay=result["cell_overlay"].get("cells", []),
    )
    prediction_confidence = explanation.confidence
    explanation_dict = asdict(explanation)

    # Same shape used for the audit trail record below and is built once here
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
                explanation=explanation_dict,
            )
            prediction_id = persist_prediction_record(_supabase_client, record)
        except Exception as exc:
            # A failed audit write should not block the technician from
            # seeing a result they're waiting on in a clinical setting
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

    condition_is_unknown = result["is_unreliable"]

response_payload = {
    **result,
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

if condition_is_unknown:
    response_payload["anemia_probability"] = None
    response_payload["prediction_confidence"] = None

    return JSONResponse(content={
        **result,
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
    })
