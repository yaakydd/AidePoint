# preprocess.py
# Replicates the exact val_transforms used during training.
# Any deviation here causes silent accuracy degradation.

import numpy as np
from PIL import Image
import io

IMG_SIZE = 260

# Must match training albumentations Normalize values exactly
MEAN = np.array([0.485, 0.456, 0.406], dtype=np.float32)
STD  = np.array([0.229, 0.224, 0.225], dtype=np.float32)


def preprocess_image(image_bytes: bytes) -> np.ndarray:
    """
    Converts raw image bytes to the float32 tensor the ONNX model expects.
    Output shape: (1, 3, 260, 260)  — NCHW, normalized.
    """
    # Open and convert to RGB (handles PNG, JPG, grayscale)
    img = Image.open(io.BytesIO(image_bytes)).convert("RGB")

    # Resize to training size
    img = img.resize((IMG_SIZE, IMG_SIZE), Image.BILINEAR)

    # HWC numpy float32 in [0, 1]
    arr = np.array(img, dtype=np.float32) / 255.0

    # Normalize: (pixel - mean) / std  — matches albumentations A.Normalize
    arr = (arr - MEAN) / STD

    # HWC → CHW → NCHW (add batch dim)
    arr = arr.transpose(2, 0, 1)[np.newaxis, :]   # (1, 3, 260, 260)

    return arr.astype(np.float32)
