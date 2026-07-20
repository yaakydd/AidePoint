# model.py
# Loads the ONNX model once at startup and exposes a single predict() call.
# onnxruntime is used -- it is the most stable ONNX inference runtime.
#
# The anemia-type classifier and rule engine that used to live here were
# removed entirely -- the CSV they were trained on turned out to have
# near-perfect, threshold-derived labels (not independently diagnosed
# ones) and included "Leukemia" as a class despite it not actually being
# an anemia subtype, both of which made it a shakier feature than it
# looked. In its place: predict() now also runs get_cell_overlay(),
# returning per-cell shape data the app can draw directly on the photo --
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

MORPHOLOGY_KEYS = [
    'dimorphic_picture', 'anisocytosis', 'hypochromia', 'microcytosis',
    'macrocytosis', 'poikilocytosis', 'target_cells', 'normal_morphology',
]

CBC_NORMALIZATION_RANGES = {
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

CBC_CLINICAL_REFERENCE_RANGES = {
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


def build_cbc_confidence_labels():
    """
    Turns the per-field mean absolute error already measured in
    eval_report.json (Cell 6 of the training notebook) into a simple
    confidence label per CBC field, so the app can show "this number is
    solid" versus "treat this one as a rough estimate" instead of
    presenting all 14 values with equal apparent authority.

    Falls back to "unknown" for every field if eval_report.json isn't
    present, rather than failing startup over a non-critical feature.
    """
    if not os.path.exists(EVAL_REPORT_PATH):
        print(f"[AidePoint] WARNING: {EVAL_REPORT_PATH} not found -- "
              f"per-field CBC confidence will be omitted from responses.")
        return {key: "unknown" for key in CBC_KEYS}

    with open(EVAL_REPORT_PATH) as eval_report_file:
        eval_report = json.load(eval_report_file)
    cbc_mean_absolute_errors = eval_report.get("cbc_mae", {})

    confidence_labels = {}
    for key in CBC_KEYS:
        if key not in cbc_mean_absolute_errors:
            confidence_labels[key] = "unknown"
            continue
        range_low, range_high = CBC_CLINICAL_REFERENCE_RANGES[key]
        error_as_percent_of_range = (
            100 * cbc_mean_absolute_errors[key] / (range_high - range_low)
        )
        if error_as_percent_of_range < 10:
            confidence_labels[key] = "high"
        elif error_as_percent_of_range < 20:
            confidence_labels[key] = "moderate"
        else:
            confidence_labels[key] = "low"
    return confidence_labels


CBC_CONFIDENCE_LABELS = build_cbc_confidence_labels()

ANEMIA_DECISION_THRESHOLD = float(os.getenv("ANEMIA_DECISION_THRESHOLD", "0.34"))

# Fixed scope statement returned on every single response, not just
# unreliable ones. The point isn't to hedge on individual bad predictions
# -- it's that "HEALTHY" without this line reads as a general clean bill
# of health, when what the model actually checked is narrower than that.
ANEMIA_SCOPE_DISCLAIMER = (
    "This result reflects anemia risk only, based on hemoglobin-related "
    "patterns in red blood cells. It does not screen for malaria, sickle "
    "cell disease, or other blood conditions."
)

# Measured against real per-field error in eval_report.json: every CBC
# field's mean absolute error is 70-180% of its own clinical reference
# range width. The binary anemia call is trained and validated with far
# more signal (loss-weighted 10x higher than CBC) -- the CBC numbers were
# never meant to carry that same weight.
CBC_ACCURACY_DISCLAIMER = (
    "Estimated CBC values are rough, directional estimates only -- not a "
    "substitute for a real laboratory CBC."
)

OUT_OF_DISTRIBUTION_STATS_PATH = os.getenv(
    "OOD_STATS_PATH",
    os.path.join(os.path.dirname(__file__), "ood_stats.json"),
)


def apply_sigmoid(raw_values):
    return 1.0 / (1.0 + np.exp(-raw_values))


def denormalize_cbc_values(normalized_values):
    real_values = {}
    for index, key in enumerate(CBC_KEYS):
        range_low, range_high = CBC_NORMALIZATION_RANGES[key]
        real_value = float(normalized_values[index]) * (range_high - range_low) + range_low
        real_values[key] = round(real_value, 3)
    return real_values


def flag_cbc_values(cbc_values):
    flags = {}
    for key, value in cbc_values.items():
        range_low, range_high = CBC_CLINICAL_REFERENCE_RANGES[key]
        if value < range_low:
            flags[key] = 'LOW'
        elif value > range_high:
            flags[key] = 'HIGH'
        else:
            flags[key] = 'NORMAL'
    return flags


class AidePointONNX:
    """
    Wraps the exported ONNX model, plus the reliability gate and shape
    screening / overlay. Loaded once at FastAPI startup -- thread-safe
    for concurrent requests.
    """

    def __init__(self, model_path):
        if not os.path.exists(model_path):
            raise FileNotFoundError(f"ONNX model not found: {model_path}")

        session_options = ort.SessionOptions()
        session_options.graph_optimization_level = (
            ort.GraphOptimizationLevel.ORT_ENABLE_ALL
        )
        session_options.intra_op_num_threads = 2  # Railway free tier has 2 vCPUs

        self.inference_session = ort.InferenceSession(
            model_path,
            sess_options=session_options,
            providers=["CPUExecutionProvider"],
        )
        self.input_name = self.inference_session.get_inputs()[0].name

        actual_output_names = [output.name for output in self.inference_session.get_outputs()]
        expected_output_names = ['binary', 'cbc', 'morphology', 'embedding']
        if actual_output_names != expected_output_names:
            raise RuntimeError(
                f"ONNX model at {model_path} has outputs {actual_output_names}, "
                f"expected {expected_output_names}. This model.py expects the "
                f"4-output v2 export (including the 'embedding' output used for "
                f"the reliability gate) -- re-export with the updated Cell 7 if "
                f"this model predates that change."
            )

        if not os.path.exists(OUT_OF_DISTRIBUTION_STATS_PATH):
            raise FileNotFoundError(
                f"ood_stats.json not found at {OUT_OF_DISTRIBUTION_STATS_PATH}. "
                f"This file must be committed alongside model.py -- see Cell 9 "
                f"in the training notebook. Without it, the reliability gate "
                f"cannot run and every result would silently skip the "
                f"out-of-distribution check."
            )
        with open(OUT_OF_DISTRIBUTION_STATS_PATH) as stats_file:
            self.out_of_distribution_stats = json.load(stats_file)

        print(f"[AidePoint] ONNX model loaded from {model_path} "
              f"(decision threshold: {ANEMIA_DECISION_THRESHOLD}, "
              f"reliability gate: active, shape screening + cell overlay: active)")

    def predict(self, model_input, raw_resized_image):
        """
        model_input       : (1, 3, 260, 260) float32 NCHW, from preprocess_image().
        raw_resized_image : (260, 260, 3) uint8 BGR, also from preprocess_image()
                            -- needed for the pixel-level reliability checks and
                            the shape screening / overlay.
        """
        model_outputs = self.inference_session.run(None, {self.input_name: model_input})

        binary_logit = model_outputs[0][0, 0]
        cbc_normalized = model_outputs[1][0]  # already (0,1) -- sigmoided in the model head
        morphology_logits = model_outputs[2][0]
        image_embedding = model_outputs[3][0]  # (256,) -- used only for the reliability gate

        anemia_probability = float(apply_sigmoid(binary_logit))
        is_anemic = anemia_probability >= ANEMIA_DECISION_THRESHOLD

        cbc_values = denormalize_cbc_values(cbc_normalized)
        cbc_flags = flag_cbc_values(cbc_values)

        morphology_probabilities = apply_sigmoid(morphology_logits)
        morphology_result = {
            key: round(float(morphology_probabilities[index]), 4)
            for index, key in enumerate(MORPHOLOGY_KEYS)
        }

        is_unreliable, unreliable_reasons = run_reliability_gate(
            image_embedding, raw_resized_image, self.out_of_distribution_stats
        )

        try:
            shape_screening_result = run_shape_screening(raw_resized_image)
        except Exception as error:
            shape_screening_result = {
                "needs_review": False, "reason": None,
                "error": f"shape screening failed: {error}",
            }

        if shape_screening_result.get("needs_review"):
            is_unreliable = True
            if shape_screening_result.get("reason"):
                unreliable_reasons.append(
                    f"unusual cell shape: {shape_screening_result['reason']}"
                )

        # Cell overlay runs regardless of is_unreliable -- if anything, an
        # unreliable result is exactly when seeing WHY matters most. This
        # is the headline feature: real per-cell shape data the app draws
        # directly on the photo. Wrapped in try/except like the other
        # auxiliary checks -- a failure here shouldn't take down the core
        # anemia prediction.
        try:
            cell_overlay_result = get_cell_overlay(raw_resized_image)
        except Exception as error:
            cell_overlay_result = {
                "cells": [], "cell_count": 0, "flagged_count": 0,
                "error": f"cell overlay failed: {error}",
            }

        return {
            "anemia_probability": round(anemia_probability, 4),
            "is_anemic": is_anemic,
            "decision_threshold": ANEMIA_DECISION_THRESHOLD,
            "cbc": cbc_values,
            "cbc_flags": cbc_flags,
            "cbc_confidence": CBC_CONFIDENCE_LABELS,
            "morphology_probs": morphology_result,
            "is_unreliable": is_unreliable,
            "unreliable_reasons": unreliable_reasons,
            "shape_screening": shape_screening_result,
            "cell_overlay": cell_overlay_result,
            "scope_disclaimer": ANEMIA_SCOPE_DISCLAIMER,
            "cbc_scope_disclaimer": CBC_ACCURACY_DISCLAIMER,
        }
