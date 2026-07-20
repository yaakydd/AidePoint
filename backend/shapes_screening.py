# shape_screening.py
#
# Two things live here now:
#   1. run_shape_screening() -- the original reliability check (unchanged
#      logic): "do enough of this image's cells look like normal round
#      RBCs to trust a confident label?"
#   2. get_cell_overlay() -- NEW. Returns per-cell shape data (position,
#      size, and a severity score) so the app can draw a live annotation
#      directly on top of the photo: a colored circle around every
#      detected cell, green for normal, sliding through yellow to red the
#      more elongated/irregular a cell's shape is. This is the actual
#      visible proof of what the AI looked at and why -- rather than a
#      paragraph of text explaining a decision, the person watching sees
#      it drawn on the real photo, cell by cell.
#
# Both functions share one contour-detection pass (_detect_cell_contours)
# rather than each re-running cv2 independently — same image, same
# contours, no reason to compute it twice.
#
# Same honesty boundary as before: this does not diagnose anything.
# Overlapping cells, folds, and out-of-focus regions can produce
# low-circularity contours with nothing to do with disease. What it does
# show, accurately: how round and how uniform the visible cells actually
# are, drawn exactly where they appear in the photo.

import cv2
import numpy as np
from scipy import ndimage as ndi

ECCENTRICITY_LIMIT = 0.55
CIRCULARITY_FLOOR = 0.55
FLAGGED_FRACTION_THRESHOLD = 0.25
MIN_CONTOUR_AREA = 40  # px^2 at 260x260 -- filters out noise/debris specks


def _detect_cell_contours(raw_resized_bgr: np.ndarray):
    """
    Threshold + watershed segmentation to split touching/overlapping
    cells. A plain Otsu threshold + findContours (the original approach)
    treats any group of touching cells as a single blob — confirmed on a
    real dense sickle cell test photo, which collapsed 30+ visible cells
    into exactly 1 contour. That made both run_shape_screening() and the
    overlay feature nearly blind on precisely the kind of dense field a
    real smear often has.

    Watershed fixes this by treating the mask as a topographic surface
    (distance from the nearest edge) and "flooding" outward from each
    local peak — each peak becomes a separate cell region, splitting
    blobs at their narrowest connecting points rather than merging them.
    This isn't exotic; it's the standard classical-CV approach for
    exactly this problem (touching roughly-convex blobs), used here
    instead of a trained model for the same reason the rest of this file
    avoids one: no labeled training data is needed, it's just geometry.
    """
    gray = cv2.cvtColor(raw_resized_bgr, cv2.COLOR_BGR2GRAY)
    _, mask = cv2.threshold(gray, 0, 255, cv2.THRESH_BINARY + cv2.THRESH_OTSU)

    if gray[mask > 0].mean() > gray[mask == 0].mean():
        mask = cv2.bitwise_not(mask)

    # Distance transform: every foreground pixel's value becomes its
    # distance to the nearest background pixel. Cell centers are local
    # maxima of this — the "peak" of each cell's own local topography.
    dist = cv2.distanceTransform(mask, cv2.DIST_L2, 5)

    # Local maxima detection: a pixel counts as a peak if it's the
    # highest value in its own neighborhood. footprint size is tuned to
    # roughly one typical cell's radius at this 260x260 processing size —
    # too small over-splits single cells, too large under-splits close
    # neighbors.
    footprint = np.ones((15, 15))
    local_max = (ndi.maximum_filter(dist, footprint=footprint) == dist) & (dist > 3)

    markers, _ = ndi.label(local_max)
    # cv2.watershed's convention: 0 = unknown (to be filled in), 1 =
    # background, 2+ = distinct foreground regions to grow.
    markers = markers + 1
    markers[mask == 0] = 1
    # Peaks that got flattened out by the +1 shift already have unique
    # labels >= 2 wherever local_max was True; everywhere else in the
    # foreground starts as "unknown" for watershed to assign.
    markers[(mask > 0) & (markers == 1)] = 0

    color_img = cv2.cvtColor(gray, cv2.COLOR_GRAY2BGR)
    cv2.watershed(color_img, markers)

    # Rebuild per-region contours from the watershed labels rather than
    # re-running findContours on the original merged mask — this is what
    # actually gets the split cells out as separate shapes.
    contours = []
    for label in np.unique(markers):
        if label <= 1:  # 1 = background, -1 = watershed boundary lines
            continue
        region_mask = np.uint8(markers == label) * 255
        region_contours, _ = cv2.findContours(
            region_mask, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE
        )
        contours.extend(region_contours)

    return contours


def _contour_shape_metrics(contour):
    area = cv2.contourArea(contour)
    if area < MIN_CONTOUR_AREA:
        return None

    perimeter = cv2.arcLength(contour, True)
    if perimeter == 0:
        return None
    circularity = float(4 * np.pi * area / (perimeter ** 2))

    if len(contour) < 5:
        return None
    (cx, cy), (major, minor), angle = cv2.fitEllipse(contour)
    major, minor = max(major, minor), min(major, minor)
    if major == 0:
        return None
    eccentricity = float(np.sqrt(1 - (minor / major) ** 2))

    return {
        "circularity": min(circularity, 1.0),
        "eccentricity": eccentricity,
        "cx": float(cx), "cy": float(cy),
        "major": float(major), "minor": float(minor),
        "angle": float(angle),
    }


def run_shape_screening(raw_resized_bgr: np.ndarray) -> dict:
    """
    Unchanged from before: the reliability check that decides whether an
    anemia result should be shown with confidence. This is the fix for
    the sickle-cell-called-healthy case, and stays conservative (fails
    toward "needs review") when too few cells can be separated to judge
    at all.
    """
    contours = _detect_cell_contours(raw_resized_bgr)
    metrics = [m for m in (_contour_shape_metrics(c) for c in contours) if m]

    if len(metrics) < 5:
        return {
            "needs_review": True,
            "flagged_fraction": None,
            "mean_eccentricity": None,
            "cells_detected": len(metrics),
            "reason": "too few distinct cells detected to assess shape",
        }

    flagged = [
        m for m in metrics
        if m["eccentricity"] > ECCENTRICITY_LIMIT or m["circularity"] < CIRCULARITY_FLOOR
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


def _severity_color(eccentricity: float, circularity: float) -> dict:
    """
    Maps a cell's shape to a color along a green -> yellow -> red gradient,
    rather than a binary flagged/not-flagged split. A cell that's mildly
    irregular (early motion blur, slight overlap) reads visually different
    from one that's dramatically non-round (a real sickle shape) — the
    gradient makes that difference legible at a glance instead of
    collapsing it to two buckets.

    `severity` (0.0-1.0) is the underlying number the color is derived
    from, returned alongside the color so the app can also sort/filter
    cells by it if useful later, rather than only having a color string.
    """
    ecc_severity = max(0.0, (eccentricity - 0.15) / (0.95 - 0.15))
    circ_severity = max(0.0, (0.95 - circularity) / (0.95 - 0.30))
    severity = float(np.clip((ecc_severity + circ_severity) / 2, 0.0, 1.0))

    if severity < 0.5:
        t = severity / 0.5
        r = int(0x16 + (0xEA - 0x16) * t)
        g = int(0xA3 + (0xB3 - 0xA3) * t)
        b = int(0x4A + (0x08 - 0x4A) * t)
    else:
        t = (severity - 0.5) / 0.5
        r = int(0xEA + (0xDC - 0xEA) * t)
        g = int(0xB3 + (0x26 - 0xB3) * t)
        b = int(0x08 + (0x26 - 0x08) * t)

    return {"severity": round(severity, 3), "color": f"#{r:02X}{g:02X}{b:02X}"}


def get_cell_overlay(raw_resized_bgr: np.ndarray) -> dict:
    """
    Returns per-cell shape data for drawing a live annotation directly on
    the photo — the headline feature. Coordinates and sizes are
    normalized to 0-1 (fraction of image width/height), NOT raw pixels,
    so the app can scale the overlay correctly regardless of what size
    the photo is actually displayed at on screen, without needing to know
    the backend's internal 260x260 processing size.

    Each cell entry:
        cx, cy       : center, 0-1 normalized
        rx, ry       : ellipse radii, 0-1 normalized (width/height fractions)
        angle        : rotation in degrees, straight from cv2.fitEllipse
        eccentricity, circularity : the raw shape metrics
        severity     : 0-1, how far this cell is from a normal round shape
        color        : hex string, green->yellow->red gradient by severity
    """
    h, w = raw_resized_bgr.shape[:2]
    contours = _detect_cell_contours(raw_resized_bgr)

    cells = []
    for contour in contours:
        m = _contour_shape_metrics(contour)
        if m is None:
            continue
        sev = _severity_color(m["eccentricity"], m["circularity"])
        cells.append({
            "cx": round(float(np.clip(m["cx"] / w, 0.0, 1.0)), 4),
            "cy": round(float(np.clip(m["cy"] / h, 0.0, 1.0)), 4),
            "rx": round(float(np.clip((m["major"] / 2) / w, 0.0, 0.5)), 4),
            "ry": round(float(np.clip((m["minor"] / 2) / h, 0.0, 0.5)), 4),
            "angle": round(m["angle"], 1),
            "eccentricity": round(m["eccentricity"], 3),
            "circularity": round(m["circularity"], 3),
            "severity": sev["severity"],
            "color": sev["color"],
        })

    cells.sort(key=lambda c: -c["severity"])

    return {
        "cells": cells,
        "cell_count": len(cells),
        "flagged_count": sum(1 for c in cells if c["severity"] >= 0.5),
    }
