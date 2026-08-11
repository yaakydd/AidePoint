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