# Two things live here now:
#   1. run_shape_screening() - the original reliability check: "do enough
#      of this image's cells look like normal round RBCs to trust a
#      confident label?"
#   2. get_cell_overlay() - returns per-cell shape data (position, size,
#      and a severity score) so the app can draw a live annotation
#      directly on top of the photo: a colored circle around every
#      detected cell, green for normal, sliding through yellow to red the
#      more elongated/irregular a cell's shape is. This is the actual
#      visible proof of what the AI looked at and why , rather than a
#      paragraph of text explaining a decision, the person watching sees
#      it drawn on the real photo, cell by cell.
#
# Both functions share one contour-detection pass (detect_cell_contours)
# rather than each re-running OpenCV independently , same image, same
# contours, no reason to compute it twice.
#
# Same honesty boundary as before: this does not diagnose anything.
# Overlapping cells, folds, and out-of-focus regions can produce
# low-circularity contours with nothing to do with disease. What it does
# show, accurately: how round and how uniform the visible cells actually
# are, drawn exactly where they appear in the photo.

from dataclasses import dataclass, field

import cv2
import numpy as np
from scipy import ndimage

ECCENTRICITY_LIMIT = 0.55
CIRCULARITY_FLOOR = 0.55
FLAGGED_FRACTION_THRESHOLD = 0.25
MINIMUM_CONTOUR_AREA = 40  # square pixels at 260x260 , filters out noise/debris specks
MINIMUM_CELLS_FOR_SHAPE_VERDICT = 15


@dataclass
class ShapeMeasurement:
    """Per-contour shape metrics from measure_contour_shape."""

    circularity: float
    eccentricity: float
    center_x: float
    center_y: float
    axis_major: float
    axis_minor: float
    rotation_angle: float


@dataclass
class ShapeScreeningResult:
    """Reliability verdict from run_shape_screening. flagged_fraction and
    mean_eccentricity are None when cells_detected is below
    MINIMUM_CELLS_FOR_SHAPE_VERDICT , segmentation itself was too
    unreliable to measure, not merely a shape finding."""

    needs_review: bool
    flagged_fraction: float | None
    mean_eccentricity: float | None
    cells_detected: int
    reason: str | None


@dataclass
class SeverityInfo:
    """A cell's position on the green to yellow to red severity gradient."""

    severity: float
    color: str


@dataclass
class CellOverlayEntry:
    """One cell's normalized (0-1) position/size plus its shape metrics
    and severity color, ready for the app to draw directly on the photo."""

    center_x: float
    center_y: float
    radius_x: float
    radius_y: float
    rotation_angle: float
    eccentricity: float
    circularity: float
    severity: float
    color: str


@dataclass
class CellOverlayResult:
    cells: list[CellOverlayEntry] = field(default_factory=list)
    cell_count: int = 0
    flagged_count: int = 0
    error: str | None = None


def detect_cell_contours(image_bgr: np.ndarray) -> list[np.ndarray]:
    """
    Threshold + watershed segmentation to split touching/overlapping
    cells. A plain Otsu threshold plus findContours treats any group of
    touching cells as a single blob , confirmed on a real dense sickle
    cell test photo, which collapsed 30+ visible cells into exactly one
    contour. That made both run_shape_screening() and the overlay feature
    nearly blind on precisely the kind of dense field a real smear often
    has.

    Watershed fixes this by treating the cell mask as a topographic
    surface (distance from the nearest edge) and "flooding" outward from
    each local peak , each peak becomes its own separate cell region,
    splitting blobs at their narrowest connecting points rather than
    merging them. This is the standard classical computer vision approach
    for touching, roughly convex shapes, used here instead of a trained
    model for the same reason the rest of this file avoids one: no
    labeled training data is needed, it's just geometry.
    """
    grayscale_image = cv2.cvtColor(image_bgr, cv2.COLOR_BGR2GRAY)
    _, cell_mask = cv2.threshold(
        grayscale_image, 0, 255, cv2.THRESH_BINARY + cv2.THRESH_OTSU
    )

    # Red blood cells typically stain darker than the background , flip
    # the mask if the region Otsu picked as "foreground" is actually the
    # brighter one.
    if grayscale_image[cell_mask > 0].mean() > grayscale_image[cell_mask == 0].mean():
        cell_mask = cv2.bitwise_not(cell_mask)

    # Distance transform: every foreground pixel's value becomes its
    # distance to the nearest background pixel. Cell centers are local
    # maxima of this , the "peak" of each cell's own local topography.
    distance_map = cv2.distanceTransform(cell_mask, cv2.DIST_L2, 5)

    # A pixel counts as a peak if it's the highest value in its own
    # neighborhood. neighborhood_size is tuned to roughly one typical
    # cell's radius at this 260x260 processing size , too small
    # over-splits single cells, too large under-splits close neighbors.
    neighborhood_size = (15, 15)
    is_local_peak = (
        ndimage.maximum_filter(distance_map, size=neighborhood_size) == distance_map
    ) & (distance_map > 3)

    # ndimage.label always returns a 2-tuple (labeled_array, num_features)
    # at runtime , confirmed by scipy's own docs and by this code running
    # correctly against real test images. The type: ignore here is for a
    # known scipy-stubs overload-resolution gap (Pylance picks an overload
    # that returns a bare int and then flags this unpacking as invalid),
    # not a real bug in this line.
    cell_markers, _ = ndimage.label(is_local_peak)  # type: ignore[misc]
    # cv2.watershed's convention: 0 = unknown (to be filled in), 1 =
    # background, 2 and above = distinct foreground regions to grow.
    cell_markers = cell_markers + 1
    cell_markers[cell_mask == 0] = 1
    # Everywhere inside the foreground that isn't already a detected peak
    # starts as "unknown" for watershed to assign to its nearest region.
    cell_markers[(cell_mask > 0) & (cell_markers == 1)] = 0

    color_image_for_watershed = cv2.cvtColor(grayscale_image, cv2.COLOR_GRAY2BGR)
    cv2.watershed(color_image_for_watershed, cell_markers)

    # Rebuild per-region contours from the watershed labels rather than
    # re-running findContours on the original merged mask , this is what
    # actually gets the split cells out as separate shapes.
    all_contours: list[np.ndarray] = []
    for region_label in np.unique(cell_markers):
        if region_label <= 1:  # 1 = background, -1 = watershed boundary lines
            continue
        # np.uint8(...) * 255 produces a numpy scalar-typed array that
        # cv2's type stubs don't recognize as Mat-compatible, even though
        # OpenCV accepts it fine at runtime , np.ascontiguousarray with
        # an explicit dtype gives the stub checker a concrete ndarray
        # type it can actually match against findContours' overloads.
        single_region_mask = np.ascontiguousarray(
            (cell_markers == region_label).astype(np.uint8) * 255
        )
        region_contours, _ = cv2.findContours(
            single_region_mask, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE
        )
        all_contours.extend(region_contours)

    return all_contours


def measure_contour_shape(contour: np.ndarray) -> ShapeMeasurement | None:
    contour_area = cv2.contourArea(contour)
    if contour_area < MINIMUM_CONTOUR_AREA:
        return None

    contour_perimeter = cv2.arcLength(contour, True)
    if contour_perimeter == 0:
        return None
    circularity = float(4 * np.pi * contour_area / (contour_perimeter ** 2))

    if len(contour) < 5:
        return None
    (center_x, center_y), (axis_major, axis_minor), rotation_angle = cv2.fitEllipse(contour)
    axis_major, axis_minor = max(axis_major, axis_minor), min(axis_major, axis_minor)
    if axis_major == 0:
        return None
    eccentricity = float(np.sqrt(1 - (axis_minor / axis_major) ** 2))

    return ShapeMeasurement(
        circularity=min(circularity, 1.0),
        eccentricity=eccentricity,
        center_x=float(center_x),
        center_y=float(center_y),
        axis_major=float(axis_major),
        axis_minor=float(axis_minor),
        rotation_angle=float(rotation_angle),
    )


def run_shape_screening(
    image_bgr: np.ndarray,
    contours: list[np.ndarray] | None = None,
) -> ShapeScreeningResult:
    """
    The reliability check that decides whether an anemia result should be
    shown with confidence. This is the fix for the sickle-cell-called-
    healthy case, and stays conservative (fails toward "needs review")
    when too few cells can be separated to judge at all.

    CHANGED: now accepts an optional pre-computed `contours` list so
    callers that already ran detect_cell_contours() (predict.py, and
    model.py's get_cell_overlay() call) don't pay for watershed
    segmentation a second/third time on the same image. Falls back to
    running detection itself when called standalone (tests, notebooks).

    FIXED: the "too few cells" bar is now MINIMUM_CELLS_FOR_SHAPE_VERDICT
    (15), not 5. Below 15, detect_cell_contours' watershed segmentation
    itself becomes unreliable on real low-contrast smears , it returns
    a handful of merged multi-cell blobs rather than individual cells,
    and those blobs measure as low-circularity/high-eccentricity purely
    because they're clumps, not because the underlying cells are
    abnormally shaped. Below this bar, the function reports that shape
    could not be assessed, rather than asserting a specific , and
    likely wrong , shape verdict built on broken segmentation.
    """
    if contours is None:
        contours = detect_cell_contours(image_bgr)

    cell_measurements = [
        measurement for measurement in (measure_contour_shape(contour) for contour in contours)
        if measurement is not None
    ]

    if len(cell_measurements) < MINIMUM_CELLS_FOR_SHAPE_VERDICT:
        return ShapeScreeningResult(
            needs_review=True,
            flagged_fraction=None,
            mean_eccentricity=None,
            cells_detected=len(cell_measurements),
            reason=(
                f"only {len(cell_measurements)} cells could be separated for "
                f"shape assessment (need at least {MINIMUM_CELLS_FOR_SHAPE_VERDICT}) "
                f", likely due to low contrast or overlapping cells preventing "
                f"reliable segmentation, not a specific shape finding"
            ),
        )

    flagged_cells = [
        measurement for measurement in cell_measurements
        if measurement.eccentricity > ECCENTRICITY_LIMIT
        and measurement.circularity < CIRCULARITY_FLOOR
    ]
    flagged_fraction = len(flagged_cells) / len(cell_measurements)
    mean_eccentricity = float(
        np.mean([measurement.eccentricity for measurement in cell_measurements])
    )

    return ShapeScreeningResult(
        needs_review=flagged_fraction > FLAGGED_FRACTION_THRESHOLD,
        flagged_fraction=round(flagged_fraction, 3),
        mean_eccentricity=round(mean_eccentricity, 3),
        cells_detected=len(cell_measurements),
        reason=(
            f"{flagged_fraction * 100:.0f}% of detected cells are unusually "
            f"elongated or non-round for a typical smear"
            if flagged_fraction > FLAGGED_FRACTION_THRESHOLD else None
        ),
    )


def get_cell_overlay(
    image_bgr: np.ndarray,
    contours: list[np.ndarray] | None = None,
) -> CellOverlayResult:
    """
    Returns per-cell shape data for drawing a live annotation directly on
    the photo , the headline feature. Coordinates and sizes are
    normalized to 0-1 (fraction of image width/height), NOT raw pixels,
    so the app can scale the overlay correctly regardless of what size
    the photo is actually displayed at on screen, without needing to know
    the backend's internal 260x260 processing size.

    CHANGED: now accepts an optional pre-computed `contours` list, same
    reasoning as run_shape_screening() above , predict.py computes
    contours exactly once per request and passes the same list into both
    functions instead of each one re-running watershed independently.

    Each cell entry:
        center_x, center_y : center point, 0-1 normalized
        radius_x, radius_y : ellipse radii, 0-1 normalized (width/height fractions)
        rotation_angle      : rotation in degrees, straight from cv2.fitEllipse
        eccentricity, circularity : the raw shape metrics
        severity             : 0-1, how far this cell is from a normal round shape
        color                 : hex string, green -> yellow -> red gradient by severity
    """
    image_height, image_width = image_bgr.shape[:2]
    if contours is None:
        contours = detect_cell_contours(image_bgr)

    detected_cells: list[CellOverlayEntry] = []
    for contour in contours:
        shape_measurement = measure_contour_shape(contour)
        if shape_measurement is None:
            continue
        severity_info = compute_severity_color(
            shape_measurement.eccentricity, shape_measurement.circularity
        )
        detected_cells.append(CellOverlayEntry(
            center_x=round(
                float(np.clip(shape_measurement.center_x / image_width, 0.0, 1.0)), 4
            ),
            center_y=round(
                float(np.clip(shape_measurement.center_y / image_height, 0.0, 1.0)), 4
            ),
            radius_x=round(
                float(np.clip((shape_measurement.axis_major / 2) / image_width, 0.0, 0.5)), 4
            ),
            radius_y=round(
                float(np.clip((shape_measurement.axis_minor / 2) / image_height, 0.0, 0.5)), 4
            ),
            rotation_angle=round(shape_measurement.rotation_angle, 1),
            eccentricity=round(shape_measurement.eccentricity, 3),
            circularity=round(shape_measurement.circularity, 3),
            severity=severity_info.severity,
            color=severity_info.color,
        ))

    detected_cells.sort(key=lambda cell: -cell.severity)

    return CellOverlayResult(
        cells=detected_cells,
        cell_count=len(detected_cells),
        flagged_count=sum(1 for cell in detected_cells if cell.severity >= 0.5),
    )