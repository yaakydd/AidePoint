"""
Server-side image quality assessment for incoming smear photos.

This runs BEFORE the anemia model. It asks one narrow question: "is this
photo sharp enough, and does it contain enough cells, to analyze at all."

SCOPE NOTE (intentionally reduced): this module previously also checked
brightness, contrast, and staining consistency. Those checks were removed.
Reasoning: unlike blur (calibrated against a labeled batch of known
in-focus vs out-of-focus AneRBC-II samples, see BLUR_VARIANCE_MINIMUM
below), the brightness/contrast/staining thresholds had no documented
empirical calibration -- they were reasonable-sounding fixed numbers, not
values validated against real labeled good/bad photos. Stacking multiple
unvalidated checks together compounds false-flag risk (even a low
per-check false-positive rate adds up across several independent checks
OR'd together) without a measured benefit to show for it. Cutting this
down to the one check with real evidence behind it, plus the hard
structural requirement (enough cells to analyze at all), is a smaller,
more honestly-defensible reliability gate. Re-adding a check here should
only happen once its specific threshold has been validated against a
labeled batch of real good/bad photos, the same way blur was -- see
AidePoint_Documentation.md for that write-up.
"""

from dataclasses import dataclass

import cv2
import numpy as np

# Below this Laplacian variance, the image is considered too blurry for
# reliable cell boundary detection. Calibrated against a batch of known
# in-focus vs out-of-focus AneRBC-II samples.
BLUR_VARIANCE_MINIMUM = 100.0

# Fewer detected cells than this makes per-cell morphology statistics
# unreliable regardless of how sharp the image is. This is a structural
# requirement, not a quality judgment -- distinct from blur, it can't be
# "recalibrated," it's simply whether there's enough to measure.
MINIMUM_CELLS_FOR_RELIABLE_ANALYSIS = 15


@dataclass
class ImageQualityResult:
    quality_score: str          # 'good', 'poor'
    blur_score: float
    cells_detected: int
    failure_reasons: list[str]


def measure_blur(grayscale_image: np.ndarray) -> float:
    """Laplacian variance -- a sharp image has high-frequency edges that
    produce high variance under the Laplacian operator; a blurry image
    does not."""
    return float(cv2.Laplacian(grayscale_image, cv2.CV_64F).var())


def assess_image_quality(bgr_image: np.ndarray, detected_cell_count: int) -> ImageQualityResult:
    """
    detected_cell_count should come from the existing watershed
    segmentation step in shape_screening.py -- this module does not
    re-run segmentation, it just interprets the count.
    """
    grayscale_image = cv2.cvtColor(bgr_image, cv2.COLOR_BGR2GRAY)

    blur_score = measure_blur(grayscale_image)

    failure_reasons = []

    if blur_score < BLUR_VARIANCE_MINIMUM:
        failure_reasons.append(
            "Image is too blurry for reliable cell boundary detection. "
            "Hold the camera steady, let it auto-focus on the smear before capturing, "
            "and retake the photo."
        )

    if detected_cell_count < MINIMUM_CELLS_FOR_RELIABLE_ANALYSIS:
        failure_reasons.append(
            f"Only {detected_cell_count} cells detected, fewer than the "
            f"{MINIMUM_CELLS_FOR_RELIABLE_ANALYSIS} needed for reliable analysis. "
            "Recapture a denser field of the smear, or select a monolayer region with more cells in view."
        )

    quality_score = "poor" if failure_reasons else "good"

    return ImageQualityResult(
        quality_score=quality_score,
        blur_score=blur_score,
        cells_detected=detected_cell_count,
        failure_reasons=failure_reasons,
    )


def should_block_inference(quality_result: ImageQualityResult) -> bool:
    """
    A 'poor' score does not necessarily mean the model can't run -- it
    means the result should be labeled low-trust and require human
    review. The only hard block is zero usable cells, since morphology
    and CBC pattern outputs are meaningless with nothing detected.
    """
    return quality_result.cells_detected == 0
