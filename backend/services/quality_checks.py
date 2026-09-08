import numpy as np
import cv2


def compute_embedding_distance(image_embedding: np.ndarray, reference_stats: dict) -> float:
    reference_mean = np.array(reference_stats["embedding_mean"], dtype=np.float32)
    reference_std = np.array(reference_stats["embedding_std"], dtype=np.float32)
    # Guard against a zero std in any dimension producing inf/nan and
    # silently poisoning the norm. None of the current ood_stats.json
    # values are zero, but nothing enforces that going forward.
    safe_std = np.where(reference_std > 1e-6, reference_std, 1e-6)
    return float(np.linalg.norm((image_embedding - reference_mean) / safe_std))


def hue_circular_distance(hue_a: float, hue_b: float, hue_range: float = 180.0) -> float:
    """
    OpenCV's H channel is 0-179 and wraps (179 is adjacent to 0, both
    are red). A plain abs(a - b) treats hues on opposite sides of the
    wrap point as maximally different when they are actually close.
    """
    raw_difference = abs(hue_a - hue_b)
    return min(raw_difference, hue_range - raw_difference)


def run_color_and_vignette_checks(raw_resized_image: np.ndarray, reference_stats: dict) -> list[str]:
    reasons: list[str] = []
    image_size = raw_resized_image.shape[0]
    hsv_image = cv2.cvtColor(raw_resized_image, cv2.COLOR_BGR2HSV).astype(np.float32)
    hue_mean = hsv_image[..., 0].mean()
    saturation_mean = hsv_image[..., 1].mean()
    value_mean = hsv_image[..., 2].mean()

    grayscale_image = cv2.cvtColor(raw_resized_image, cv2.COLOR_BGR2GRAY).astype(np.float32)
    edge_thickness = image_size // 8
    corner_pixels = np.concatenate([
        grayscale_image[:edge_thickness, :edge_thickness].ravel(),
        grayscale_image[:edge_thickness, -edge_thickness:].ravel(),
        grayscale_image[-edge_thickness:, :edge_thickness].ravel(),
        grayscale_image[-edge_thickness:, -edge_thickness:].ravel(),
    ])
    center_pixels = grayscale_image[
        image_size // 2 - edge_thickness:image_size // 2 + edge_thickness,
        image_size // 2 - edge_thickness:image_size // 2 + edge_thickness,
    ].ravel()
    vignette_ratio = float(corner_pixels.mean()) / (float(center_pixels.mean()) + 1e-6)

    hue_distance = hue_circular_distance(float(hue_mean), float(reference_stats["hue_mean"]))
    if hue_distance > 3 * reference_stats["hue_std"]:
        reasons.append(
            "Color/staining palette looks unusual for this app's expected stain type. "
            "Check the smear was stained with the standard reagent, and check your phone's "
            "white balance/lighting before retaking the photo."
        )

    if abs(saturation_mean - reference_stats["sat_mean"]) > 3 * reference_stats["sat_std"]:
        reasons.append(
            "Color/staining palette looks unusual for this app's expected stain type. "
            "Check the smear was stained with the standard reagent, and check your phone's "
            "white balance/lighting before retaking the photo."
        )

    # ood_stats.json stores val_mean/val_std (the HSV value channel's
    # training-distribution statistics) but nothing previously checked
    # against them; this reintroduces the missing check so that data
    # isn't computed and saved for nothing. This is a distributional
    # check (does this look like training data), distinct from
    # image_quality.py's fixed brightness range (is this within an
    # absolute acceptable range) -- an image can pass one and fail the
    # other.
    if abs(value_mean - reference_stats["val_mean"]) > 3 * reference_stats["val_std"]:
        reasons.append(
            "Overall image brightness looks unusual compared to this app's expected "
            "capture conditions. Check your lighting and camera exposure settings before "
            "retaking the photo."
        )

    if vignette_ratio < reference_stats["vignette_min_ratio"]:
        reasons.append(
            "Photo looks like an uncropped raw microscope eyepiece shot with dark corners "
            "rather than a framed slide capture. Recapture using the in-app framing guide "
            "so the smear fills the frame evenly."
        )
    return reasons


def run_reliability_gate(
    image_embedding: np.ndarray, raw_resized_image: np.ndarray, reference_stats: dict
) -> tuple[bool, list[str]]:
    reasons = run_color_and_vignette_checks(raw_resized_image, reference_stats)
    embedding_distance = compute_embedding_distance(image_embedding, reference_stats)
    if embedding_distance > reference_stats["embedding_distance_threshold"]:
        reasons.append(
            "This image looks meaningfully different from the samples this model was "
            "trained on (unusual magnification, sample prep, or camera setup). "
            "Try recapturing with standard magnification and the in-app framing guide, "
            "or treat this result as needing manual microscopic review."
        )
    return len(reasons) > 0, reasons
