# model.py
# Loads the ONNX model once at startup and exposes a single predict() call.
# onnxruntime is used — it is the most stable ONNX inference runtime.
#
# CHANGED: model.py now also loads ood_stats.json (committed alongside this
# file — see export_ood_stats_json.py) and runs the reliability gate from
# quality_checks.py on every prediction. A result is only returned as a
# confident ANEMIC/HEALTHY label if the image actually resembles what this
# specific checkpoint was trained on; otherwise the app gets an
# "is_unreliable" flag plus specific reasons instead of a wrong label.

import os
import json
import numpy as np
import onnxruntime as ort

from quality_checks import run_reliability_gate

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

DECISION_THRESHOLD = float(os.getenv("ANEMIA_DECISION_THRESHOLD", "0.34"))

# Path to the reliability-gate stats committed alongside this file.
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
    Wraps the exported ONNX model.
    Loaded once at FastAPI startup — thread-safe for concurrent requests.
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
                f"must be committed alongside model.py — see "
                f"export_ood_stats_json.py in the training notebook. "
                f"Without it, the reliability gate cannot run and every "
                f"result would silently skip the out-of-distribution check."
            )
        with open(OOD_STATS_PATH) as f:
            self.ood_stats = json.load(f)

        print(f"[AidePoint] ONNX model loaded from {model_path} "
              f"(decision threshold: {DECISION_THRESHOLD}, "
              f"reliability gate: active)")

    def predict(self, model_input: np.ndarray, raw_resized_bgr: np.ndarray) -> dict:
        """
        model_input:     (1,3,260,260) float32 NCHW, from preprocess_image().
        raw_resized_bgr: (260,260,3) uint8 BGR, also from preprocess_image() —
                          needed for the pixel-level reliability checks.

        Anemia TYPE classification is intentionally NOT done here: it's
        derived client-side by cbcTypeEngine.js from these same CBC +
        morphology values via Wintrobe classification, per the app's
        architecture.
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

        return {
            "anemia_probability": round(anemia_prob, 4),
            "is_anemic":          is_anemic,
            "decision_threshold": DECISION_THRESHOLD,
            "cbc":                cbc_values,
            "cbc_flags":          cbc_flags,
            "morphology_probs":   morphology,
            "is_unreliable":      is_unreliable,
            "unreliable_reasons": reasons,
        }
