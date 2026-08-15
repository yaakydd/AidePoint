"""
Turns raw morphology probabilities and cell overlay statistics into a
human-readable explanation of why the model reached its conclusion.

This is deliberately NOT a saliency map, it does not touch model
gradients. It is a rule-based translation layer over outputs the model
already produces (morphology_probabilities, cell_overlay severity
scores). Grad-CAM, if you build it, is a separate and complementary
explanation method that shows WHERE the model looked; this module
explains WHAT it found there in clinical language. Keep both if you
have time, they answer different questions.
"""

from dataclasses import dataclass
from typing import Any

# Threshold above which a morphology flag is considered a contributing
# indicator worth surfacing to the technician, rather than background noise.
MORPHOLOGY_REPORTING_THRESHOLD = 0.5

MORPHOLOGY_DISPLAY_NAMES: dict[str, str] = {
    "dimorphic_picture": "Dimorphic red cell population detected",
    "anisocytosis": "Increased red cell size variation detected",
    "hypochromia": "Hypochromic appearance detected",
    "microcytosis": "Microcytic pattern detected",
    "macrocytosis": "Macrocytic pattern detected",
    "poikilocytosis": "Abnormal cell shape variation detected",
    "target_cells": "Target cell morphology detected",
    "elliptocytosis": "Elliptocyte morphology detected",
}


@dataclass
class CellOverlaySummary:
    cells_analyzed: int
    cells_flagged_abnormal: int
    percent_abnormal: float


@dataclass
class Explanation:
    confidence: str
    observed_indicators: list[str]
    cell_level_summary: CellOverlaySummary
    reasoning_summary: str
    limitations: str


def classify_confidence(anemia_probability: float, decision_threshold: float) -> str:
    """
    Confidence is a function of distance from the decision threshold, not
    just distance from 0.5  a probability close to the actual decision
    threshold should read as lower confidence than the same distance from
    a default 0.5 would suggest.
    """
    distance_from_threshold = abs(anemia_probability - decision_threshold)

    if distance_from_threshold >= 0.35:
        return "high"
    elif distance_from_threshold >= 0.15:
        return "moderate"
    else:
        return "low"


def summarize_cell_overlay(cell_overlay: list[dict[str, Any]]) -> CellOverlaySummary:
    """
    Reduces the per-cell overlay data (already computed for the frontend
    drawing feature) into summary statistics for the explanation text.
    """
    if not cell_overlay:
        return CellOverlaySummary(
            cells_analyzed=0,
            cells_flagged_abnormal=0,
            percent_abnormal=0.0,
        )

    severity_flag_threshold = 0.5
    flagged_cells = [
        cell for cell in cell_overlay
        if cell.get("severity", 0.0) >= severity_flag_threshold
    ]

    return CellOverlaySummary(
        cells_analyzed=len(cell_overlay),
        cells_flagged_abnormal=len(flagged_cells),
        percent_abnormal=round(100 * len(flagged_cells) / len(cell_overlay), 1),
    )


def build_explanation(
    anemia_probability: float,
    decision_threshold: float,
    morphology_probabilities: dict[str, float],
    cell_overlay: list[dict[str, Any]],
) -> Explanation:
    """
    Produces the explanation block attached to every prediction record
    and shown in the clinical report.

    morphology_probabilities: e.g. {"hypochromia": 0.82, "microcytosis": 0.71, ...}
    cell_overlay: the same list already used to draw the client-side overlay
    """
    confidence = classify_confidence(anemia_probability, decision_threshold)

    observed_indicators = [
        MORPHOLOGY_DISPLAY_NAMES.get(flag_name, flag_name.replace("_", " ").capitalize())
        for flag_name, probability in morphology_probabilities.items()
        if probability >= MORPHOLOGY_REPORTING_THRESHOLD
        and flag_name != "normal_morphology"
    ]

    cell_summary = summarize_cell_overlay(cell_overlay)

    if not observed_indicators:
        reasoning_summary = (
            "No individual morphology flag exceeded the reporting threshold. "
            "The overall classification is driven by distributed image-level "
            "features rather than a single dominant indicator."
        )
    else:
        reasoning_summary = (
            f"Classification is supported by {len(observed_indicators)} morphology "
            f"indicator(s) and cell-level analysis showing "
            f"{cell_summary.percent_abnormal}% of the "
            f"{cell_summary.cells_analyzed} detected cells with abnormal shape "
            f"characteristics."
        )

    return Explanation(
        confidence=confidence,
        observed_indicators=observed_indicators,
        cell_level_summary=cell_summary,
        reasoning_summary=reasoning_summary,
        limitations=(
            "This explanation describes which detected features the model's "
            "morphology and shape analysis found, not a pixel-level attribution "
            "of the anemia classifier itself. It should be read as supporting "
            "context, not as proof of causation."
        ),
    )