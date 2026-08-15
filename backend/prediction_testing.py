import os
import requests
import json

BASE_URL = "https://aidepoint.onrender.com"
#   export AIDEPOINT_TEST_TOKEN="your_token_here"
ACCESS_TOKEN = os.environ.get("AIDEPOINT_TEST_TOKEN")
if not ACCESS_TOKEN:
    raise RuntimeError(
        "AIDEPOINT_TEST_TOKEN environment variable is not set. "
        "Run: export AIDEPOINT_TEST_TOKEN='your_token_here'"
    )

IMAGE_PATH = "/home/yaa_baby/Downloads/Testing_Images/malaria.jpg"

# /predict requires patient_sample_id as a form field alongside the file --
# without it the request 400s before inference ever runs. Any non-empty
# string works for local testing since there's no patient registration
# flow to look this up against yet.
PATIENT_SAMPLE_ID = "TEST-001"

# temperature/blood_pressure are optional form fields, persisted onto the
# prediction_records row for this scan. Omit either by setting to None if
# you want to test the no-vitals path.
TEMPERATURE = "37.1"
BLOOD_PRESSURE = "120/80"

with open(IMAGE_PATH, "rb") as image_file:
    form_data = {"patient_sample_id": PATIENT_SAMPLE_ID}
    if TEMPERATURE is not None:
        form_data["temperature"] = TEMPERATURE
    if BLOOD_PRESSURE is not None:
        form_data["blood_pressure"] = BLOOD_PRESSURE

    response = requests.post(
        f"{BASE_URL}/predict",
        headers={"Authorization": f"Bearer {ACCESS_TOKEN}"},
        files={
            "file": (
                "malaria.jpg",
                image_file,
                "image/jpg",
            )
        },
        data=form_data,
    )

print("Status code:", response.status_code)
print()

if response.status_code == 200:
    result = response.json()

    # "condition" is the one authoritative three-way result
    # (anemic / healthy / unknown), decided server-side at the API
    # boundary -- prefer this over reconstructing it from is_anemic/
    # is_unreliable yourself. When condition is "unknown",
    # anemia_probability and prediction_confidence are physically null
    # below, not just conventionally unused.
    print("condition:", result.get("condition"))
    print("is_anemic:", result.get("is_anemic"))
    print("anemia_probability:", result.get("anemia_probability"))
    print("decision_threshold:", result.get("decision_threshold"))
    print("is_unreliable:", result.get("is_unreliable"))
    print("unreliable_reasons:", result.get("unreliable_reasons"))
    print("was_cropped:", result.get("was_cropped"))
    print("inference_ms:", result.get("inference_ms"))
    print("cell_overlay cell_count:", result.get("cell_overlay", {}).get("cell_count"))
    print("cell_overlay flagged_count:", result.get("cell_overlay", {}).get("flagged_count"))
    print("scope_disclaimer:", result.get("scope_disclaimer"))

    print()
    print("prediction_id:", result.get("prediction_id"))
    print("prediction_confidence:", result.get("prediction_confidence"))
    print("cbc_pattern_summary:", json.dumps(result.get("cbc_pattern_summary"), indent=2))
    print("morphology_findings:", json.dumps(result.get("morphology_findings"), indent=2))
    print("explanation:", json.dumps(result.get("explanation"), indent=2))

    # image quality result, from the pre-inference quality gate
    image_quality = result.get("image_quality", {})
    print()
    print("image_quality.quality_score:", image_quality.get("quality_score"))
    print("image_quality.cells_detected:", image_quality.get("cells_detected"))
    print("image_quality.failure_reasons:", image_quality.get("failure_reasons"))

    print()
    print("Full response saved to predict_response.json for inspection.")
    with open("predict_response.json", "w") as output_file:
        json.dump(result, output_file, indent=2)

elif response.status_code == 400:
    # patient_sample_id missing/blank or over 255 chars. Model-not-loaded
    # is a SEPARATE case -- see 503 below, not this branch.
    error_body = response.json()
    print("Request rejected:", error_body.get("detail"))

elif response.status_code == 413:
    # Image exceeds the 10 MB hard limit.
    error_body = response.json()
    print("Image too large:", error_body.get("detail"))

elif response.status_code == 415:
    # Unsupported content type -- only JPEG/PNG/JPG are accepted.
    error_body = response.json()
    print("Unsupported file type:", error_body.get("detail"))

elif response.status_code == 422:
    # "image unusable" -- raised via HTTPException, so the actual payload
    # is nested under "detail" rather than at the top level of the JSON.
    # (Note: 422 is ALSO returned for a corrupt/unreadable image that
    # fails preprocessing entirely, in which case "detail" is a plain
    # string rather than this nested dict -- handle both shapes below.)
    error_body = response.json()
    detail = error_body.get("detail", {})
    if isinstance(detail, dict):
        print("Request blocked before inference ran:")
        print("  error:", detail.get("error"))
        print("  message:", detail.get("message"))
        print("  image_quality:", detail.get("image_quality"))
    else:
        print("Request rejected (preprocessing failed):", detail)

    with open("predict_response.json", "w") as output_file:
        json.dump(error_body, output_file, indent=2)

elif response.status_code == 503:
    # Model not loaded yet -- distinct from the 400 patient_sample_id
    # case above. Retry after a few seconds.
    error_body = response.json()
    print("Service unavailable:", error_body.get("detail"))

else:
    print("Error response:")
    print(response.text)