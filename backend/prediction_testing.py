import os
import requests
import json

BASE_URL = "http://localhost:8000"

# Reads the token from an environment variable instead of hardcoding it in
# the file -- keeps a real credential out of any code you paste, commit,
# or share. Set it once in your terminal before running this script:
#   export AIDEPOINT_TEST_TOKEN="your_token_here"
ACCESS_TOKEN = os.environ.get("AIDEPOINT_TEST_TOKEN")
if not ACCESS_TOKEN:
    raise RuntimeError(
        "AIDEPOINT_TEST_TOKEN environment variable is not set. "
        "Run: export AIDEPOINT_TEST_TOKEN='your_token_here'"
    )

IMAGE_PATH = "/home/yaa_baby/Downloads/Testing_Images/malaria.jpg"

with open(IMAGE_PATH, "rb") as image_file:
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
    )

print("Status code:", response.status_code)
print()

if response.status_code == 200:
    result = response.json()
    print("is_anemic:", result.get("is_anemic"))
    print("anemia_probability:", result.get("anemia_probability"))
    print("is_unreliable:", result.get("is_unreliable"))
    print("unreliable_reasons:", result.get("unreliable_reasons"))
    print("was_cropped:", result.get("was_cropped"))
    print("cell_overlay cell_count:", result.get("cell_overlay", {}).get("cell_count"))
    print("cell_overlay flagged_count:", result.get("cell_overlay", {}).get("flagged_count"))
    print("scope_disclaimer:", result.get("scope_disclaimer"))

    # New: image quality result, added alongside the reliability gate
    image_quality = result.get("image_quality", {})
    print()
    print("image_quality.quality_score:", image_quality.get("quality_score"))
    print("image_quality.cells_detected:", image_quality.get("cells_detected"))
    print("image_quality.failure_reasons:", image_quality.get("failure_reasons"))

    print()
    print("Full response saved to predict_response.json for inspection.")
    with open("predict_response.json", "w") as output_file:
        json.dump(result, output_file, indent=2)

elif response.status_code == 422:
    # This is the new "image unusable" path -- raised via HTTPException,
    # so the actual payload is nested under "detail" rather than being
    # at the top level of the JSON response.
    error_body = response.json()
    error_detail = error_body.get("detail", {})
    print("Request blocked before inference ran:")
    print("  error:", error_detail.get("error"))
    print("  message:", error_detail.get("message"))
    print("  image_quality:", error_detail.get("image_quality"))

    with open("predict_response.json", "w") as output_file:
        json.dump(error_body, output_file, indent=2)

else:
    print("Error response:")
    print(response.text)
