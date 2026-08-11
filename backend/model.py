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
from backend.services.shape_screening import run_shape_screening, get_cell_overlay

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

# Below this F1 score, a morphology flag's own held-out validation
# performance is too close to guessing to report as a specific finding.
# macrocytosis (F1 0.0) and dimorphic_picture (F1 0.044) in the real
# eval_report.json both fall well under this -- the model was never able
# to learn these two flags reliably, most likely from too few positive
# training examples, the same root cause already documented for the CBC
# fields RDW_CV/WBC/platelets. Flags below this bar are suppressed from
# morphology_findings/observed_indicators regardless of their raw
# probability on a given image, the same way cbc_uncertainty.py
# suppresses CBC fields whose MAE is too large relative to their range --
# a confident-looking probability is not the same as a flag the model
# has actually demonstrated it can detect.
MORPHOLOGY_F1_SUPPRESSION_THRESHOLD = 0.30


def _load_eval_report():
    if not os.path.exists(EVAL_REPORT_PATH):
        print(f"[AidePoint] WARNING: {EVAL_REPORT_PATH} not found -- "
              f"per-field CBC confidence, morphology reliability, and the "
              f"validated decision threshold will fall back to defaults.")
        return {}
    with open(EVAL_REPORT_PATH) as eval_report_file:
        return json.load(eval_report_file)


_EVAL_REPORT = _load_eval_report()


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
    cbc_mean_absolute_errors = _EVAL_REPORT.get("cbc_mae_per_field", {})
    if not cbc_mean_absolute_errors:
        return {key: "unknown" for key in CBC_KEYS}

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


def build_morphology_reliability_flags():
    """
    Mirrors build_cbc_confidence_labels() for morphology: reads each
    flag's held-out F1 score from eval_report.json's
    "morphology_f1_per_flag" and marks any flag below
    MORPHOLOGY_F1_SUPPRESSION_THRESHOLD as unreliable, so predict() can
    suppress it from the finding list regardless of what probability the
    model outputs for it on a given image.

    Falls back to treating every flag as reliable if eval_report.json is
    missing -- consistent with build_cbc_confidence_labels()'s "unknown"
    fallback, this degrades to the old (less safe) behavior rather than
    failing startup over a non-critical file.
    """
    morphology_f1_scores = _EVAL_REPORT.get("morphology_f1_per_flag", {})
    if not morphology_f1_scores:
        return {key: True for key in MORPHOLOGY_KEYS}

    return {
        key: morphology_f1_scores.get(key, 1.0) >= MORPHOLOGY_F1_SUPPRESSION_THRESHOLD
        for key in MORPHOLOGY_KEYS
    }


CBC_CONFIDENCE_LABELS = build_cbc_confidence_labels()
MORPHOLOGY_FLAG_IS_RELIABLE = build_morphology_reliability_flags()

# Decision threshold: prefer the F1-optimal value validated in
# eval_report.json's "binary.optimal_threshold" (0.51 on the real
# retrained model) over the environment variable/hardcoded fallback --
# a value that was actually swept and validated against real held-out
# data should win over a guess, but the environment variable still lets
# a deployment override it deliberately (e.g. shifting toward higher
# recall) without editing code.
_VALIDATED_THRESHOLD = _EVAL_REPORT.get("binary", {}).get("optimal_threshold")
ANEMIA_DECISION_THRESHOLD = float(
    os.getenv(
        "ANEMIA_DECISION_THRESHOLD",
        str(_VALIDATED_THRESHOLD) if _VALIDATED_THRESHOLD is not None else "0.50",
    )
)

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


def filter_unreliable_morphology_flags(morphology_result):
    """
    Zeroes out probabilities for flags whose held-out F1 fell below
    MORPHOLOGY_F1_SUPPRESSION_THRESHOLD, rather than removing the key
    entirely -- downstream consumers (morphology_explanations.py,
    audit_trail.py) still expect all 9 keys present, so a suppressed
    flag is reported as effectively "not detected" instead of vanishing
    from the response shape.
    """
    return {
        key: (probability if MORPHOLOGY_FLAG_IS_RELIABLE.get(key, True) else 0.0)
        for key, probability in morphology_result.items()
    }


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
              f"suppressed morphology flags: "
              f"{[key for key, reliable in MORPHOLOGY_FLAG_IS_RELIABLE.items() if not reliable]}, "
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
        # Suppresses flags the model has not demonstrated it can actually
        # detect (see MORPHOLOGY_F1_SUPPRESSION_THRESHOLD above) before
        # this ever reaches morphology_explanations.py or the audit trail.
        morphology_result = filter_unreliable_morphology_flags(morphology_result)

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
            "morphology_flag_reliability": MORPHOLOGY_FLAG_IS_RELIABLE,
            "is_unreliable": is_unreliable,
            "unreliable_reasons": unreliable_reasons,
            "shape_screening": shape_screening_result,
            "cell_overlay": cell_overlay_result,
            "scope_disclaimer": ANEMIA_SCOPE_DISCLAIMER,
            "cbc_scope_disclaimer": CBC_ACCURACY_DISCLAIMER,
        }