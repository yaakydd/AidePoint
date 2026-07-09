# quality_checks.py
# The reliability gate: catches inputs that don't match what AidePoint's
# model was trained on (different stain/lighting, raw uncropped eyepiece
# photos) BEFORE a confident ANEMIC/HEALTHY label is returned to the app.
#
# This is a direct port of the logic validated in Colab against a real
# malaria smear photo — an embedding-distance-only check missed it (high-
# dimensional distances concentrate; a different color palette and heavy
# vignetting don't reliably move a 256-dim diagonal distance far enough).
# Combining it with cheap, explainable pixel-level checks catches it.

import numpy as np
import cv2


def embedding_ood_distance(embedding: np.ndarray, stats: dict) -> float:
    """Per-dimension z-score distance of this image's embedding from the
    training distribution's center. Larger = less like anything the model
    actually learned from."""
    mean = np.array(stats["embedding_mean"], dtype=np.float32)
    std  = np.array(stats["embedding_std"], dtype=np.float32)
    return float(np.linalg.norm((embedding - mean) / std))


def color_vignette_checks(raw_resized_bgr: np.ndarray, stats: dict) -> list[str]:
    """
    raw_resized_bgr: the (260,260,3) uint8 BGR image from preprocess_image(),
                      BEFORE ImageNet normalization.
    stats: the loaded ood_stats.json dict.

    Returns a list of human-readable reasons the image looks unlike
    training data. Empty list means it looks fine on these signals.
    """
    reasons = []
    img_size = raw_resized_bgr.shape[0]

    hsv = cv2.cvtColor(raw_resized_bgr, cv2.COLOR_BGR2HSV).astype(np.float32)
    h_mean, s_mean = hsv[..., 0].mean(), hsv[..., 1].mean()

    gray = cv2.cvtColor(raw_resized_bgr, cv2.COLOR_BGR2GRAY).astype(np.float32)
    edge = img_size // 8
    corners = np.concatenate([
        gray[:edge, :edge].ravel(),   gray[:edge, -edge:].ravel(),
        gray[-edge:, :edge].ravel(),  gray[-edge:, -edge:].ravel(),
    ])
    center = gray[img_size//2-edge:img_size//2+edge, img_size//2-edge:img_size//2+edge].ravel()
    vignette_ratio = float(corners.mean()) / (float(center.mean()) + 1e-6)

    if (abs(h_mean - stats["hue_mean"]) > 3 * stats["hue_std"]
            or abs(s_mean - stats["sat_mean"]) > 3 * stats["sat_std"]):
        reasons.append(
            f"unusual color/staining palette (hue {h_mean:.0f} vs expected "
            f"~{stats['hue_mean']:.0f}\u00b1{stats['hue_std']:.0f}, saturation "
            f"{s_mean:.0f} vs ~{stats['sat_mean']:.0f}\u00b1{stats['sat_std']:.0f}) "
            f"— may be a different stain type, white balance, or lighting setup"
        )

    if vignette_ratio < stats["vignette_min_ratio"]:
        reasons.append(
            f"dark-cornered / circular vignette detected (corner:center "
            f"brightness ratio {vignette_ratio:.2f}) — looks like an "
            f"uncropped raw microscope eyepiece photo rather than a framed "
            f"slide capture; ask the user to recapture using the in-app "
            f"framing guide"
        )

    return reasons


def run_reliability_gate(embedding: np.ndarray, raw_resized_bgr: np.ndarray,
                          stats: dict) -> tuple[bool, list[str]]:
    """Combines both signals. Returns (is_unreliable, reasons)."""
    reasons = color_vignette_checks(raw_resized_bgr, stats)

    dist = embedding_ood_distance(embedding, stats)
    if dist > stats["embedding_distance_threshold"]:
        reasons.append(
            f"embedding distance {dist:.2f} exceeds trained-data spread "
            f"(threshold {stats['embedding_distance_threshold']:.2f})"
        )

    return len(reasons) > 0, reasons
