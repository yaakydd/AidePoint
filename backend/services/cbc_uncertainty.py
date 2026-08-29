"""
Redesigns CBC output from pseudo-lab-values into uncertainty-labeled
pattern estimates.

Why this exists: eval_report.json shows MAE for several CBC fields
that can be large relative to the clinical reference range width.
Presenting these as "Hemoglobin = 12.5 g/dL" implies lab-grade precision
the model does not have, which is a genuine patient safety issue, not
just a display choice.

This module does not discard the regression outputs, it re-expresses
them as directional patterns with an explicit reliability tier, and
suppresses point estimates for fields where the error exceeds a
clinically meaningful fraction of the reference range.
"""

import os
import json
from dataclasses import dataclass

# CBC_REFERENCE_RANGES used to be hand-typed here from memory and had
# quietly drifted from the ranges eval_report.json's MAE values were
# actually computed against in the training notebook (Cell 1's
# CBC_CLINICAL_REFERENCE_RANGES) -- e.g. RBC (4.2, 5.9) here vs. the real
# (4.0, 5.2) used for evaluation. Since this file's suppression decision
# is MAE / range_width, that mismatch silently flipped RBC from
# "not_estimable" (correct, given its real 0.78 MAE/range ratio) to "low"
# (shown to the technician) -- exactly the patient-safety failure mode
# this module's own docstring says it exists to prevent.
#
# Now loaded from feature_config.json's "cbc_clinical_reference_ranges",
# the same single source of truth Cell 9 exports and model.py's
# CBC_NORMALIZATION_RANGES should eventually also read from. No more
# hand-copied numbers to drift out of sync.
FEATURE_CONFIG_PATH: str = os.getenv(
    "FEATURE_CONFIG_PATH",
    os.path.join(os.path.dirname(__file__), "..", "models", "feature_config.json"),
)


def _load_cbc_reference_ranges() -> dict[str, tuple[float, float]]:
    if not os.path.exists(FEATURE_CONFIG_PATH):
        raise FileNotFoundError(
            f"feature_config.json not found at {FEATURE_CONFIG_PATH}. This file "
            f"must be committed alongside model.py -- see Cell 9 in the training "
            f"notebook. Without it, CBC reliability suppression cannot be "
            f"computed against the same reference ranges the model was "
            f"evaluated against, and this module would have to fall back to "
            f"a hand-typed (and previously wrong) copy."
        )
    with open(FEATURE_CONFIG_PATH) as feature_config_file:
        feature_config = json.load(feature_config_file)
    return {
        field_name: tuple(bounds)
        for field_name, bounds in feature_config["cbc_clinical_reference_ranges"].items()
    }


CBC_REFERENCE_RANGES: dict[str, tuple[float, float]] = _load_cbc_reference_ranges()

# If a field's MAE exceeds this fraction of its reference range width,
# a directional estimate is not trustworthy enough to show at all 
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
    direction: str          # 'reduced', 'increased', 'within_typical_range', 'not_estimable'
    confidence: str         # 'moderate', 'low', 'not_estimable'
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
    raw_predicted_values: the model's regression output per field, keyed
        exactly as model.py's CBC_KEYS (e.g. "HAEMOGLOBIN", not
        "hemoglobin") e.g. {"HAEMOGLOBIN": 10.8, "MCV": 92.0, ...}
    eval_report_mae: measured MAE per field from eval_report.json's
        "cbc_mae_per_field" key, using the same casing.

    Returns a pattern summary per field. Fields classified 'not_estimable'
    should not be rendered with a direction at all in the UI, only the
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
                    f"{field_name} pattern could not be reliably estimated "
                    f"from image analysis, confirm with laboratory CBC testing"
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
                f"Image-based {field_name} pattern {direction_phrase} "
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