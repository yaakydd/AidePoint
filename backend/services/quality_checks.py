# quality_checks.py
# The reliability gate: catches inputs that don't match what AidePoint's
# model was trained on (different stain/lighting, raw uncropped eyepiece
# photos) BEFORE a confident ANEMIC/HEALTHY label is returned to the app.
#
# This is a direct port of the logic validated in Colab against a real
# malaria smear photo -- an embedding-distance-only check missed it
# (high-dimensional distances concentrate; a different color palette and
# heavy vignetting don't reliably move a 256-dim diagonal distance far
# enough). Combining it with cheap, explainable pixel-level checks
# catches it.
#
# What this gate does NOT do, and this matters for what shape_screening.py
# exists to cover instead: it answers "does this image look statistically
# like training data overall?" A well-cropped, properly-stained sickle
# cell photo passes this fine, because it genuinely does resemble AneRBC's
# color and framing distribution -- the problem there isn't image
# quality, it's that the model was never taught the difference. That's a
# separate, narrower check (see shape_screening.py).

import numpy as np
import cv2


def compute_embedding_distance(image_embedding, reference_stats):
    """
    Per-dimension z-score distance of this image's embedding from the
    training distribution's center. Larger means less like anything the
    model actually learned from.
    """
    reference_mean = np.array(reference_stats["embedding_mean"], dtype=np.float32)
    reference_std = np.array(reference_stats["embedding_std"], dtype=np.float32)
    return float(np.linalg.norm((image_embedding - reference_mean) / reference_std))


def run_color_and_vignette_checks(raw_resized_image, reference_stats):
    """
    raw_resized_image: the (260, 260, 3) uint8 BGR image from
                        preprocess_image(), BEFORE ImageNet normalization.
    reference_stats: the loaded ood_stats.json dict.

    Returns a list of human-readable reasons the image looks unlike
    training data. An empty list means it looks fine on these signals.
    """
    reasons = []
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
            f"\u00b1{reference_stats['sat_std']:.0f}) -- may be a different stain "
            f"type, white balance, or lighting setup"
        )
    if vignette_ratio < reference_stats["vignette_min_ratio"]:
        reasons.append(
            f"dark-cornered / circular vignette detected (corner-to-center "
            f"brightness ratio {vignette_ratio:.2f}) -- looks like an "
            f"uncropped raw microscope eyepiece photo rather than a framed "
            f"slide capture; ask the user to recapture using the in-app "
            f"framing guide"
        )
    return reasons


def run_reliability_gate(image_embedding, raw_resized_image, reference_stats):
    """Combines both signals. Returns (is_unreliable, reasons)."""
    reasons = run_color_and_vignette_checks(raw_resized_image, reference_stats)
    embedding_distance = compute_embedding_distance(image_embedding, reference_stats)
    if embedding_distance > reference_stats["embedding_distance_threshold"]:
        reasons.append(
            f"embedding distance {embedding_distance:.2f} exceeds trained-data "
            f"spread (threshold {reference_stats['embedding_distance_threshold']:.2f})"
        )
    return len(reasons) > 0, reasons
