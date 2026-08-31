"""
Uploads analyzed screening images to the existing "scan-images" Supabase
Storage bucket, routed under one of three path prefixes:

    scan-images/{technician_id}/anemia/{patient_session_id}_{utc_timestamp}.png
    scan-images/{technician_id}/healthy/{patient_session_id}_{utc_timestamp}.png
    scan-images/{technician_id}/unknown/{patient_session_id}_{utc_timestamp}.png

The {technician_id} prefix is required, not cosmetic: the bucket's
existing RLS policies (see scan_images_columns_migration.sql) gate
SELECT/UPDATE/DELETE on (storage.foldername(name))[1] = auth.uid(). A
path that doesn't start with the uploading technician's own UID would
upload fine (the backend uses the service-role key, which bypasses RLS)
but could never be read back by that technician through their own
session -- only through the backend re-fetching it with service-role
privileges. Prefixing here keeps both paths open.

Routing (determine_storage_bucket) is deliberately independent of the
`condition` string used elsewhere: `condition` already downgrades to
"unknown" for a non-anemia morphology flag on a provisional-healthy
read, which is a *clinical* decision, not a *storage-confidence*
decision. Storage only cares whether the raw binary read itself was
trustworthy (OOD/quality gate) or too close to the decision boundary
to file as a clean example -- so it reads is_unreliable and
anemia_probability directly, not condition.
"""

import logging
from dataclasses import dataclass
from datetime import datetime, timezone

from supabase import Client

log = logging.getLogger("aidepoint")

BUCKET_NAME = "scan-images"

# Half-width of the "too close to call" band around decision_threshold.
# A probability within +/- this margin of the threshold is filed as
# "unknown" even if the raw gate passed, since a hair on either side of
# the boundary is not a confident anemia/healthy example to bucket by.
UNCERTAINTY_MARGIN = 0.05


@dataclass
class StorageRouteResult:
    bucket_prefix: str          # "anemia" | "healthy" | "unknown"
    storage_path: str           # full path within the bucket
    confidence_score: float     # distance from the decision boundary, 0-1


def determine_storage_bucket(
    anemia_probability: float,
    decision_threshold: float,
    is_unreliable: bool,
) -> str:
    """Returns one of 'anemia', 'healthy', 'unknown'."""
    if is_unreliable:
        return "unknown"
    if abs(anemia_probability - decision_threshold) <= UNCERTAINTY_MARGIN:
        return "unknown"
    return "anemia" if anemia_probability >= decision_threshold else "healthy"


def compute_confidence_score(anemia_probability: float, decision_threshold: float) -> float:
    """
    Normalized distance from the decision threshold, scaled so a
    probability at the threshold is 0.0 confidence and a probability at
    0.0 or 1.0 is 1.0 confidence. This is a storage/UI-facing confidence
    number, not the same thing as prediction_confidence's
    excellent/good/poor bucket already computed elsewhere.
    """
    if anemia_probability >= decision_threshold:
        span = max(1.0 - decision_threshold, 1e-6)
        return round(min((anemia_probability - decision_threshold) / span, 1.0), 4)
    span = max(decision_threshold, 1e-6)
    return round(min((decision_threshold - anemia_probability) / span, 1.0), 4)


def build_storage_path(technician_id: str, patient_session_id: str, bucket_prefix: str) -> str:
    utc_timestamp = datetime.now(timezone.utc).strftime("%Y%m%dT%H%M%S%fZ")
    # Guard against a patient_session_id containing path separators or
    # other characters that would escape the intended prefix.
    safe_session_id = "".join(
        ch for ch in patient_session_id if ch.isalnum() or ch in ("-", "_")
    ) or "unknown_session"
    # technician_id is a Supabase auth UID (uuid), not user input, so it
    # isn't sanitized the same way -- but guard anyway in case that ever
    # changes, rather than trusting it blindly in a storage path.
    safe_technician_id = "".join(
        ch for ch in technician_id if ch.isalnum() or ch in ("-", "_")
    ) or "unknown_technician"
    return f"{safe_technician_id}/{bucket_prefix}/{safe_session_id}_{utc_timestamp}.png"


def route_and_upload_screening_image(
    supabase_client: Client | None,
    technician_id: str,
    patient_session_id: str,
    analyzed_image_png_bytes: bytes,
    anemia_probability: float,
    decision_threshold: float,
    is_unreliable: bool,
) -> StorageRouteResult | None:
    """
    Determines the bucket prefix, uploads the image, and returns the
    route + confidence so the caller can persist/return both. Returns
    None (rather than raising) if the Supabase client isn't configured
    or the upload fails -- storage is best-effort and must never block
    or fail the /predict response itself, the same way
    persist_prediction_record's failure handling in predict.py works.
    """
    bucket_prefix = determine_storage_bucket(
        anemia_probability, decision_threshold, is_unreliable
    )
    confidence_score = compute_confidence_score(anemia_probability, decision_threshold)
    storage_path = build_storage_path(technician_id, patient_session_id, bucket_prefix)

    if supabase_client is None:
        log.error(
            "Screening image NOT saved (Supabase client not configured on "
            "this server) -- session_id=%r for technician=%r would have "
            "gone to '%s/%s'. The /predict response was not affected, but "
            "this image and its confidence score are lost. Fix: set the "
            "Supabase env vars (URL + service role key) so the backend "
            "can create a Supabase client on startup.",
            patient_session_id, technician_id, BUCKET_NAME, storage_path,
        )
        return None

    try:
        supabase_client.storage.from_(BUCKET_NAME).upload(
            path=storage_path,
            file=analyzed_image_png_bytes,
            file_options={"content-type": "image/png"},
        )
    except Exception as exc:
        log.error(
            "Screening image upload FAILED for session_id=%r "
            "(technician=%r) -- tried to save to '%s/%s' but got a %s: "
            "%s. The /predict response was not affected, but this image "
            "and its confidence score are lost. Common causes: the "
            "'scan-images' bucket's policies rejecting this path, the "
            "service-role key lacking storage permissions, or a network/"
            "timeout error reaching Supabase.",
            patient_session_id, technician_id, BUCKET_NAME, storage_path,
            type(exc).__name__, exc,
        )
        return None

    return StorageRouteResult(
        bucket_prefix=bucket_prefix,
        storage_path=storage_path,
        confidence_score=confidence_score,
    )
