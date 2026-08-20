import numpy as np
import cv2

def compute_embedding_distance(image_embedding: np.ndarray, reference_stats: dict) -> float:
    """
    Per-dimension z-score distance of this image's embedding from the
    training distribution's center. Larger means less like anything the
    model actually learned from.
    """
    reference_mean = np.array(reference_stats["embedding_mean"], dtype=np.float32)
    reference_std = np.array(reference_stats["embedding_std"], dtype=np.float32)
    return float(np.linalg.norm((image_embedding - reference_mean) / reference_std))


def run_color_and_vignette_checks(raw_resized_image: np.ndarray, reference_stats: dict) -> list[str]:
    """
    raw_resized_image: the (260, 260, 3) uint8 BGR image from
                        preprocess_image(), BEFORE ImageNet normalization.
    reference_stats: the loaded ood_stats.json dict.

    Returns a list of human-readable reasons the image looks unlike
    training data. An empty list means it looks fine on these signals.
    """
    reasons: list[str] = []
    image_size = raw_resized_image.shape[0]

    hsv_image = cv2.cvtColor(raw_resized_image, cv2.COLOR_BGR2HSV).astype(np.float32)
    hue_mean, saturation_mean = hsv_image[..., 0].mean(), hsv_image[..., 1].mean()

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

    if (abs(hue_mean - reference_stats["hue_mean"]) > 3 * reference_stats["hue_std"]
            or abs(saturation_mean - reference_stats["sat_mean"]) > 3 * reference_stats["sat_std"]):
        reasons.append(
            "Color/staining palette looks unusual for this app's expected stain type. "
            "Check the smear was stained with the standard reagent, and check your phone's "
            "white balance/lighting before retaking the photo."
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
    """Combines both signals. Returns (is_unreliable, reasons)."""
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
