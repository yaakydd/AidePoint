# preprocess.py
# Replicates the exact val_transforms used during training.
# Any deviation here causes silent accuracy degradation.
#
# CHANGED: now returns a tuple (model_input, raw_resized_bgr) instead of
# just model_input. The reliability gate (quality_checks.py) needs actual
# pixel values — hue, saturation, corner brightness — which the
# ImageNet-normalized tensor doesn't preserve in a usable form. Decoding
# once and handing back both avoids reading the image twice.

import numpy as np
import cv2
from PIL import Image
import io

IMG_SIZE = 260
# Must match training albumentations Normalize values exactly
MEAN = np.array([0.485, 0.456, 0.406], dtype=np.float32)
STD  = np.array([0.229, 0.224, 0.225], dtype=np.float32)


def preprocess_image(image_bytes: bytes):
    """
    Converts raw image bytes into everything downstream needs.

    Returns:
        model_input     : (1, 3, 260, 260) float32 NCHW, normalized —
                           feeds the ONNX model directly.
        raw_resized_bgr : (260, 260, 3) uint8 BGR, BEFORE normalization —
                           feeds quality_checks.py. Uses OpenCV's BGR/HSV
                           convention deliberately, to exactly match how
                           the reference stats in ood_stats.json were
                           computed in Colab (cv2.cvtColor(..., BGR2HSV)).
                           Mixing conventions here would silently shift
                           every threshold in quality_checks.py.
    """
    img = Image.open(io.BytesIO(image_bytes)).convert("RGB")
    img = img.resize((IMG_SIZE, IMG_SIZE), Image.BILINEAR)

    arr_rgb = np.array(img, dtype=np.uint8)                     # HWC uint8 RGB
    raw_resized_bgr = cv2.cvtColor(arr_rgb, cv2.COLOR_RGB2BGR)   # match Colab's convention

    arr = arr_rgb.astype(np.float32) / 255.0
    arr = (arr - MEAN) / STD
    model_input = arr.transpose(2, 0, 1)[np.newaxis, :].astype(np.float32)

    return model_input, raw_resized_bgr
