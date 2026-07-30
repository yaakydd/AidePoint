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
# Trimmed from the original 14 fields to only the 6 with real visual
# grounding in a red-blood-cell photo. WBC and the white-cell differential
# (neutrophils/lymphocytes/monocytes/eosinophils) were removed: a photo of
# red cells contains no information about white cells, so training on
# them was asking the model to guess something it structurally cannot
# see. Platelets/MPV removed for the same reason. RDW_CV removed because
# only 43% of training records had a real value for it.
CBC_KEYS = [
    'RBC', 'HAEMOGLOBIN', 'HAEMATOCRIT', 'MCV', 'MCH', 'MCHC',
]

# elliptocytosis added after a systematic scan of training reports found
# it mentioned in 433 of 1,000 patients with zero prior label vocabulary
# catching it -- unlike sickle cell/malaria/leukemia (too few real
# examples to safely label), 433 patients was enough real labeled data
# to add this as a genuine training target.
MORPHOLOGY_KEYS = [
    'dimorphic_picture', 'anisocytosis', 'hypochromia', 'microcytosis',
    'macrocytosis', 'poikilocytosis', 'target_cells', 'elliptocytosis',
    'normal_morphology',
]

CBC_NORMALIZATION_RANGES = {
    'RBC':          (0.0,   10.0),
    'HAEMOGLOBIN':  (0.0,   25.0),
    'HAEMATOCRIT':  (0.0,   70.0),
    'MCV':          (50.0,  130.0),
    'MCH':          (10.0,  50.0),
    'MCHC':         (20.0,  45.0),
}

CBC_CLINICAL_REFERENCE_RANGES = {
    'RBC':          (4.0,    5.2),
    'HAEMOGLOBIN':  (11.5,  15.5),
    'HAEMATOCRIT':  (35.0,  45.0),
    'MCV':          (77.0,  95.0),
    'MCH':          (25.0,  33.0),
    'MCHC':         (31.0,  37.0),
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
    presenting all 6 values with equal apparent authority.

    Falls back to "unknown" for every field if eval_report.json isn't
    present, rather than failing startup over a non-critical feature.
    """
    if not os.path.exists(EVAL_REPORT_PATH):
        print(f"[AidePoint] WARNING: {EVAL_REPORT_PATH} not found -- "
              f"per-field CBC confidence will be omitted from responses.")
        return {key: "unknown" for key in CBC_KEYS}

    with open(EVAL_REPORT_PATH) as eval_report_file:
        eval_report = json.load(eval_report_file)
    # FIXED: Cell 6 now saves this under "cbc_mae_per_field", not "cbc_mae" --
    # the old key name here meant this always silently fell through to
    # "unknown" for every field, even when a real eval_report.json existed.
    cbc_mean_absolute_errors = eval_report.get("cbc_mae_per_field", {})

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

# FIXED: default fallback updated to match the retrained model's real
# F1-optimal threshold (confirm this exact value against your latest
# eval_report.json's "optimal_threshold" before deploying -- update the
# ANEMIA_DECISION_THRESHOLD environment variable in production rather
# than relying on this fallback).
ANEMIA_DECISION_THRESHOLD = float(os.getenv("ANEMIA_DECISION_THRESHOLD", "0.50"))

# Fixed scope statement returned on every single response, not just
# unreliable ones. The point isn't to hedge on individual bad predictions
# -- it's that "HEALTHY" without this line reads as a general clean bill
# of health, when what the model actually checked is narrower than that.
ANEMIA_SCOPE_DISCLAIMER = (
    "This result reflects anemia risk only, based on hemoglobin-related "
    "patterns in red blood cells. It does not screen for malaria, sickle "
    "cell disease, or other blood conditions."
)

# Measured against real per-field error in eval_report.json: CBC field
# errors vary widely relative to their own clinical reference range width.
# The binary anemia call is trained and validated with far more signal
# (loss-weighted higher than CBC) -- the CBC numbers were never meant to
# carry that same weight.
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

        # Sanity check the loaded model's actual output width matches what
        # this file expects to unpack it into -- catches a stale ONNX file
        # (old 14/8 shapes) immediately at startup instead of silently
        # misaligning CBC/morphology values with the wrong field names on
        # the first real request.
        cbc_output_width = self.inference_session.get_outputs()[1].shape[-1]
        morphology_output_width = self.inference_session.get_outputs()[2].shape[-1]
        if cbc_output_width != len(CBC_KEYS):
            raise RuntimeError(
                f"ONNX model's cbc output has width {cbc_output_width}, but "
                f"CBC_KEYS in model.py has {len(CBC_KEYS)} entries. These must "
                f"match exactly -- re-export the model or update CBC_KEYS."
            )
        if morphology_output_width != len(MORPHOLOGY_KEYS):
            raise RuntimeError(
                f"ONNX model's morphology output has width {morphology_output_width}, "
                f"but MORPHOLOGY_KEYS in model.py has {len(MORPHOLOGY_KEYS)} entries. "
                f"These must match exactly -- re-export the model or update "
                f"MORPHOLOGY_KEYS."
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
              f"cbc fields: {len(CBC_KEYS)}, morphology flags: {len(MORPHOLOGY_KEYS)}, "
              f"reliability gate: active, shape screening + cell overlay: active)")

    def predict(self, model_input, raw_resized_image):
        """
        model_input       : (1, 3, 260, 260) float32 NCHW, from preprocess_image().
        raw_resized_image : (260, 260, 3) uint8 BGR, also from preprocess_image()
                            -- needed for the pixel-level reliability checks and
                            the shape screening / overlay.
        """
        model_outputs = self.inference_session.run(None, {self.input_name: model_input})

        binary_logit = model_outputs[0][0, 0]  # type: ignore
        cbc_normalized = model_outputs[1][0]  # type: ignore
        morphology_logits = model_outputs[2][0]  # type: ignore
        image_embedding = model_outputs[3][0]  # type: ignore

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