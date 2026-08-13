import base64
import io
from dataclasses import dataclass

import numpy as np
import cv2
from PIL import Image

from services.image_crop import auto_crop_microscope_field

TARGET_IMAGE_SIZE = 260

# Must match training albumentations Normalize values exactly.
NORMALIZE_MEAN = np.array([0.485, 0.456, 0.406], dtype=np.float32)
NORMALIZE_STD = np.array([0.229, 0.224, 0.225], dtype=np.float32)

# Preview images sent back for the transparency trail are downscaled and
# JPEG-compressed before base64 encoding , the full-resolution original
# isn't needed for a small on-screen comparison, and keeping this small
# matters for response size and mobile data usage.
PREVIEW_IMAGE_SIZE = 200
PREVIEW_JPEG_QUALITY = 70


@dataclass
class PreprocessResult:
    """Everything downstream needs from one raw image upload."""

    model_input: np.ndarray  # (1, 3, 260, 260) float32 NCHW, normalized , feeds the ONNX model directly.
    raw_resized_image: np.ndarray  # (260, 260, 3) uint8 BGR, BEFORE normalization , feeds quality_checks.py and shape_screening.py.
    was_cropped: bool  # whether auto_crop_microscope_field actually changed the image.
    original_preview_base64: str | None  # small JPEG preview of the image BEFORE cropping, for the app's before/after display.
    cropped_preview_base64: str | None  # same, AFTER cropping.


def encode_preview_image(image_bgr: np.ndarray) -> str | None:
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


def preprocess_image(image_bytes: bytes) -> PreprocessResult:
    """
    Converts raw image bytes into everything downstream needs.
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

    return PreprocessResult(
        model_input=model_input,
        raw_resized_image=resized_image_bgr,
        was_cropped=was_cropped,
        original_preview_base64=encode_preview_image(original_image_bgr),
        cropped_preview_base64=encode_preview_image(resized_image_bgr),
    )