# model.py
# Loads the ONNX model once at startup and exposes a single predict() call.
# onnxruntime is used — it is the most stable ONNX inference runtime.
#
# CHANGED (this pass): predict() now also runs shape_screening.py and, if
# the image passed both reliability checks, the anemia_type_infer.py
# classifier. Both are optional in the sense that a failure in either
# should degrade the response rather than break it — a lab tech should
# never see a 500 error because the type classifier hit an edge case when
# the core anemia call itself was fine. See the try/except around each in
# predict() below; that's a deliberate choice, not an oversight.

import os
import json
import numpy as np
import onnxruntime as ort

from quality_checks import run_reliability_gate
from shape_screening import run_shape_screening
from anemia_type_infer import AnemiaTypeClassifier

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

# Fixed scope statement returned on every single response, not just
# unreliable ones. The point isn't to hedge on individual bad predictions
# — it's that "HEALTHY" without this line reads as a general clean bill of
# health, when what the model actually checked is narrower than that. This
# is the direct answer to the sickle-cell-called-healthy case: rather than
# trying to detect every condition the model was never trained on, be
# explicit about what was and wasn't checked, every time.
SCOPE_DISCLAIMER = (
    "This result reflects anemia risk only, based on hemoglobin-related "
    "patterns in red blood cells. It does not screen for malaria, sickle "
    "cell disease, or other blood conditions."
)

# Paths to the two extra model artifacts, committed alongside model.py the
# same way ood_stats.json already is — both are small enough (a few MB)
# to live in the repo rather than needing separate blob storage.
OOD_STATS_PATH = os.getenv(
    "OOD_STATS_PATH",
    os.path.join(os.path.dirname(__file__), "ood_stats.json"),
)
ANEMIA_TYPE_MODEL_PATH = os.getenv(
    "ANEMIA_TYPE_MODEL_PATH",
    os.path.join(os.path.dirname(__file__), "anemia_type_model.joblib"),
)
ANEMIA_TYPE_LABELS_PATH = os.getenv(
    "ANEMIA_TYPE_LABELS_PATH",
    os.path.join(os.path.dirname(__file__), "anemia_type_labels.json"),
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
    Wraps the exported ONNX model, plus the two auxiliary checks
    (reliability gate, shape screening) and the anemia-type classifier.
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
                f"must be committed alongside model.py — see Cell 9 in the "
                f"training notebook. Without it, the reliability gate "
                f"cannot run and every result would silently skip the "
                f"out-of-distribution check."
            )
        with open(OOD_STATS_PATH) as f:
            self.ood_stats = json.load(f)

        # Anemia type classifier is treated as soft-optional at startup:
        # if it's missing, the app should still serve core anemia
        # predictions rather than refuse to boot. A missing type
        # classifier is a degraded feature, not a broken deployment.
        self.type_classifier = None
        if os.path.exists(ANEMIA_TYPE_MODEL_PATH) and os.path.exists(ANEMIA_TYPE_LABELS_PATH):
            self.type_classifier = AnemiaTypeClassifier(
                ANEMIA_TYPE_MODEL_PATH, ANEMIA_TYPE_LABELS_PATH
            )
        else:
            print("[AidePoint] WARNING: anemia type classifier artifacts "
                  "not found — /predict will omit anemia_type from its "
                  "response until anemia_type_model.joblib and "
                  "anemia_type_labels.json are added.")

        print(f"[AidePoint] ONNX model loaded from {model_path} "
              f"(decision threshold: {DECISION_THRESHOLD}, "
              f"reliability gate: active, shape screening: active, "
              f"type classifier: {'active' if self.type_classifier else 'MISSING'})")

    def predict(self, model_input: np.ndarray, raw_resized_bgr: np.ndarray) -> dict:
        """
        model_input:     (1,3,260,260) float32 NCHW, from preprocess_image().
        raw_resized_bgr: (260,260,3) uint8 BGR, also from preprocess_image() —
                          needed for the pixel-level reliability checks and
                          the shape screening gate.
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

        # Shape screening runs regardless of the reliability gate's
        # verdict, because it's answering a different question (cell
        # geometry, not overall image statistics) — see quality_checks.py's
        # module docstring for why these two need to be separate checks
        # rather than one combined signal.
        try:
            shape_result = run_shape_screening(raw_resized_bgr)
        except Exception as exc:
            # Deliberately fail open here rather than crash the whole
            # request over a screening check — an anemia result the app
            # can act on is more valuable than no result at all.
            shape_result = {"needs_review": False, "reason": None,
                             "error": f"shape screening failed: {exc}"}

        if shape_result.get("needs_review"):
            is_unreliable = True
            if shape_result.get("reason"):
                reasons.append(f"unusual cell shape: {shape_result['reason']}")

        # Type classification only makes sense to run on a result the app
        # is actually going to show as confident — running it on a flagged
        # /unreliable image would attach a specific-sounding diagnosis
        # label to a result we've already said not to trust, which is
        # worse than omitting it.
        anemia_type = None
        if self.type_classifier is not None and not is_unreliable:
            try:
                anemia_type = self.type_classifier.predict(cbc_values)
            except Exception as exc:
                anemia_type = {"error": f"type classification failed: {exc}"}

        return {
            "anemia_probability": round(anemia_prob, 4),
            "is_anemic":          is_anemic,
            "decision_threshold": DECISION_THRESHOLD,
            "cbc":                cbc_values,
            "cbc_flags":          cbc_flags,
            "morphology_probs":   morphology,
            "anemia_type":        anemia_type,
            "is_unreliable":      is_unreliable,
            "unreliable_reasons": reasons,
            "shape_screening":    shape_result,
            "scope_disclaimer":   SCOPE_DISCLAIMER,
}
