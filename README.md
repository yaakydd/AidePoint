# AidePoint

AidePoint is a mobile app that helps lab technicians screen for anaemia from a photo of a blood smear. The technician takes a picture through a microscope, and the app returns a risk result, the reasons behind it, and a report that can be saved or shared.

It is built for settings where a full lab workup is slow or unavailable. It is a screening aid. It does not diagnose anything, and every result should be confirmed by a qualified clinician.

## What it does

- **Screens a smear image for anaemia.** The image is checked, cropped to the microscope field, and passed to a neural network that returns an anaemia probability.
- **Refuses to guess when the image is bad.** Blurry, too dark, badly stained, or unusual images are flagged as unreliable. In that case the app returns `unknown` instead of a confident "healthy" or "anemic".
- **Shows its reasoning.** Each result includes the confidence level, any red blood cell shape findings, a per-cell overlay showing which cells look abnormal, and rough estimates of six CBC values.
- **Generates reports.** Results are saved per patient, exported as PDF, and protected behind a 4 digit PIN or biometrics.
- **Includes a chat assistant (AideBot).** Technicians can ask what a result or finding means. The assistant is grounded in the report data and is told not to invent findings.
- **Runs on a tiered plan.** Daily scan and chat limits depend on the plan. Technicians who agree to share their images for model retraining earn bonus scans.

## How a result is produced

A scan goes through these steps on the backend, in order:

1. **Validation.** The upload must be JPEG or PNG, under 10 MB, and the user must be signed in and within their daily scan limit.
2. **Preprocessing.** The image is cropped to the circular microscope field and resized to 260 by 260 pixels.
3. **Quality checks.** Blur, brightness, contrast, staining colour, vignetting and cell count are measured. If no cells can be found at all, the request is rejected and the user is asked to retake the photo.
4. **Cell shape screening.** Individual cells are outlined and scored for how far they are from round. If too many cells look distorted, the sample is treated as possibly outside what the model was built for.
5. **Model inference.** An ONNX model returns four outputs: the anaemia probability, six CBC estimates, nine morphology flags, and an image embedding.
6. **Reliability gate.** The embedding is compared against statistics from the training data. Images that sit far from the training distribution are marked unreliable.
7. **Final condition.** One function, `services/condition.py`, decides the verdict. The rules are:
   - If the sample looks off scope, the result is `unknown`.
   - Otherwise a model probability at or above the threshold gives `anemic`.
   - A `healthy` result is downgraded to `unknown` if a non-anemia morphology flag fired.
8. **Explanation and storage.** The app receives the verdict, confidence, findings and overlay. The prediction is saved to an audit table. The image is stored in cloud storage only if the user has consented.

Keeping the verdict logic in one place is deliberate. It used to exist in three places that drifted apart, so the backend, the app and the chatbot now all defer to the same value.

## Model performance

These figures come from `backend/models/eval_report.json`, measured on a held-out set of 2,400 validation samples at the deployed threshold of 0.50.

| Metric | Value |
| --- | --- |
| Recall (sensitivity) | 96.4% |
| Specificity | 85.2% |
| Precision | 86.7% |
| F1 score | 0.913 |
| Accuracy | 90.8% |
| AUC-ROC | 0.976 |

The threshold was chosen to favour recall. For a screening tool, a missed case costs more than a false alarm. A threshold of 0.58 would have raised precision slightly but missed about 13 more anaemia cases per 1,200, and real-world phone photos are known to differ from the validation images, so the extra margin was kept.

### Known limits

- **CBC values are rough estimates.** Haemoglobin is off by about 2.9 g/dL on average and MCV by about 10 fL. They are shown as directional hints, and the app labels them that way.
- **Some morphology flags are not reliable.** `dimorphic_picture`, `macrocytosis` and `poikilocytosis` scored an F1 below 0.30 in validation, so the backend hides them. Flags between 0.30 and 0.70 are shown but labelled as possible rather than confirmed.
- **Anaemia only.** The app does not screen for malaria, sickle cell disease or other conditions. Unusual cell shapes push the result to `unknown` instead of being classified.
- **Image conditions matter.** The model expects a standard stain and a clear microscope field. Phone photos taken under poor lighting will often be rejected by the quality checks.

## Project structure

```
AidePoint/
  backend/            FastAPI service that runs the model
    main.py           App setup, model loading, CORS, error handling
    auth.py           Verifies Supabase sign-in tokens
    routers/          predict, aidebot, health (payments is present but disabled)
    services/         Image checks, model wrapper, verdict logic, storage, limits
    models/           ONNX model, evaluation report, thresholds, feature config
    Dockerfile
  frontend/           React Native app built with Expo
    screens/          Home, Scan, Camera, Report, Chatbot, Profile and others
    auth/             Sign up, sign in, email verification, password reset
    components/       Report detail, cell overlay, PIN modal, transparency trail
    utils/            API client, PDF export, local storage, PIN handling
    navigation/       Auth and main app navigators
  supabase/
    functions/delete-account/   Edge function that removes a user and their data
```

## Tech stack

| Area | Tools |
| --- | --- |
| Mobile app | React Native 0.81, Expo SDK 54, React Navigation |
| Backend | Python 3.13, FastAPI, ONNX Runtime, OpenCV, NumPy, SciPy |
| Auth and data | Supabase (Auth, Postgres, Storage, Edge Functions) |
| Chat assistant | Google Gemini, called from the backend |
| Hosting | Backend runs in Docker on Render |

## Getting started

### Requirements

- Python 3.13
- Node.js 18 or newer
- A Supabase project
- A Gemini API key
- Android Studio or Xcode for running the app on a device or emulator
- Docker (optional, for running the backend in a container)

### 1. Supabase

Create a Supabase project and note the project URL, the anon key and the service role key.

The backend and app expect these tables: `profiles`, `patients`, `scans`, `prediction_records`, `notifications` and `aidebot_messages`, and a storage bucket named `scan-images`. Row level security on the bucket should restrict access to the folder named after the signed-in user's ID.

The database schema is not included in this repository. Create the tables to match the columns used in the code, or add your own migrations to `supabase/`.

Deploy the account deletion function:

```bash
supabase functions deploy delete-account
```

### 2. Backend

```bash
cd backend
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
```

Create `backend/.env`:

```
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_KEY=your-service-role-key
GEMINI_API_KEY=your-gemini-key
```

Optional settings:

| Variable | Purpose | Default |
| --- | --- | --- |
| `ALLOWED_ORIGINS` | Comma separated list of allowed CORS origins | `*` |
| `MODEL_VERSION` | Label stored with each prediction | `unversioned` |
| `ANEMIA_DECISION_THRESHOLD` | Override the decision threshold | Value in `eval_report.json` |

Start the server:

```bash
uvicorn main:app --reload --port 8000
```

Check that it is running:

```bash
curl http://localhost:8000/health
```

To run it with Docker instead:

```bash
docker build -t aidepoint-backend ./backend
docker run --env-file backend/.env -p 7860:7860 aidepoint-backend
```

The service will not start if `models/AidePoint.onnx` or `models/feature_config.json` is missing, or if the model outputs do not match the field lists in the config. This is intentional, so a stale model file fails loudly at startup instead of returning misaligned results.

### 3. Mobile app

```bash
cd frontend
npm install
```

Create `frontend/.env`:

```
EXPO_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
EXPO_PUBLIC_API_URL=http://your-backend-address:8000
EXPO_PUBLIC_API_BASE_URL=http://your-backend-address:8000
```

When testing on a physical phone, use your computer's local network address instead of `localhost`.

The app uses native modules such as the camera and secure storage, so it needs a development build and will not run in Expo Go:

```bash
npx expo run:android
# or
npx expo run:ios
```

After the first build, `npm start` launches the development server.

## API overview

All endpoints except `/health` require a Supabase access token in the `Authorization: Bearer` header.

| Method | Path | Purpose |
| --- | --- | --- |
| GET | `/health` | Reports whether the model is loaded |
| POST | `/predict` | Analyses a smear image and returns the full result |
| GET | `/predict/scan-limit` | Returns scans remaining today |
| PATCH | `/predict/{prediction_id}/notes` | Updates the technician's notes on a scan |
| POST | `/aidebot/chat` | Sends a message to the chat assistant |

`/predict` takes a multipart form with `file`, `patient_sample_id`, and optional `temperature` and `blood_pressure`. Interactive API docs are available at `/docs` when the server is running.

`backend/prediction_testing.py` is a small script for calling `/predict` with a test image. It reads `AIDEPOINT_TEST_TOKEN` and `AIDEPOINT_TEST_IMAGE` from the environment.

## Plans and limits

| | Basic | Max | Pro |
| --- | --- | --- | --- |
| Scans per day | 5 | 30 | Unlimited |
| Bonus for saving images | +1 scan | +3 scans | Renewal discount |
| Report history | 14 days | 90 days | 365 days |

Bonus scans are earned by saving five images in a day, and only for users who have agreed to image storage. Paid plans are not yet on sale, and the payments route is disabled.

## Privacy and data handling

- **Images are opt in.** During onboarding the user chooses whether images may be kept for model retraining. If they decline, images are analysed and then discarded. The choice can be changed later in the profile settings.
- **Stored images are organised by result** (`anemia`, `healthy`, `unknown`) under the technician's own folder, with the confidence score attached.
- **Reports are locked.** Report access sits behind a 4 digit PIN stored in the device's secure storage, with optional biometric unlock. The app locks again after 60 seconds in the background.
- **Every prediction is logged** to an audit table, including image quality results, the model threshold used, and the verdict.
- **Accounts can be deleted.** The delete-account function removes the user's notifications, chat messages, scans, predictions, patients, profile and login, in that order.

## Medical disclaimer

AidePoint is a research and screening tool. It is not a medical device and has not been cleared or approved by any regulator. Its output must not be used as the sole basis for a diagnosis or treatment decision. Anyone with symptoms or a positive screen should be tested with a laboratory CBC and assessed by a clinician.

## Contributing

Issues and pull requests are welcome. Please keep the frontend and backend plan limits in sync when changing either, since the app pre-checks limits and the server enforces them. The values live in `frontend/constants/SubscriptionPlans.js` and `backend/services/subscription.py`.
