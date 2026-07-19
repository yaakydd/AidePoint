# shape_screening.py
#
# A second, more targeted gate alongside quality_checks.py's OOD/color
# checks. That gate answers "does this image look statistically like
# training data?" -- a well-cropped sickle cell photo passes it fine,
# because it IS a real, well-stained, properly framed smear. This gate
# answers a different, narrower question instead: "are the cells in this
# image round?" It doesn't need any training data of its own, which is
# exactly why it can cover ground the ONNX model can't -- it isn't limited
# by what AneRBC happened to label.
#
# Deliberately NOT trying to be a classifier. It reports two numbers
# (fraction of non-round cells, mean eccentricity) and lets the caller
# decide what to do with them. Calling this "sickle cell detection" would
# overstate what geometry alone can tell you -- overlapping cells, folds
# in the smear, and out-of-focus regions can all produce low-circularity
# contours that have nothing to do with disease. What this CAN honestly
# claim is: "a well-prepared, in-focus normal smear should mostly be round
# cells, and this one mostly isn't" -- which is enough to justify holding
# back a confident HEALTHY/ANEMIC label without needing to say why.
#
# Reference ranges below are sourced from the CytoDiffusion / Blood Cell
# Anomaly Detection dataset's documented feature definitions (normal RBC
# eccentricity ~0.18, sickle cell ~0.92; normal circularity high, sickle
# cell ~0.30) -- not from training on that dataset's images, since those
# are synthetic. Using its published summary statistics as calibration
# reference points for a classical geometry check is a much smaller claim
# than training a classifier on generated images, and doesn't inherit that
# dataset's realism caveats.

import cv2
import numpy as np


# A cell more elongated than this eccentricity, or less circular than this
# ratio, stops counting as "a normal round RBC" for this check. These sit
# roughly halfway between the CytoDiffusion normal-RBC and sickle-cell
# reference numbers -- deliberately not tight to either end, since real
# photos have focus and staining variation a synthetic dataset doesn't.
ECCENTRICITY_LIMIT = 0.55
CIRCULARITY_FLOOR = 0.55

# If more than this fraction of detected cells fail the roundness check,
# the image as a whole gets flagged. A handful of oddly-shaped contours in
# any real photo is normal (overlap, folds, debris) -- this threshold is
# about the overall picture, not any single cell.
FLAGGED_FRACTION_THRESHOLD = 0.25

MIN_CONTOUR_AREA = 40  # px^2 at 260x260 -- filters out noise/debris specks


def _contour_shape_metrics(contour) -> dict | None:
    area = cv2.contourArea(contour)
    if area < MIN_CONTOUR_AREA:
        return None

    perimeter = cv2.arcLength(contour, True)
    if perimeter == 0:
        return None
    # Circularity = 1.0 for a perfect circle, drops for anything
    # elongated or irregular. Standard formula, nothing exotic.
    circularity = float(4 * np.pi * area / (perimeter ** 2))

    if len(contour) < 5:
        # cv2.fitEllipse needs at least 5 points -- tiny/sliver contours
        # just don't have enough shape information to judge, so they're
        # skipped rather than forced through the ellipse fit.
        return None
    (_, _), (major, minor), _ = cv2.fitEllipse(contour)
    major, minor = max(major, minor), min(major, minor)
    if major == 0:
        return None
    eccentricity = float(np.sqrt(1 - (minor / major) ** 2))

    return {"circularity": min(circularity, 1.0), "eccentricity": eccentricity}


def run_shape_screening(raw_resized_bgr: np.ndarray) -> dict:
    """
    raw_resized_bgr: the same (260,260,3) uint8 BGR array quality_checks.py
                      already uses -- no extra image read needed.

    Returns:
        needs_review   : bool -- True if the cell shapes in this image
                          look unusual enough that a confident anemia
                          label shouldn't be shown without a caveat.
        flagged_fraction: float -- share of detected cells that failed
                          the roundness check, for logging/debugging.
        mean_eccentricity: float -- for logging; not itself a decision.
    """
    gray = cv2.cvtColor(raw_resized_bgr, cv2.COLOR_BGR2GRAY)
    _, mask = cv2.threshold(gray, 0, 255, cv2.THRESH_BINARY + cv2.THRESH_OTSU)

    # RBCs typically stain darker than background in these smears, so the
    # cell mask is usually the inverse of a straight Otsu threshold on a
    # bright background -- checked by comparing mean intensity inside vs
    # outside the initial mask and flipping if the "foreground" is
    # actually the brighter region.
    if gray[mask > 0].mean() > gray[mask == 0].mean():
        mask = cv2.bitwise_not(mask)

    contours, _ = cv2.findContours(mask, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)

    metrics = [m for m in (_contour_shape_metrics(c) for c in contours) if m]

    if len(metrics) < 5:
        # Too few detected cells to say anything meaningful -- rather than
        # silently reporting "0% flagged" (which would read as
        # reassuring), this is surfaced as its own case so a downstream
        # caller can treat it the same as "unreliable" for a different
        # reason: not enough visible cells to judge shape at all.
        return {
            "needs_review": True,
            "flagged_fraction": None,
            "mean_eccentricity": None,
            "reason": "too few distinct cells detected to assess shape",
        }

    flagged = [
        m for m in metrics
        if m["eccentricity"] > ECCENTRICITY_LIMIT
        or m["circularity"] < CIRCULARITY_FLOOR
    ]
    flagged_fraction = len(flagged) / len(metrics)
    mean_eccentricity = float(np.mean([m["eccentricity"] for m in metrics]))

    return {
        "needs_review": flagged_fraction > FLAGGED_FRACTION_THRESHOLD,
        "flagged_fraction": round(flagged_fraction, 3),
        "mean_eccentricity": round(mean_eccentricity, 3),
        "cells_detected": len(metrics),
        "reason": (
            f"{flagged_fraction*100:.0f}% of detected cells are unusually "
            f"elongated or non-round for a typical smear"
            if flagged_fraction > FLAGGED_FRACTION_THRESHOLD else None
        ),
    }
