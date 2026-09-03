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
    image_consent: bool       # profiles.store_images, computed once here so
                               # route_and_upload_screening_image doesn't
                               # need to re-query it


def has_image_consent(supabase_client, user_id: str) -> bool:
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


# Kept as an internal alias -- check_and_enforce_scan_limit below already
# calls this under its old private name.
_has_image_consent = has_image_consent


def _count_today_and_effective_limit(
    supabase_client, user_id: str
) -> tuple[str, int | None, int, int] | None:
    """
    Shared counting core for both check_and_enforce_scan_limit (an actual
    attempt, about to count as +1) and get_scan_limit_status (a read-only
    "what would the app show right now" query, no pending attempt).
    Returns (tier, daily_limit, today_count, effective_limit) or None if
    supabase_client is unavailable. daily_limit is None for unlimited tiers
    -- callers should treat that as "nothing meaningful to enforce/report."

    The bonus computation intentionally uses today_count (not
    today_count + 1) here, i.e. "has the technician already hit save_goal
    today", so a read-only status check and an in-flight attempt agree on
    whether the bonus is active without the status check ever nudging the
    count forward itself.
    """
    if supabase_client is None:
        return None

    tier = get_subscription_tier(supabase_client, user_id)
    limits = SCAN_LIMITS.get(tier, SCAN_LIMITS[DEFAULT_TIER])
    daily_limit = limits["daily_limit"]
    if daily_limit is None:
        return tier, None, 0, 0  # unlimited tier -- caller returns early

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

    consented = _has_image_consent(supabase_client, user_id)
    bonus_active = today_count >= limits["save_goal"] and consented
    effective_limit = daily_limit + (limits["bonus_scans"] if bonus_active else 0)

    return tier, daily_limit, today_count, effective_limit


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
    from fastapi import HTTPException, status  # local import to avoid a
    # circular import at module load time (services -> fastapi is fine,
    # but keeping predict.py's own HTTPException usage as the "normal"
    # place this is raised from stays clearer if this helper imports it
    # itself rather than expecting callers to catch a bare exception).

    counts = _count_today_and_effective_limit(supabase_client, user_id)
    if counts is None:
        return None
    tier, daily_limit, today_count, effective_limit = counts
    if daily_limit is None:
        return None  # unlimited tier (e.g. "pro") -- nothing meaningful to report

    attempted_count = today_count + 1

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

    consented = _has_image_consent(supabase_client, user_id)
    # attempted_count (not today_count) because this request is about to
    # count as a completed scan by the time the response reaches the app.
    return ScanLimitStatus(
        effective_limit=effective_limit,
        today_count=today_count,
        scans_remaining=max(effective_limit - attempted_count, 0),
        image_consent=consented,
    )


def get_scan_limit_status(supabase_client, user_id: str) -> ScanLimitStatus | None:
    """
    Read-only counterpart to check_and_enforce_scan_limit, for the Scan
    screen's "SCANS TODAY" banner to show a real count as soon as the
    screen mounts, rather than staying blank until the first scan of the
    session completes (see Scan.jsx's old "no client-side way to know the
    count before the first scan" comment -- this endpoint is that way).

    Never raises, never advances the count -- it reports where things
    stand right now. Returns None on the same "nothing meaningful to
    report" conditions as check_and_enforce_scan_limit (no supabase
    client, or an unlimited tier).
    """
    counts = _count_today_and_effective_limit(supabase_client, user_id)
    if counts is None:
        return None
    tier, daily_limit, today_count, effective_limit = counts
    if daily_limit is None:
        return None

    consented = _has_image_consent(supabase_client, user_id)
    return ScanLimitStatus(
        effective_limit=effective_limit,
        today_count=today_count,
        scans_remaining=max(effective_limit - today_count, 0),
        image_consent=consented,
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
    from services.model import MORPHOLOGY_REPORTING_THRESHOLDS, MORPHOLOGY_FLAG_TIER
    from services.morphology_explanations import MORPHOLOGY_DISPLAY_NAMES

    return {
        flag_name: {
            "probability": probability,
            "flagged": probability >= MORPHOLOGY_REPORTING_THRESHOLDS.get(flag_name, 0.5),
            # display_label/tier let the frontend show a real label and a
            # confidence signal instead of flag_name.replace('_', ' ')
            # with no indication that e.g. target_cells (F1 0.41) and
            # hypochromia (F1 0.89) are not equally trustworthy findings.
            "display_label": MORPHOLOGY_DISPLAY_NAMES.get(
                flag_name, flag_name.replace("_", " ").capitalize()
            ),
            "tier": MORPHOLOGY_FLAG_TIER.get(flag_name, "strong"),
        }
        for flag_name, probability in morphology_probs.items()
    }
