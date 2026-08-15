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
            f"unusual color/staining palette (hue {hue_mean:.0f} vs expected "
            f"~{reference_stats['hue_mean']:.0f}\u00b1{reference_stats['hue_std']:.0f}, "
            f"saturation {saturation_mean:.0f} vs ~{reference_stats['sat_mean']:.0f}"
            f"\u00b1{reference_stats['sat_std']:.0f}) , may be a different stain "
            f"type, white balance, or lighting setup"
        )
    if vignette_ratio < reference_stats["vignette_min_ratio"]:
        reasons.append(
            f"dark-cornered / circular vignette detected (corner-to-center "
            f"brightness ratio {vignette_ratio:.2f}) , looks like an "
            f"uncropped raw microscope eyepiece photo rather than a framed "
            f"slide capture; ask the user to recapture using the in-app "
            f"framing guide"
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
            f"embedding distance {embedding_distance:.2f} exceeds trained-data "
            f"spread (threshold {reference_stats['embedding_distance_threshold']:.2f})"
        )
    return len(reasons) > 0, reasons