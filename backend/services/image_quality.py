"""
Server-side image quality assessment for incoming smear photos.

This runs BEFORE the anemia model and BEFORE the existing reliability
gate (embedding distance + shape screening in quality_checks.py /
shape_screening.py). The distinction matters: this module asks "is this
photo usable at all," the reliability gate asks "does this usable photo
look like something our model was trained on." A photo can pass this
quality check and still get flagged unreliable, and a photo that fails
this check should never reach the model in the first place.

The frontend should still run a cheap pre-check (blur/brightness) before
upload, purely to save the technician a round trip on an obviously bad
shot. This module is the authoritative check -- it is what actually
gets logged in the audit trail and what actually gates whether
inference runs.
"""

from dataclasses import dataclass

import cv2
import numpy as np

# Below this Laplacian variance, the image is considered too blurry for
# reliable cell boundary detection. Calibrated against a batch of known
# in-focus vs out-of-focus AneRBC-II samples -- revisit if you change
# camera source or magnification.
BLUR_VARIANCE_MINIMUM = 100.0

# Mean pixel intensity (0-255) outside this range indicates the photo is
# under- or over-exposed to a degree that affects color-based morphology
# flags like hypochromia.
BRIGHTNESS_ACCEPTABLE_RANGE = (60, 200)

# Minimum standard deviation of pixel intensity, used as a proxy for
# contrast. A washed-out or overly uniform image will fall below this.
CONTRAST_MINIMUM = 30.0

# Fewer detected cells than this makes per-cell morphology statistics
# unreliable regardless of how sharp the image is.
MINIMUM_CELLS_FOR_RELIABLE_ANALYSIS = 15


@dataclass
class ImageQualityResult:
    quality_score: str          # 'excellent' | 'good' | 'poor'
    blur_score: float
    brightness_score: float
    contrast_score: float
    cells_detected: int
    staining_quality: str       # 'normal' | 'over_stained' | 'under_stained' | 'uneven'
    failure_reasons: list[str]


def measure_blur(grayscale_image: np.ndarray) -> float:
    """Laplacian variance -- a sharp image has high-frequency edges that
    produce high variance under the Laplacian operator; a blurry image
    does not."""
    return float(cv2.Laplacian(grayscale_image, cv2.CV_64F).var())


def measure_brightness_and_contrast(grayscale_image: np.ndarray) -> tuple[float, float]:
    mean_intensity = float(np.mean(grayscale_image))
    intensity_std_dev = float(np.std(grayscale_image))
    return mean_intensity, intensity_std_dev


def assess_staining_quality(bgr_image: np.ndarray) -> str:
    """
    Rough check for stain consistency using color channel balance.
    A well-stained Giemsa/Wright smear has a fairly consistent
    purple-pink cast; heavy skew toward one channel or very low
    saturation suggests staining problems rather than a sample problem.
    """
    hsv_image = cv2.cvtColor(bgr_image, cv2.COLOR_BGR2HSV)
    saturation_channel = hsv_image[:, :, 1]
    mean_saturation = float(np.mean(saturation_channel))

    low_saturation_threshold = 40
    high_saturation_threshold = 200

    if mean_saturation < low_saturation_threshold:
        return "under_stained"
    if mean_saturation > high_saturation_threshold:
        return "over_stained"

    saturation_std_dev = float(np.std(saturation_channel))
    uneven_staining_threshold = 55
    if saturation_std_dev > uneven_staining_threshold:
        return "uneven"

    return "normal"


def assess_image_quality(bgr_image: np.ndarray, detected_cell_count: int) -> ImageQualityResult:
    """
    detected_cell_count should come from the existing watershed
    segmentation step in shape_screening.py -- this module does not
    re-run segmentation, it just interprets the count.
    """
    grayscale_image = cv2.cvtColor(bgr_image, cv2.COLOR_BGR2GRAY)

    blur_score = measure_blur(grayscale_image)
    brightness_score, contrast_score = measure_brightness_and_contrast(grayscale_image)
    staining_quality = assess_staining_quality(bgr_image)

    failure_reasons = []

    if blur_score < BLUR_VARIANCE_MINIMUM:
        failure_reasons.append("Image is too blurry for reliable cell boundary detection")

    brightness_minimum, brightness_maximum = BRIGHTNESS_ACCEPTABLE_RANGE
    if not (brightness_minimum <= brightness_score <= brightness_maximum):
        failure_reasons.append("Image brightness is outside the acceptable range")

    if contrast_score < CONTRAST_MINIMUM:
        failure_reasons.append("Image contrast is too low to distinguish cell features")

    if detected_cell_count < MINIMUM_CELLS_FOR_RELIABLE_ANALYSIS:
        failure_reasons.append(
            f"Only {detected_cell_count} cells detected, "
            f"fewer than the {MINIMUM_CELLS_FOR_RELIABLE_ANALYSIS} needed for reliable analysis"
        )

    if staining_quality != "normal":
        failure_reasons.append(f"Staining quality issue detected: {staining_quality}")

    if len(failure_reasons) == 0:
        quality_score = "excellent"
    elif len(failure_reasons) <= 1:
        quality_score = "good"
    else:
        quality_score = "poor"

    return ImageQualityResult(
        quality_score=quality_score,
        blur_score=blur_score,
        brightness_score=brightness_score,
        contrast_score=contrast_score,
        cells_detected=detected_cell_count,
        staining_quality=staining_quality,
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
