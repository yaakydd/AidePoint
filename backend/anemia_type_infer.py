# Turns the image model's CBC output (from model.py's predict()) into an
# anemia type prediction, using the classifier trained in
# train_anemia_type.py. Deliberately kept as its own small module rather
# than folded into model.py -- these two models come from different
# datasets, have different confidence characteristics, and may end up on
# different retraining schedules, so keeping them decoupled means one can
# change without forcing a review of the other.

import json
import joblib
import numpy as np
import pandas as pd


class AnemiaTypeClassifier:
    def __init__(self, model_path: str, labels_path: str):
        self.model = joblib.load(model_path)
        with open(labels_path) as f:
            meta = json.load(f)
        self.classes = meta["classes"]
        self.feature_order = meta["feature_order"]

    def predict(self, cbc_values: dict) -> dict:
        """
        cbc_values: the `cbc` dict already returned by AidePointONNX.predict()
                    -- keys are CBC_KEYS from model.py (HAEMOGLOBIN, RBC, etc).

        Returns the predicted type plus per-class probabilities, so the
        app can show "most likely X, but Y was a close second" rather than
        a single unqualified label -- useful given how close some of these
        classes are on paper (normocytic hypochromic vs normocytic
        normochromic differ by MCHC alone).
        """
        # FEATURE_MAP in train_anemia_type.py defines this correspondence;
        # duplicated here rather than imported so this module has no
        # dependency on the training script once deployed.
        feature_map = {
            "WBC": "WBC", "RBC": "RBC", "HAEMOGLOBIN": "HGB",
            "HAEMATOCRIT": "HCT", "MCV": "MCV", "MCH": "MCH",
            "MCHC": "MCHC", "PLATELETS": "PLT",
            "NEUTROPHILS": "NEUTp", "LYMPHOCYTES": "LYMp",
        }
        row = {}
        for model_key, csv_col in feature_map.items():
            if model_key not in cbc_values:
                raise KeyError(
                    f"anemia type classifier needs '{model_key}' from the "
                    f"CBC output, but it wasn't present. Check that "
                    f"model.py's CBC_KEYS hasn't changed without updating "
                    f"this mapping."
                )
            row[csv_col] = cbc_values[model_key]

        # Built as a DataFrame with the same column names train_anemia_type.py
        # used (self.feature_order), rather than a bare array — the model
        # was fit on named columns, so this avoids a sklearn warning on
        # every single prediction and is one less place a silent column-
        # order mismatch could sneak in if FEATURE_ORDER ever changes.
        X = pd.DataFrame([row])[self.feature_order]
        probs = self.model.predict_proba(X)[0]
        order = np.argsort(probs)[::-1]

        return {
            "predicted_type": self.classes[order[0]],
            "confidence": round(float(probs[order[0]]), 4),
            "all_probabilities": {
                self.classes[i]: round(float(probs[i]), 4)
                for i in order
            },
        }
