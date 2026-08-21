import os
import json
from dataclasses import asdict

import numpy as np
import onnxruntime as ort

from services.quality_checks import run_reliability_gate
from services.shape_screening import (
    get_cell_overlay,
    ShapeScreeningResult,
    CellOverlayResult
)

# CBC metadata matches the CBC words during training exactly
# Has 6 fields with real visual
# grounding in a red-blood-cell photo. WBC and the white-cell differential
# (neutrophils/lymphocytes/monocytes/eosinophils) are not included; a photo of
# red cells contains no information about white cells, so training on
# them was asking the model to guess something it structurally cannot
# see. Platelets/MPV removed for the same reason. RDW_CV removed because
# only 43% of training records had a real value for it.
CBC_KEYS: list[str] = [
    'RBC', 'HAEMOGLOBIN', 'HAEMATOCRIT', 'MCV', 'MCH', 'MCHC',
]

# elliptocytosis was added after a systematic scan of training reports found
# it mentioned in 433 of 1,000 patients with zero prior label vocabulary
# catching it which unlike sickle cell/malaria/leukemia (too few real
# examples to safely label), 433 patients was enough real labeled data
# to add this as a genuine training target.
MORPHOLOGY_KEYS: list[str] = [
    'dimorphic_picture', 'anisocytosis', 'hypochromia', 'microcytosis',
    'macrocytosis', 'poikilocytosis', 'target_cells', 'elliptocytosis',
    'normal_morphology',
]

CBC_NORMALIZATION_RANGES: dict[str, tuple[float, float]] = {
    'RBC': (0.0, 10.0),
    'HAEMOGLOBIN': (0.0, 25.0),
    'HAEMATOCRIT': (0.0, 70.0),
    'MCV': (50.0, 130.0),
    'MCH': (10.0, 50.0),
    'MCHC': (20.0, 45.0),
}

EVAL_REPORT_PATH: str = os.getenv(
    "EVAL_REPORT_PATH",
    os.path.join(os.path.dirname(__file__), "..", "models", "eval_report.json"),
)

# Below this F1 score, a morphology flag's own held-out validation
# performance is too close to guessing to report as a specific finding.
# macrocytosis (F1 0.0) and dimorphic_picture (F1 0.044) in the real
# eval_report.json both fall well under this, the model was never able
# to learn these two flags reliably, most likely from too few positive
# training examples, the same root cause already documented for the CBC
# fields RDW_CV/WBC/platelets. Flags below this bar are suppressed from
# morphology_findings/observed_indicators regardless of their raw
# probability on a given image, the same way cbc_uncertainty.py
# suppresses CBC fields whose MAE is too large relative to their range,
# a confident-looking probability is not the same as a flag the model
# has actually demonstrated it can detect.
MORPHOLOGY_F1_SUPPRESSION_THRESHOLD: float = 0.30


def _load_eval_report() -> dict:
    if not os.path.exists(EVAL_REPORT_PATH):
        print(f"[AidePoint] WARNING: {EVAL_REPORT_PATH} not found  "
              f"per-field CBC confidence, morphology reliability, and the "
              f"validated decision threshold will fall back to defaults.")
        return {}
    with open(EVAL_REPORT_PATH) as eval_report_file:
        return json.load(eval_report_file)


_EVAL_REPORT: dict = _load_eval_report()


def build_morphology_reliability_flags() -> dict[str, bool]:
    """
    Mirrors cbc_uncertainty.classify_field_reliability() for morphology:
    reads each flag's held-out F1 score from eval_report.json's
    "morphology_f1_per_flag" and marks any flag below
    MORPHOLOGY_F1_SUPPRESSION_THRESHOLD as unreliable, so predict() can
    suppress it from the finding list regardless of what probability the
    model outputs for it on a given image.

    Falls back to treating every flag as reliable if eval_report.json is
    missing, this degrades to the old (less safe) behavior rather than
    failing startup over a non-critical file.
    """
    morphology_f1_scores: dict[str, float] = _EVAL_REPORT.get("morphology_f1_per_flag", {})
    if not morphology_f1_scores:
        return {key: True for key in MORPHOLOGY_KEYS}

    return {
        key: morphology_f1_scores.get(key, 1.0) >= MORPHOLOGY_F1_SUPPRESSION_THRESHOLD
        for key in MORPHOLOGY_KEYS
    }


MORPHOLOGY_FLAG_IS_RELIABLE: dict[str, bool] = build_morphology_reliability_flags()


_VALIDATED_THRESHOLD: float | None = _EVAL_REPORT.get("binary", {}).get("optimal_threshold")
ANEMIA_DECISION_THRESHOLD: float = float(
    os.getenv(
        "ANEMIA_DECISION_THRESHOLD",
        str(_VALIDATED_THRESHOLD) if _VALIDATED_THRESHOLD is not None else "0.50",
    )
)


ANEMIA_SCOPE_DISCLAIMER: str = (
    "This result reflects anemia risk only, based on hemoglobin-related "
    "patterns in red blood cells. It does not screen for malaria, sickle "
    "cell disease, or other blood conditions."
)

# Measured against real per-field error in eval_report.json: CBC field
# errors vary widely relative to their own clinical reference range width.
# The binary anemia call is trained and validated with far more signal
# (loss-weighted higher than CBC), the CBC numbers were never meant to
# carry that same weight.
CBC_ACCURACY_DISCLAIMER: str = (
    "Estimated CBC values are rough, directional estimates only  not a "
    "substitute for a real laboratory CBC."
)

OUT_OF_DISTRIBUTION_STATS_PATH: str = os.getenv(
    "OOD_STATS_PATH",
    os.path.join(os.path.dirname(__file__), "..", "models", "ood_stats.json"),
)


def apply_sigmoid(raw_values: np.ndarray) -> np.ndarray:
    return 1.0 / (1.0 + np.exp(-raw_values))


def denormalize_cbc_values(normalized_values: np.ndarray) -> dict[str, float]:
    real_values: dict[str, float] = {}
    for index, key in enumerate(CBC_KEYS):
        range_low, range_high = CBC_NORMALIZATION_RANGES[key]
        real_value = float(normalized_values[index]) * (range_high - range_low) + range_low
        real_values[key] = round(real_value, 3)
    return real_values


def filter_unreliable_morphology_flags(morphology_result: dict[str, float]) -> dict[str, float]:
    """
    Zeroes out probabilities for flags whose held-out F1 fell below
    MORPHOLOGY_F1_SUPPRESSION_THRESHOLD, rather than removing the key
    entirely, downstream consumers (morphology_explanations.py,
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
    screening / overlay. Loaded once at FastAPI startup, thread-safe
    for concurrent requests.
    """

    def __init__(self, model_path: str) -> None:
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
        self.input_name: str = self.inference_session.get_inputs()[0].name

        actual_output_names = [output.name for output in self.inference_session.get_outputs()]
        expected_output_names = ['binary', 'cbc', 'morphology', 'embedding']
        if actual_output_names != expected_output_names:
            raise RuntimeError(
                f"ONNX model at {model_path} has outputs {actual_output_names}, "
                f"expected {expected_output_names}. This model.py expects the "
                f"4-output v2 export (including the 'embedding' output used for "
                f"the reliability gate), re-export with the updated Cell 7 if "
                f"this model predates that change."
            )

        # Sanity check the loaded model's actual output width matches what
        # this file expects to unpack it into, catches a stale ONNX file
        # (old 14/8 shapes) immediately at startup instead of silently
        # misaligning CBC/morphology values with the wrong field names on
        # the first real request.
        cbc_output_width = self.inference_session.get_outputs()[1].shape[-1]
        morphology_output_width = self.inference_session.get_outputs()[2].shape[-1]
        if cbc_output_width != len(CBC_KEYS):
            raise RuntimeError(
                f"ONNX model's cbc output has width {cbc_output_width}, but "
                f"CBC_KEYS in model.py has {len(CBC_KEYS)} entries. These must "
                f"match exactly  re-export the model or update CBC_KEYS."
            )
        if morphology_output_width != len(MORPHOLOGY_KEYS):
            raise RuntimeError(
                f"ONNX model's morphology output has width {morphology_output_width}, "
                f"but MORPHOLOGY_KEYS in model.py has {len(MORPHOLOGY_KEYS)} entries. "
                f"These must match exactly  re-export the model or update "
                f"MORPHOLOGY_KEYS."
            )

        if not os.path.exists(OUT_OF_DISTRIBUTION_STATS_PATH):
            raise FileNotFoundError(
                f"ood_stats.json not found at {OUT_OF_DISTRIBUTION_STATS_PATH}. "
                f"This file must be committed alongside model.py  see Cell 9 "
                f"in the training notebook. Without it, the reliability gate "
                f"cannot run and every result would silently skip the "
                f"out-of-distribution check."
            )
        with open(OUT_OF_DISTRIBUTION_STATS_PATH) as stats_file:
            self.out_of_distribution_stats: dict = json.load(stats_file)

        print(f"[AidePoint] ONNX model loaded from {model_path} "
              f"(decision threshold: {ANEMIA_DECISION_THRESHOLD}, "
              f"cbc fields: {len(CBC_KEYS)}, morphology flags: {len(MORPHOLOGY_KEYS)}, "
              f"suppressed morphology flags: "
              f"{[key for key, reliable in MORPHOLOGY_FLAG_IS_RELIABLE.items() if not reliable]}, "
              f"reliability gate: active, shape screening + cell overlay: active)")


    def predict(
        self,
        model_input: np.ndarray,
        raw_resized_image: np.ndarray,
        shape_screening_result: ShapeScreeningResult,
        contours: list,
    ) -> dict:
        """
        model_input             : (1, 3, 260, 260) float32 NCHW, from preprocess_image().
        raw_resized_image       : (260, 260, 3) uint8 BGR, also from preprocess_image()
                                   needed for the pixel-level reliability checks and
                                   the shape screening / overlay.
        shape_screening_result  : ShapeScreeningResult already computed once by
                                   predict.py before calling this method. Passed
                                   in rather than recomputed here , shape
                                   screening runs a full watershed segmentation
                                   pass, which is the most expensive step in this
                                   request outside ONNX inference itself. Running
                                   it a second time inside predict() (the old
                                   behavior) doubled that cost for no benefit,
                                   since the router already has the answer.
        contours                : the raw contour list from
                                   shape_screening.detect_cell_contours(),
                                   also computed once by predict.py and threaded
                                   through here so get_cell_overlay() below reuses
                                   it instead of running watershed a third time.

        Returns a plain dict, kept JSON-serializable end to end , this
        is what predict.py spreads directly into its JSONResponse, so it
        stays a dict even though shape_screening/cell_overlay are typed
        dataclasses internally (see shape_screening.py). asdict() at the
        return boundary below converts them back for the response.
        """
        model_outputs = self.inference_session.run(None, {self.input_name: model_input})

        binary_logit = model_outputs[0][0, 0]  # type: ignore
        cbc_normalized = model_outputs[1][0]  # type: ignore
        morphology_logits = model_outputs[2][0]  # type: ignore
        image_embedding = model_outputs[3][0]  # type: ignore

        anemia_probability = float(apply_sigmoid(binary_logit))
        is_anemic = anemia_probability >= ANEMIA_DECISION_THRESHOLD

        cbc_values = denormalize_cbc_values(cbc_normalized)

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

        # CHANGED: previously this block called run_shape_screening() a
        # second time internally, wrapped in its own try/except, and had
        # a bug where the needs_review/reason handling was accidentally
        # indented *inside* the except clause , meaning it only ever ran
        # when shape screening itself threw an exception, never on a
        # normal successful call. That silently dropped the shape-based
        # unreliable signal from is_unreliable on the overwhelming
        # majority of requests.
        #
        # Now: shape_screening_result is computed exactly once, by
        # predict.py, before this method is even called, and its
        # needs_review/reason are applied here unconditionally , no
        # try/except needed, since predict.py already handled the
        # failure case when it produced shape_screening_result in the
        # first place.
        if shape_screening_result.needs_review:
            is_unreliable = True
        if shape_screening_result.reason:
            unreliable_reasons.append(
                f"unusual cell shape: {shape_screening_result.reason}"
            )

        # Cell overlay runs regardless of is_unreliable , if anything, an
        # unreliable result is exactly when seeing WHY matters most. This
        # is the headline feature: real per-cell shape data the app draws
        # directly on the photo. Wrapped in try/except like the other
        # auxiliary checks , a failure here shouldn't take down the core
        # anemia prediction.
        #
        # CHANGED: passes the pre-computed `contours` through instead of
        # letting get_cell_overlay() re-run detect_cell_contours() a
        # third time on the same image.
        try:
            cell_overlay_result: CellOverlayResult = get_cell_overlay(
                raw_resized_image, contours=contours
            )
        except Exception as error:
            cell_overlay_result = CellOverlayResult(
                cells=[], cell_count=0, flagged_count=0,
                error=f"cell overlay failed: {error}",
            )

        # asdict() converts the dataclasses (and any nested dataclasses,
        # e.g. each CellOverlayEntry inside cell_overlay_result.cells)
        # back into plain dicts/lists , the JSON response shape is
        # unchanged from before shape_screening.py returned dataclasses.
        shape_screening_dict = asdict(shape_screening_result)
        cell_overlay_dict = asdict(cell_overlay_result)

        return {
            "anemia_probability": round(anemia_probability, 4),
            "is_anemic": is_anemic,
            "decision_threshold": ANEMIA_DECISION_THRESHOLD,
            "cbc": cbc_values,
            "morphology_probs": morphology_result,
            "morphology_flag_reliability": MORPHOLOGY_FLAG_IS_RELIABLE,
            "is_unreliable": is_unreliable,
            "unreliable_reasons": unreliable_reasons,
            "shape_screening": shape_screening_dict,
            "cell_overlay": cell_overlay_dict,
            "scope_disclaimer": ANEMIA_SCOPE_DISCLAIMER,
            "cbc_scope_disclaimer": CBC_ACCURACY_DISCLAIMER,
}
