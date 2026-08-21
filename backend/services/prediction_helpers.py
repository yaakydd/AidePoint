from datetime import datetime, timezone
from postgrest import CountMethod
from services.subscription import SCAN_LIMITS, DEFAULT_TIER, get_subscription_tier


def check_and_enforce_scan_limit(supabase_client, user_id: str) -> None:
        """
        Server-side counterpart to scanStorage.js's client-side scan-limit
        pre-check. The client-side check exists purely for UX (avoid a wasted
        upload/compress/round-trip on an obviously-over-limit device); this
        is the real, authoritative limit -- a client that calls /predict
        directly, bypassing the app UI entirely, must not be able to get
        unlimited free inferences.

        Mirrors the frontend's bonus-scan formula (see scanStorage.js /
        SubscriptionPlans.js): once a technician has saved >= save_goal
        images today, they earn bonus_scans extra scans for the rest of that
        day. Rather than track "was the bonus already granted today" in a
        separate flag, this recomputes it from the attempted scan number:
        if this request would be the Nth scan of the day and N > save_goal,
        the bonus (if any) is already in effect.

        Raises HTTPException(429) if the technician is at or over their
        tier's effective daily limit; returns None (no-op) otherwise,
        including if supabase_client is unavailable -- an outage in the
        audit/limits store should not be able to block every scan in the app
        the way it already doesn't block /predict's own persistence step.
        """
        if supabase_client is None:
            return

        from fastapi import HTTPException, status  # local import to avoid a
        # circular import at module load time (services -> fastapi is fine,
        # but keeping predict.py's own HTTPException usage as the "normal"
        # place this is raised from stays clearer if this helper imports it
        # itself rather than expecting callers to catch a bare exception).

        tier = get_subscription_tier(supabase_client, user_id)
        limits = SCAN_LIMITS.get(tier, SCAN_LIMITS[DEFAULT_TIER])
        daily_limit = limits["daily_limit"]
        if daily_limit is None:
            return  # unlimited tier (e.g. "pro")

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

        bonus_active = attempted_count > limits["save_goal"]
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


def _extract_image_quality_fields(quality_result) -> tuple[str, dict]:
        """
        Pulls the fields audit_trail.py's build_prediction_record needs out
        of assess_image_quality's ImageQualityResult. That dataclass is flat
        (quality_score alongside blur/brightness/contrast/etc, not nested
        under its own "breakdown" key), so the breakdown stored in the audit
        record is everything except quality_score itself , the individual
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
        Full per-flag record for storage , all 9 flags with their raw
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
