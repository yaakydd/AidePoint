from dataclasses import dataclass
from datetime import datetime, timezone
from postgrest import CountMethod
from services.subscription import SCAN_LIMITS, DEFAULT_TIER, get_subscription_tier

import logging

log = logging.getLogger("aidepoint")


@dataclass
class ScanLimitStatus:
    effective_limit: int
    today_count: int          # count BEFORE this attempt
    scans_remaining: int      # after this attempt is counted


def _has_image_consent(supabase_client, user_id: str) -> bool:
    """
    Server-side mirror of the frontend's hasImageConsent() in
    scanStorage.js. Fails closed, same as the frontend: if consent
    can't be confirmed, treat it as not consented.
    """
    try:
        result = (
            supabase_client.table("profiles")
            .select("store_images")
            .eq("id", user_id)
            .single()
            .execute()
        )
        return bool(result.data and result.data.get("store_images"))
    except Exception as exc:
        log.warning("Failed to check image consent for user %s: %s", user_id, exc)
        return False  # fail closed


def check_and_enforce_scan_limit(supabase_client, user_id: str) -> ScanLimitStatus | None:
    """
    Server-side counterpart to scanStorage.js's client-side scan-limit
    display (see getRemainingScansFromPredictResponse). This is the real,
    authoritative limit -- a client that calls /predict directly, bypassing
    the app UI entirely, must not be able to get unlimited free inferences.

    Bonus requires BOTH: enough scans today to hit save_goal, AND
    image-storage consent (matches the frontend's old bonus gate of
    `bonusGranted && consented`, now computed once, here, instead of
    separately on the client). Previously this only checked
    attempted_count > save_goal without checking consent, so a technician
    with image storage OFF could still be granted (and shown) a bonus
    scan -- that's what produced "limit reached (6)" with storage off.

    Returns a ScanLimitStatus (so the caller can report scans_remaining
    back to the client on a successful request, keeping the app's
    "N remaining" display and the server's enforcement reading the same
    number) or None if supabase_client is unavailable, or the tier is
    unlimited -- an outage in the audit/limits store should not be able
    to block every scan in the app the way it already doesn't block
    /predict's own persistence step, and the caller should treat None as
    "don't report a remaining count."

    Raises HTTPException(429) if the technician is at or over their
    tier's effective daily limit.
    """
    if supabase_client is None:
        return None

    from fastapi import HTTPException, status  # local import to avoid a
    # circular import at module load time (services -> fastapi is fine,
    # but keeping predict.py's own HTTPException usage as the "normal"
    # place this is raised from stays clearer if this helper imports it
    # itself rather than expecting callers to catch a bare exception).

    tier = get_subscription_tier(supabase_client, user_id)
    limits = SCAN_LIMITS.get(tier, SCAN_LIMITS[DEFAULT_TIER])
    daily_limit = limits["daily_limit"]
    if daily_limit is None:
        return None  # unlimited tier (e.g. "pro") -- nothing meaningful to report

    start_of_today = datetime.now(timezone.utc).replace(
        hour=0, minute=0, second=0, microsecond=0
    ).isoformat()

    count_result = (
        supabase_client.table("prediction_records")
        .select("prediction_id", count=CountMethod.exact)
        .eq("technician_id", user_id)
        .gte("created_at", start_of_today)
        .execute()
    )
    today_count: int = count_result.count or 0
    attempted_count = today_count + 1

    consented = _has_image_consent(supabase_client, user_id)
    bonus_active = attempted_count > limits["save_goal"] and consented
    effective_limit = daily_limit + (limits["bonus_scans"] if bonus_active else 0)

    if today_count >= effective_limit:
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail={
                "error": "scan_limit_reached",
                "message": (
                    f"You've reached your daily scan limit ({effective_limit}) for the "
                    f"{tier} plan. Upgrade your plan for a higher daily limit."
                ),
                "tier": tier,
                "daily_limit": effective_limit,
            },
        )

    # attempted_count (not today_count) because this request is about to
    # count as a completed scan by the time the response reaches the app.
    return ScanLimitStatus(
        effective_limit=effective_limit,
        today_count=today_count,
        scans_remaining=max(effective_limit - attempted_count, 0),
    )


def _extract_image_quality_fields(quality_result) -> tuple[str, dict]:
    """
    Pulls the fields audit_trail.py's build_prediction_record needs out
    of assess_image_quality's ImageQualityResult. That dataclass is flat
    (quality_score alongside blur/brightness/contrast/etc, not nested
    under its own "breakdown" key), so the breakdown stored in the audit
    record is everything except quality_score itself, the individual
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
    Full per-flag record for storage, all 9 flags with their raw
    probability and whether they cleared the reporting threshold used in
    morphology_explanations.py, not just the subset surfaced in
    observed_indicators. The stored audit record should retain what the
    model actually output, independent of what a report chooses to
    display.

    Threshold is per-flag (see model.MORPHOLOGY_REPORTING_THRESHOLDS,
    sourced from Cell 10's F2-optimized sweep), not a single blanket 0.5
    -- previously every flag used the same untuned 0.5 cutoff regardless
    of whether that flag's own threshold sweep found a better operating
    point, which meant the "moderate" flags (anisocytosis, target_cells)
    weren't actually getting the tuning the notebook computed for them.
    """
    from services.model import MORPHOLOGY_REPORTING_THRESHOLDS

    return {
        flag_name: {
            "probability": probability,
            "flagged": probability >= MORPHOLOGY_REPORTING_THRESHOLDS.get(flag_name, 0.5),
        }
        for flag_name, probability in morphology_probs.items()
    }