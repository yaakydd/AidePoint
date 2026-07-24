"""
Redesigns CBC output from pseudo-lab-values into uncertainty-labeled
pattern estimates.

Why this exists: eval_report.json shows MAE for several CBC fields
larger than the clinical reference range width (e.g. Hemoglobin MAE
4.50 g/dL against a ~12-16 g/dL normal range, MCV MAE 27.45 against an
~80-100 fL range). Presenting these as "Hemoglobin = 12.5 g/dL" implies
lab-grade precision the model does not have, which is a genuine patient
safety issue, not just a display choice.

This module does not discard the regression outputs -- it re-expresses
them as directional patterns with an explicit reliability tier, and
suppresses point estimates for fields where the error exceeds a
clinically meaningful fraction of the reference range.
"""

from dataclasses import dataclass

# Reference ranges are approximate adult ranges for display purposes only.
# Do not use this dict for anything clinical -- it exists purely to compute
# whether a field's measured MAE is small enough, relative to the range,
# to be worth showing a directional estimate for.
CBC_REFERENCE_RANGES = {
    "wbc": (4.0, 11.0),           # x10^9/L
    "rbc": (4.2, 5.9),            # x10^12/L
    "hemoglobin": (12.0, 16.0),   # g/dL
    "hematocrit": (36.0, 46.0),   # %
    "mcv": (80.0, 100.0),         # fL
    "mch": (27.0, 33.0),          # pg
    "mchc": (32.0, 36.0),         # g/dL
    "platelets": (150.0, 400.0),  # x10^9/L
}

# If a field's MAE exceeds this fraction of its reference range width,
# a directional estimate is not trustworthy enough to show at all --
# the model's typical error is comparable to or larger than the entire
# normal range, so "low/normal/high" would be close to a coin flip.
MAE_TO_RANGE_SUPPRESSION_THRESHOLD = 0.60

# Below this fraction, the field is trustworthy enough to show a
# directional pattern with a stated confidence label. Between the two
# thresholds, show it but mark confidence as low.
MAE_TO_RANGE_MODERATE_THRESHOLD = 0.35


@dataclass
class CbcFieldPattern:
    field_name: str
    direction: str          # 'reduced' | 'increased' | 'within_typical_range' | 'not_estimable'
    confidence: str         # 'moderate' | 'low' | 'not_estimable'
    display_text: str


def classify_field_reliability(field_name: str, measured_mae: float) -> str:
    range_minimum, range_maximum = CBC_REFERENCE_RANGES[field_name]
    range_width = range_maximum - range_minimum
    error_fraction = measured_mae / range_width

    if error_fraction > MAE_TO_RANGE_SUPPRESSION_THRESHOLD:
        return "not_estimable"
    elif error_fraction > MAE_TO_RANGE_MODERATE_THRESHOLD:
        return "low"
    else:
        return "moderate"


def build_cbc_pattern_summary(
    raw_predicted_values: dict[str, float],
    eval_report_mae: dict[str, float],
) -> dict[str, CbcFieldPattern]:
    """
    raw_predicted_values: the model's regression output per field, e.g.
        {"hemoglobin": 10.8, "mcv": 92.0, ...}
    eval_report_mae: measured MAE per field from eval_report.json, e.g.
        {"hemoglobin": 4.50, "mcv": 27.45, ...}

    Returns a pattern summary per field. Fields classified 'not_estimable'
    should not be rendered with a direction at all in the UI -- only the
    fact that the field could not be reliably estimated from this image.
    """
    pattern_summary = {}

    for field_name, predicted_value in raw_predicted_values.items():
        if field_name not in CBC_REFERENCE_RANGES:
            continue

        measured_mae = eval_report_mae.get(field_name)
        if measured_mae is None:
            pattern_summary[field_name] = CbcFieldPattern(
                field_name=field_name,
                direction="not_estimable",
                confidence="not_estimable",
                display_text="Insufficient validation data for this field",
            )
            continue

        reliability = classify_field_reliability(field_name, measured_mae)

        if reliability == "not_estimable":
            pattern_summary[field_name] = CbcFieldPattern(
                field_name=field_name,
                direction="not_estimable",
                confidence="not_estimable",
                display_text=(
                    f"{field_name.upper()} pattern could not be reliably estimated "
                    f"from image analysis -- confirm with laboratory CBC testing"
                ),
            )
            continue

        range_minimum, range_maximum = CBC_REFERENCE_RANGES[field_name]
        if predicted_value < range_minimum:
            direction = "reduced"
        elif predicted_value > range_maximum:
            direction = "increased"
        else:
            direction = "within_typical_range"

        direction_phrase = {
            "reduced": "suggests reduced likelihood relative to typical range",
            "increased": "suggests increased likelihood relative to typical range",
            "within_typical_range": "appears within the typical image-estimated range",
        }[direction]

        confidence_phrase = "moderate confidence" if reliability == "moderate" else "low confidence"

        pattern_summary[field_name] = CbcFieldPattern(
            field_name=field_name,
            direction=direction,
            confidence=reliability,
            display_text=(
                f"Image-based {field_name.upper()} pattern {direction_phrase} "
                f"({confidence_phrase}, not a laboratory measurement)"
            ),
        )

    return pattern_summary


def serialize_pattern_summary(pattern_summary: dict[str, CbcFieldPattern]) -> dict:
    """Converts the dataclass summary into a JSON-serializable dict for
    the API response and for storage in prediction_records.cbc_pattern_summary."""
    return {
        field_name: {
            "direction": pattern.direction,
            "confidence": pattern.confidence,
            "display_text": pattern.display_text,
        }
        for field_name, pattern in pattern_summary.items()
    }
