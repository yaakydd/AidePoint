import requests
import json


BASE_URL = "http://localhost:8000"
ACCESS_TOKEN = "eyJhbGciOiJFUzI1NiIsImtpZCI6IjFiNTdhNWExLWVmZjItNDJjOS1iN2NmLWQ2YmQzZWRhYmVhNyIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJodHRwczovL3BicXNicG15aHJvbHdpZmd5anR6LnN1cGFiYXNlLmNvL2F1dGgvdjEiLCJzdWIiOiIwZTllODRhMi0wNmUxLTRmOTYtOTNjMS00NGRmNzQ2Y2NkM2UiLCJhdWQiOiJhdXRoZW50aWNhdGVkIiwiZXhwIjoxNzg0ODE4Njg0LCJpYXQiOjE3ODQ4MTUwODQsImVtYWlsIjoiYW50d2l5YWExN0BnbWFpbC5jb20iLCJwaG9uZSI6IiIsImFwcF9tZXRhZGF0YSI6eyJwcm92aWRlciI6ImVtYWlsIiwicHJvdmlkZXJzIjpbImVtYWlsIl19LCJ1c2VyX21ldGFkYXRhIjp7ImVtYWlsIjoiYW50d2l5YWExN0BnbWFpbC5jb20iLCJlbWFpbF92ZXJpZmllZCI6dHJ1ZSwiaG9zcGl0YWxfbGFiIjoiQ2l0eWRpYSBEaWFnbm9zdGljcyIsIm5hbWUiOiJBbnR3aSBZYWEgQXNhbnRld2FhIiwicGhvbmVfdmVyaWZpZWQiOmZhbHNlLCJzdWIiOiIwZTllODRhMi0wNmUxLTRmOTYtOTNjMS00NGRmNzQ2Y2NkM2UifSwicm9sZSI6ImF1dGhlbnRpY2F0ZWQiLCJhYWwiOiJhYWwxIiwiYW1yIjpbeyJtZXRob2QiOiJwYXNzd29yZCIsInRpbWVzdGFtcCI6MTc4NDgxNTA4NH1dLCJzZXNzaW9uX2lkIjoiOTJkNmQxMmMtMzY4ZS00ODVkLWEwYmItZjdlNzMyMTJhM2UyIiwiaXNfYW5vbnltb3VzIjpmYWxzZX0.URiVRXHsYUsBrBDuGHGruilS5uyxSMpVMGdCx6V9cGZ6cO2DW8vtib64euLOaPcjFea0uUkNuD6Kywss08POJw"
IMAGE_PATH = "/home/yaa_baby/Downloads/anec.png"

with open(IMAGE_PATH, "rb") as image_file:
    response = requests.post(
        f"{BASE_URL}/predict",
        headers={"Authorization": f"Bearer {ACCESS_TOKEN}"},
        files={
    "file": (
        "anec.png",
        image_file,
        "image/png",
    )
}
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
    print()
    print("Full response saved to predict_response.json for inspection.")

    with open("predict_response.json", "w") as output_file:
        json.dump(result, output_file, indent=2)
else:
    print("Error response:")
    print(response.text)

