# model.py
# Loads the ONNX model once at startup and exposes a single predict() call.
# onnxruntime is used — it is the most stable ONNX inference runtime.
#
# REBUILT (this pass): the anemia-type classifier and rule engine were
# removed entirely — the CSV they were trained on turned out to have
# near-perfect, threshold-derived labels (not independently diagnosed
# ones) and included "Leukemia" as a class despite it not actually being
# an anemia subtype, both of which made it a shakier feature than it
# looked. In its place: predict() now also runs get_cell_overlay(),
# returning per-cell shape data the app can draw directly on the photo —
# a live, visible annotation of exactly which cells look normal and which
# don't, rather than a single aggregate flag or an invented diagnosis
# label.

import os
import json
import numpy as np
import onnxruntime as ort

from quality_checks import run_reliability_gate
from shape_screening import run_shape_screening, get_cell_overlay

# ── CBC metadata (must match training exactly) ──────────────────────────────
CBC_KEYS = [
    'WBC', 'RBC', 'HAEMOGLOBIN', 'HAEMATOCRIT', 'MCV', 'MCH', 'MCHC',
    'RDW_CV', 'PLATELETS', 'MPV', 'NEUTROPHILS', 'LYMPHOCYTES',
    'MONOCYTES', 'EOSINOPHILS',
]

MORPH_KEYS = [
    'dimorphic_picture', 'anisocytosis', 'hypochromia', 'microcytosis',
    'macrocytosis', 'poikilocytosis', 'target_cells', 'normal_morphology',
]

CBC_NORM = {
    'WBC':          (0.0,   30.0),
    'RBC':          (0.0,   10.0),
    'HAEMOGLOBIN':  (0.0,   25.0),
    'HAEMATOCRIT':  (0.0,   70.0),
    'MCV':          (50.0,  130.0),
    'MCH':          (10.0,  50.0),
    'MCHC':         (20.0,  45.0),
    'RDW_CV':       (8.0,   25.0),
    'PLATELETS':    (0.0,   800.0),
    'MPV':          (4.0,   20.0),
    'NEUTROPHILS':  (0.0,   100.0),
    'LYMPHOCYTES':  (0.0,   100.0),
    'MONOCYTES':    (0.0,   25.0),
    'EOSINOPHILS':  (0.0,   15.0),
}

CBC_REFERENCE = {
    'WBC':          (5.0,   13.0),
    'RBC':          (4.0,    5.2),
    'HAEMOGLOBIN':  (11.5,  15.5),
    'HAEMATOCRIT':  (35.0,  45.0),
    'MCV':          (77.0,  95.0),
    'MCH':          (25.0,  33.0),
    'MCHC':         (31.0,  37.0),
    'RDW_CV':       (11.6,  14.0),
    'PLATELETS':    (170.0, 450.0),
    'MPV':          (9.2,   12.1),
    'NEUTROPHILS':  (39.7,  71.2),
    'LYMPHOCYTES':  (24.0,  48.4),
    'MONOCYTES':    (4.8,   10.1),
    'EOSINOPHILS':  (0.8,    5.8),
}

EVAL_REPORT_PATH = os.getenv(
    "EVAL_REPORT_PATH",
    os.path.join(os.path.dirname(__file__), "eval_report.json"),
)


def _build_cbc_confidence() -> dict:
    """
    Turns the per-field MAE already measured in eval_report.json (Cell 6
    of the training notebook) into a simple confidence label per CBC
    field, so the app can show "this number is solid" vs "treat this one
    as a rough estimate" instead of presenting all 14 values with equal
    apparent authority.

    Falls back to "unknown" for every field if eval_report.json isn't
    present, rather than failing startup over a non-critical feature.
    """
    if not os.path.exists(EVAL_REPORT_PATH):
        print(f"[AidePoint] WARNING: {EVAL_REPORT_PATH} not found — "
              f"per-field CBC confidence will be omitted from responses.")
        return {k: "unknown" for k in CBC_KEYS}

    with open(EVAL_REPORT_PATH) as f:
        report = json.load(f)
    cbc_mae = report.get("cbc_mae", {})

    confidence = {}
    for key in CBC_KEYS:
        if key not in cbc_mae:
            confidence[key] = "unknown"
            continue
        lo, hi = CBC_REFERENCE[key]
        pct_of_range = 100 * cbc_mae[key] / (hi - lo)
        if pct_of_range < 10:
            confidence[key] = "high"
        elif pct_of_range < 20:
            confidence[key] = "moderate"
        else:
            confidence[key] = "low"
    return confidence


CBC_CONFIDENCE = _build_cbc_confidence()

DECISION_THRESHOLD = float(os.getenv("ANEMIA_DECISION_THRESHOLD", "0.34"))

# Fixed scope statement returned on every single response, not just
# unreliable ones. The point isn't to hedge on individual bad predictions
# — it's that "HEALTHY" without this line reads as a general clean bill of
# health, when what the model actually checked is narrower than that.
SCOPE_DISCLAIMER = (
    "This result reflects anemia risk only, based on hemoglobin-related "
    "patterns in red blood cells. It does not screen for malaria, sickle "
    "cell disease, or other blood conditions."
)

# Measured against real per-field error in eval_report.json: every CBC
# field's mean absolute error is 70-180% of its own clinical reference
# range width. The binary anemia call is trained and validated with far
# more signal (loss-weighted 10x higher than CBC) — the CBC numbers were
# never meant to carry that same weight.
CBC_SCOPE_DISCLAIMER = (
    "Estimated CBC values are rough, directional estimates only — not a "
    "substitute for a real laboratory CBC."
)

OOD_STATS_PATH = os.getenv(
    "OOD_STATS_PATH",
    os.path.join(os.path.dirname(__file__), "ood_stats.json"),
)


def _sigmoid(x) -> np.ndarray:
    return 1.0 / (1.0 + np.exp(-x))


def _denormalize_cbc(normed: np.ndarray) -> dict:
    result = {}
    for i, key in enumerate(CBC_KEYS):
        lo, hi = CBC_NORM[key]
        real_val = float(normed[i]) * (hi - lo) + lo
        result[key] = round(real_val, 3)
    return result


def _flag_cbc(cbc_values: dict) -> dict:
    flags = {}
    for key, val in cbc_values.items():
        lo, hi = CBC_REFERENCE[key]
        if val < lo:
            flags[key] = 'LOW'
        elif val > hi:
            flags[key] = 'HIGH'
        else:
            flags[key] = 'NORMAL'
    return flags


class AidePointONNX:
    """
    Wraps the exported ONNX model, plus the reliability gate and shape
    screening / overlay. Loaded once at FastAPI startup — thread-safe for
    concurrent requests.
    """

    def __init__(self, model_path: str):
        if not os.path.exists(model_path):
            raise FileNotFoundError(f"ONNX model not found: {model_path}")

        sess_options = ort.SessionOptions()
        sess_options.graph_optimization_level = (
            ort.GraphOptimizationLevel.ORT_ENABLE_ALL
        )
        sess_options.intra_op_num_threads = 2  # Railway free tier has 2 vCPUs

        self.session = ort.InferenceSession(
            model_path,
            sess_options=sess_options,
            providers=["CPUExecutionProvider"],
        )
        self.input_name = self.session.get_inputs()[0].name

        output_names = [o.name for o in self.session.get_outputs()]
        expected = ['binary', 'cbc', 'morphology', 'embedding']
        if output_names != expected:
            raise RuntimeError(
                f"ONNX model at {model_path} has outputs {output_names}, "
                f"expected {expected}. This model.py expects the 4-output "
                f"v2 export (including the 'embedding' output used for the "
                f"reliability gate) — re-export with the updated Cell 7 if "
                f"this model predates that change."
            )

        if not os.path.exists(OOD_STATS_PATH):
            raise FileNotFoundError(
                f"ood_stats.json not found at {OOD_STATS_PATH}. This file "
                f"must be committed alongside model.py — see Cell 9 in the "
                f"training notebook. Without it, the reliability gate "
                f"cannot run and every result would silently skip the "
                f"out-of-distribution check."
            )
        with open(OOD_STATS_PATH) as f:
            self.ood_stats = json.load(f)

        print(f"[AidePoint] ONNX model loaded from {model_path} "
              f"(decision threshold: {DECISION_THRESHOLD}, "
              f"reliability gate: active, shape screening + cell overlay: active)")

    def predict(self, model_input: np.ndarray, raw_resized_bgr: np.ndarray) -> dict:
        """
        model_input:     (1,3,260,260) float32 NCHW, from preprocess_image().
        raw_resized_bgr: (260,260,3) uint8 BGR, also from preprocess_image() —
                          needed for the pixel-level reliability checks and
                          the shape screening / overlay.
        """
        outputs = self.session.run(None, {self.input_name: model_input})

        binary_logit = outputs[0][0, 0]
        cbc_normed   = outputs[1][0]      # already (0,1) — sigmoided in the model head
        morph_logits = outputs[2][0]
        embedding    = outputs[3][0]      # (256,) — used only for the reliability gate

        anemia_prob = float(_sigmoid(binary_logit))
        is_anemic   = anemia_prob >= DECISION_THRESHOLD

        cbc_values = _denormalize_cbc(cbc_normed)
        cbc_flags  = _flag_cbc(cbc_values)

        morph_probs = _sigmoid(morph_logits)
        morphology  = {
            key: round(float(morph_probs[i]), 4)
            for i, key in enumerate(MORPH_KEYS)
        }

        is_unreliable, reasons = run_reliability_gate(
            embedding, raw_resized_bgr, self.ood_stats
        )

        try:
            shape_result = run_shape_screening(raw_resized_bgr)
        except Exception as exc:
            shape_result = {"needs_review": False, "reason": None,
                             "error": f"shape screening failed: {exc}"}

        if shape_result.get("needs_review"):
            is_unreliable = True
            if shape_result.get("reason"):
                reasons.append(f"unusual cell shape: {shape_result['reason']}")

        # Cell overlay runs regardless of is_unreliable — if anything, an
        # unreliable result is exactly when seeing WHY matters most. This
        # is the headline feature: real per-cell shape data the app draws
        # directly on the photo. Wrapped in try/except like the other
        # auxiliary checks — a failure here shouldn't take down the core
        # anemia prediction.
        try:
            cell_overlay = get_cell_overlay(raw_resized_bgr)
        except Exception as exc:
            cell_overlay = {"cells": [], "cell_count": 0, "flagged_count": 0,
                             "error": f"cell overlay failed: {exc}"}

        return {
            "anemia_probability": round(anemia_prob, 4),
            "is_anemic":          is_anemic,
            "decision_threshold": DECISION_THRESHOLD,
            "cbc":                cbc_values,
            "cbc_flags":          cbc_flags,
            "cbc_confidence":     CBC_CONFIDENCE,
            "morphology_probs":   morphology,
            "is_unreliable":      is_unreliable,
            "unreliable_reasons": reasons,
            "shape_screening":    shape_result,
            "cell_overlay":       cell_overlay,
            "scope_disclaimer":   SCOPE_DISCLAIMER,
            "cbc_scope_disclaimer": CBC_SCOPE_DISCLAIMER,
        }
