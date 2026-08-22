"""
Builds and persists the permanent record for every /predict call.

This exists because a model output by itself cannot answer "why did this
patient get this result" six months later. The model may have been
retrained, the threshold may have changed, the image may have been
re-cropped differently. This module snapshots everything relevant at the
moment of prediction so that question stays answerable.
"""

import hashlib
from dataclasses import dataclass, field
from datetime import datetime, timezone
from typing import Any

from supabase import Client


@dataclass
class PredictionRecord:
    patient_sample_id: str
    technician_id: str
    original_image_hash: str
    analyzed_image_hash: str
    was_cropped: bool
    decision_threshold: float
    image_quality_score: str
    image_quality_breakdown: dict[str, Any]
    anemia_probability: float
    is_anemic: bool
    prediction_confidence: str
    is_unreliable: bool
    unreliable_reasons: list[str]
    morphology_findings: dict[str, Any]
    cbc_pattern_summary: dict[str, Any]
    explanation: dict[str, Any]
    condition: str
    temperature: str | None = None
    blood_pressure: str | None = None
    lab_tech_notes: str = ""
    created_at: datetime = field(default_factory=lambda: datetime.now(timezone.utc))

def hash_image_bytes(image_bytes: bytes) -> str:
    """Content hash of an image, used so a prediction record can be tied
    back to the exact bytes that were analyzed, independent of filename
    or upload timestamp."""
    return hashlib.sha256(image_bytes).hexdigest()


def build_prediction_record(
    patient_sample_id: str,
    technician_id: str,
    original_image_bytes: bytes,
    analyzed_image_bytes: bytes,
    was_cropped: bool,
    decision_threshold: float,
    image_quality_result: dict[str, Any],
    prediction_result: dict[str, Any],
    explanation: dict[str, Any],
    temperature: str | None = None,
    blood_pressure: str | None = None,
) -> PredictionRecord:
    """
    Assembles a PredictionRecord from the pieces that already exist in
    your current /predict pipeline. This does not run any new inference --
    it packages outputs you are already computing.

    There is no human/doctor review step in this product: the report's
    "review" and "recommendation" text are generated directly from the
    model's findings (see TransparencyTrail.jsx's getRecommendation()),
    and the only technician-authored input is a free-text note. This
    record intentionally has no review-status or reviewer fields to
    match that.
    """
    return PredictionRecord(
        patient_sample_id=patient_sample_id,
        technician_id=technician_id,
        original_image_hash=hash_image_bytes(original_image_bytes),
        analyzed_image_hash=hash_image_bytes(analyzed_image_bytes),
        was_cropped=was_cropped,
        decision_threshold=decision_threshold,
        image_quality_score=image_quality_result["quality_score"],
        image_quality_breakdown=image_quality_result["breakdown"],
        anemia_probability=prediction_result["anemia_probability"],
        is_anemic=prediction_result["is_anemic"],
        prediction_confidence=prediction_result["prediction_confidence"],
        is_unreliable=prediction_result["is_unreliable"],
        unreliable_reasons=prediction_result.get("unreliable_reasons", []),
        morphology_findings=prediction_result["morphology_findings"],
        cbc_pattern_summary=prediction_result["cbc_pattern_summary"],
        explanation=explanation,
        condition=prediction_result["condition"],
        temperature=temperature,
        blood_pressure=blood_pressure,
    )

def persist_prediction_record(supabase_client: Client, record: PredictionRecord) -> str:
    """
    Writes the record to the prediction_records table and returns the
    generated prediction_id. Raises on failure rather than swallowing
    errors -- a prediction that cannot be audited should not silently
    succeed for the user while failing to log.
    """
    row = {
        "patient_sample_id": record.patient_sample_id,
        "technician_id": record.technician_id,
        "original_image_hash": record.original_image_hash,
        "analyzed_image_hash": record.analyzed_image_hash,
        "was_cropped": record.was_cropped,
        "decision_threshold": record.decision_threshold,
        "image_quality_score": record.image_quality_score,
        "image_quality_breakdown": record.image_quality_breakdown,
        "anemia_probability": record.anemia_probability,
        "is_anemic": record.is_anemic,
        "prediction_confidence": record.prediction_confidence,
        "is_unreliable": record.is_unreliable,
        "unreliable_reasons": record.unreliable_reasons,
        "morphology_findings": record.morphology_findings,
        "cbc_pattern_summary": record.cbc_pattern_summary,
        "explanation": record.explanation,
        "condition": record.condition,
        "temperature": record.temperature,
        "blood_pressure": record.blood_pressure,
        "lab_tech_notes": record.lab_tech_notes,
        "created_at": record.created_at.isoformat(),
    }
    response = supabase_client.table("prediction_records").insert(row).execute()

    if not response.data:
        raise RuntimeError(
            "Failed to persist prediction record, prediction was computed "
            "but not logged. Check Supabase connection and schema before "
            "returning a result to the client."
        )

    return response.data[0]["prediction_id"]  # type: ignore