# preprocess.py
# Replicates the exact validation transforms used during training.
# Any deviation here causes silent accuracy degradation.
#
# CHANGED: now returns a dict instead of a growing tuple, since this
# function's job has expanded past just "produce the model input." It
# also captures the pre-crop image (previously decoded once and then
# discarded) so the app can show a real before/after comparison -- the
# same demonstration used earlier when tracing the sickle cell test case,
# now available as a first-class feature rather than something only
# visible by manually inspecting a Colab notebook run.

import base64
import numpy as np
import cv2
from PIL import Image
import io

from image_crop import auto_crop_microscope_field

TARGET_IMAGE_SIZE = 260

# Must match training albumentations Normalize values exactly.
NORMALIZE_MEAN = np.array([0.485, 0.456, 0.406], dtype=np.float32)
NORMALIZE_STD = np.array([0.229, 0.224, 0.225], dtype=np.float32)

# Preview images sent back for the transparency trail are downscaled and
# JPEG-compressed before base64 encoding -- the full-resolution original
# isn't needed for a small on-screen comparison, and keeping this small
# matters for response size and mobile data usage.
PREVIEW_IMAGE_SIZE = 200
PREVIEW_JPEG_QUALITY = 70


def encode_preview_image(image_bgr):
    """
    Downscales and JPEG-encodes an image for inclusion in the API
    response as a base64 string the app can display directly in an
    <Image> component, without a second network round trip to fetch it.
    """
    preview_image = cv2.resize(
        image_bgr, (PREVIEW_IMAGE_SIZE, PREVIEW_IMAGE_SIZE),
        interpolation=cv2.INTER_AREA,
    )
    encode_success, encoded_bytes = cv2.imencode(
        ".jpg", preview_image, [cv2.IMWRITE_JPEG_QUALITY, PREVIEW_JPEG_QUALITY]
    )
    if not encode_success:
        return None
    return base64.b64encode(encoded_bytes).decode("ascii")


def preprocess_image(image_bytes):
    """
    Converts raw image bytes into everything downstream needs.

    Returns a dict with:
        model_input        : (1, 3, 260, 260) float32 NCHW, normalized --
                              feeds the ONNX model directly.
        raw_resized_image   : (260, 260, 3) uint8 BGR, BEFORE normalization
                              -- feeds quality_checks.py and shape_screening.py.
        was_cropped         : bool -- whether auto_crop_microscope_field
                              actually changed the image.
        original_preview_base64 : small JPEG preview of the image BEFORE
                              cropping, for the app's before/after display.
        cropped_preview_base64  : same, AFTER cropping.
    """
    loaded_image = Image.open(io.BytesIO(image_bytes)).convert("RGB")
    image_as_rgb_array = np.array(loaded_image, dtype=np.uint8)
    original_image_bgr = cv2.cvtColor(image_as_rgb_array, cv2.COLOR_RGB2BGR)

    # Crop out the raw-eyepiece vignette (if present) before resizing, so
    # a lab tech's actual photo gets a fair shot at looking like training
    # data instead of getting judged on framing it never had a chance to
    # match. No-op if the image is already a proper crop.
    cropped_image_bgr, was_cropped = auto_crop_microscope_field(original_image_bgr)

    resized_image_bgr = cv2.resize(
        cropped_image_bgr, (TARGET_IMAGE_SIZE, TARGET_IMAGE_SIZE),
        interpolation=cv2.INTER_LINEAR,
    )

    resized_image_rgb = cv2.cvtColor(resized_image_bgr, cv2.COLOR_BGR2RGB).astype(np.float32) / 255.0
    normalized_image = (resized_image_rgb - NORMALIZE_MEAN) / NORMALIZE_STD
    model_input = normalized_image.transpose(2, 0, 1)[np.newaxis, :].astype(np.float32)

    return {
        "model_input": model_input,
        "raw_resized_image": resized_image_bgr,
        "was_cropped": was_cropped,
        "original_preview_base64": encode_preview_image(original_image_bgr),
        "cropped_preview_base64": encode_preview_image(resized_image_bgr),
    }
