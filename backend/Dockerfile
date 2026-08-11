
FROM python:3.11-slim

# libgl1 and libglib2.0-0 are OpenCV's actual runtime dependencies for
# image decoding/color conversion (cv2.cvtColor, cv2.imread, etc) --
# opencv-python-headless still needs these even though it has no GUI
# component. Installed once here at the OS layer since pip cannot supply
# system shared libraries on its own.
RUN apt-get update && apt-get install -y --no-install-recommends \
    libgl1 \
    libglib2.0-0 \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copied and installed before the rest of the source so Docker's layer
# cache can skip the (slow) dependency install on every rebuild where
# only application code changed, not requirements.txt.
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Everything else: main.py, model.py, preprocess.py, the ONNX model,
# ood_stats.json, eval_report.json, and the rest of the backend files.
COPY . .

# HF Spaces' Docker SDK expects the app to listen on port 7860 --
# not overridable via the Spaces UI the way Railway's $PORT is, so this
# is hardcoded to match what the platform actually routes traffic to.
EXPOSE 7860

# HF Spaces containers run as a non-root user by convention/security
# policy on their infrastructure -- granting broad write access to /app
# avoids permission errors if any code path here ever needs to write a
# file at runtime (e.g. a future local cache), rather than failing with
# a permissions error that's confusing to debug on a platform where you
# can't just chmod things yourself.
RUN chmod -R 777 /app

# --host 0.0.0.0 is required, not optional -- FastAPI/uvicorn's default
# of 127.0.0.1 only accepts connections from inside the container itself,
# which would make the Space unreachable from outside despite the
# container running and appearing "healthy".
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "7860"]
