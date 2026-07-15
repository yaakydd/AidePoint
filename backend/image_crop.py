# Fixes the actual domain-gap problem, not just detecting it. Training data
# is close, properly-framed crops of stained smear (no dark corners). Real
# users are mostly holding a phone up to a microscope eyepiece, which gives
# a bright circular field of view surrounded by black — completely
# different framing, even when the actual smear/stain underneath is fine.
#
# This crops down to the biggest square that fits inside that bright
# circle, so the image handed to the model actually resembles training
# data. If an image is ALREADY a close crop with no dark corners (like
# properly-cropped training-style images), it's left untouched — this only
# fires when it detects the eyepiece-vignette pattern.

import numpy as np
import cv2


def auto_crop_microscope_field(img_bgr: np.ndarray) -> np.ndarray:
    h, w = img_bgr.shape[:2]
    gray = cv2.cvtColor(img_bgr, cv2.COLOR_BGR2GRAY)

    # same corner-vs-center brightness check as quality_checks.py — reuse
    # it here to decide whether cropping is even needed
    edge = min(h, w) // 8
    corners = np.concatenate([
        gray[:edge, :edge].ravel(),   gray[:edge, -edge:].ravel(),
        gray[-edge:, :edge].ravel(),  gray[-edge:, -edge:].ravel(),
    ])
    cy, cx = h // 2, w // 2
    center = gray[cy-edge:cy+edge, cx-edge:cx+edge].ravel()
    vignette_ratio = float(corners.mean()) / (float(center.mean()) + 1e-6)

    if vignette_ratio > 0.5:
        # corners aren't meaningfully darker than the center — this is
        # already a close, properly-framed crop, nothing to do here
        return img_bgr

    # Otsu picks the threshold automatically instead of a fixed brightness
    # cutoff, since the field can be pink, blue, grey, or overexposed
    # depending on the stain and lighting — a fixed number would only work
    # for some of these
    _, mask = cv2.threshold(gray, 0, 255, cv2.THRESH_BINARY + cv2.THRESH_OTSU)
    contours, _ = cv2.findContours(mask, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
    if not contours:
        return img_bgr

    largest = max(contours, key=cv2.contourArea)
    (fx, fy), radius = cv2.minEnclosingCircle(largest)

    # if the detected "bright circle" is tiny relative to the frame, this
    # probably isn't a real eyepiece field of view — bail rather than crop
    # down to something meaningless
    if radius < min(h, w) * 0.15:
        return img_bgr

    # inscribed square inside the circle — side = radius * sqrt(2) — so the
    # crop never includes any of the dark surround
    half = radius / 1.4142
    x0, y0 = int(max(fx - half, 0)), int(max(fy - half, 0))
    x1, y1 = int(min(fx + half, w)), int(min(fy + half, h))

    if x1 - x0 < 20 or y1 - y0 < 20:
        return img_bgr

    return img_bgr[y0:y1, x0:x1]
