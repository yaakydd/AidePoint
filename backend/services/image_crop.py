import numpy as np
import cv2

def auto_crop_microscope_field(image_bgr: np.ndarray) -> tuple[np.ndarray, bool]:
    image_height, image_width = image_bgr.shape[:2]
    grayscale_image = cv2.cvtColor(image_bgr, cv2.COLOR_BGR2GRAY)

    # Same corner-vs-center brightness check as quality_checks.py, reuse
    # it here to decide whether cropping is even needed.
    edge_thickness = min(image_height, image_width) // 8
    corner_pixels = np.concatenate([
        grayscale_image[:edge_thickness, :edge_thickness].ravel(),
        grayscale_image[:edge_thickness, -edge_thickness:].ravel(),
        grayscale_image[-edge_thickness:, :edge_thickness].ravel(),
        grayscale_image[-edge_thickness:, -edge_thickness:].ravel(),
    ])
    center_y, center_x = image_height // 2, image_width // 2
    center_pixels = grayscale_image[
        center_y - edge_thickness:center_y + edge_thickness,
        center_x - edge_thickness:center_x + edge_thickness,
    ].ravel()
    vignette_ratio = float(corner_pixels.mean()) / (float(center_pixels.mean()) + 1e-6)

    if vignette_ratio > 0.5:
        # Corners aren't meaningfully darker than the center. This is
        # already a close, properly-framed crop, nothing to do here.
        return image_bgr, False

    # Otsu picks the threshold automatically instead of a fixed brightness
    # cutoff, since the field can be pink, blue, grey, or overexposed
    # depending on the stain and lighting, a fixed number would only
    # work for some of these.
    _, bright_field_mask = cv2.threshold(
        grayscale_image, 0, 255, cv2.THRESH_BINARY + cv2.THRESH_OTSU
    )
    found_contours, _ = cv2.findContours(
        bright_field_mask, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE
    )
    if not found_contours:
        return image_bgr, False

    largest_contour = max(found_contours, key=cv2.contourArea)
    (field_center_x, field_center_y), field_radius = cv2.minEnclosingCircle(largest_contour)

    # If the detected "bright circle" is tiny relative to the frame, this
    # probably isn't a real eyepiece field of view, bail rather than
    # crop down to something meaningless.
    if field_radius < min(image_height, image_width) * 0.15:
        return image_bgr, False

    # Inscribed square inside the circle and side length = radius * sqrt(2)
    # so the crop never includes any of the dark surround.
    half_square_side = field_radius / 1.4142
    crop_x0 = int(max(field_center_x - half_square_side, 0))
    crop_y0 = int(max(field_center_y - half_square_side, 0))
    crop_x1 = int(min(field_center_x + half_square_side, image_width))
    crop_y1 = int(min(field_center_y + half_square_side, image_height))
    if crop_x1 - crop_x0 < 20 or crop_y1 - crop_y0 < 20:
        return image_bgr, False

    cropped_image = image_bgr[crop_y0:crop_y1, crop_x0:crop_x1]
    return cropped_image, True