# model.py
# Loads the ONNX model once at startup and exposes a single predict() call.
# onnxruntime is used — it is the most stable ONNX inference runtime.

import numpy as np
import onnxruntime as ort
import os

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

TYPE_KEYS = [
    'sickle_cell', 'iron_deficiency', 'malaria', 'thalassemia',
    'pernicious', 'megaloblastic', 'aplastic', 'hemolytic', 'normal',
]

# ── CBC denormalization ranges (must match CBC_NORM in training) ─────────────
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

# ── Pediatric reference ranges for flagging ──────────────────────────────────
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

# ── Urgency messages shown in the app ───────────────────────────────────────
URGENCY_MAP = {
    'sickle_cell':     'High — urgent haematology referral required',
    'iron_deficiency': 'Moderate — iron panel and dietary review recommended',
    'malaria':         'High — commence anti-malarial treatment immediately',
    'thalassemia':     'Moderate-High — genetic counselling and specialist review advised',
    'pernicious':      'Moderate — vitamin B12 replacement therapy required',
    'megaloblastic':   'Moderate — folate/B12 deficiency workup required',
    'aplastic':        'Critical — immediate bone marrow evaluation required',
    'hemolytic':       'High — Coombs test and haematology referral required',
    'normal':          'None — routine follow-up recommended',
}

MORPHOLOGY_MAP = {
    'sickle_cell':     'Crescent/sickle-shaped erythrocytes visible on peripheral smear',
    'iron_deficiency': 'Hypochromic microcytic cells with increased central pallor',
    'malaria':         'Ring-form intraerythrocytic parasites identified',
    'thalassemia':     'Target cells (codocytes) with microcytic hypochromic pattern',
    'pernicious':      'Macro-ovalocytes and hypersegmented neutrophils present',
    'megaloblastic':   'Giant erythroid precursors with multilobed neutrophil nuclei',
    'aplastic':        'Severe pancytopenia; hypocellular marrow pattern indicated',
    'hemolytic':       'Schistocytes and helmet cells consistent with haemolysis',
    'normal':          'No pathological cell morphology detected',
}


def _sigmoid(x: np.ndarray) -> np.ndarray:
    return 1.0 / (1.0 + np.exp(-x))


def _softmax(x: np.ndarray) -> np.ndarray:
    e = np.exp(x - x.max())
    return e / e.sum()


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

        # CPU provider is most stable and portable on Railway
        # If Railway adds GPU support later, add 'CUDAExecutionProvider'
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
        print(f"[AidePoint] ONNX model loaded from {model_path}")

    def predict(self, image_array: np.ndarray) -> dict:
        """
        Runs inference on a preprocessed (1,3,260,260) float32 array.
        Returns a fully structured result dict ready to send to the app.
        """
        outputs = self.session.run(None, {self.input_name: image_array})

        # Outputs are in the order defined during export:
        # 0=binary, 1=cbc, 2=morph, 3=type
        binary_logit = outputs[0][0, 0]   # scalar
        cbc_normed   = outputs[1][0]      # (14,)
        morph_logits = outputs[2][0]      # (8,)
        type_logits  = outputs[3][0]      # (9,)

        # ── Binary ──────────────────────────────────────────────────────────
        anemia_prob = float(_sigmoid(binary_logit))
        is_anemic   = anemia_prob >= 0.5

        # ── CBC ─────────────────────────────────────────────────────────────
        cbc_values = _denormalize_cbc(cbc_normed)
        cbc_flags  = _flag_cbc(cbc_values)

        # ── Morphology ───────────────────────────────────────────────────────
        morph_probs = _sigmoid(morph_logits)
        morphology  = {
            key: round(float(morph_probs[i]), 4)
            for i, key in enumerate(MORPH_KEYS)
        }

        # ── Anemia type ──────────────────────────────────────────────────────
        type_probs  = _softmax(type_logits)
        type_idx    = int(type_probs.argmax())
        condition   = TYPE_KEYS[type_idx]
        confidence  = round(float(type_probs[type_idx]) * 100, 1)

        # Override to normal if binary head says not anemic
        # (type head can misfire on healthy patients)
        if not is_anemic:
            condition  = 'normal'
            confidence = round((1.0 - anemia_prob) * 100, 1)

        return {
            "anemia_probability": round(anemia_prob, 4),
            "is_anemic":          is_anemic,
            "condition":          condition,
            "confidence":         confidence,
            "urgency":            URGENCY_MAP.get(condition, ''),
            "morphology_note":    MORPHOLOGY_MAP.get(condition, ''),
            "cbc":                cbc_values,
            "cbc_flags":          cbc_flags,
            "morphology_probs":   morphology,
            "type_probabilities": {
                key: round(float(type_probs[i]), 4)
                for i, key in enumerate(TYPE_KEYS)
            },
        }
