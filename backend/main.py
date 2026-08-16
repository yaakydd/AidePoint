import os
import json
import logging
from contextlib import asynccontextmanager
from dotenv import load_dotenv

load_dotenv()

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from starlette.requests import Request
from supabase import create_client, Client

from services.model import AidePointONNX
from routers.health import router as health_router
from routers.predict import router as predict_router
#from routers.payments import router as payments_router
from routers.aidebot import router as aidebot_router


# Logging 
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s  %(levelname)s  %(message)s",
)
log = logging.getLogger("aidepoint")

#  Config from environment variables 
ONNX_MODEL_PATH = os.getenv("ONNX_MODEL_PATH", os.path.join(os.path.dirname(__file__), "models", "AidePoint.onnx"))
SUPABASE_URL = os.getenv("SUPABASE_URL", "")# your project URL
SUPABASE_SERVICE_KEY = os.getenv("SUPABASE_SERVICE_KEY", "")  # service role, payments write

EVAL_REPORT_PATH = os.getenv(
    "EVAL_REPORT_PATH",
    os.path.join(os.path.dirname(__file__), "models", "eval_report.json"),
)

# Model singleton 
# Loaded once at startup, reused for every request. Thread-safe.
_model: AidePointONNX | None = None

# CBC per-field mean absolute error, loaded once at startup from the same
# eval_report.json model.py reads. model.py only exposes the *derived*
# confidence labels (CBC_CONFIDENCE_LABELS), not this raw MAE dict, and
# build_cbc_pattern_summary needs the raw numbers to compute its own
# per-field reliability tier , so this is read independently here rather
# than importing a private value out of model.py.
_cbc_mean_absolute_errors: dict[str, float] = {}

# Supabase client for writes that need to bypass row-level security
# (prediction record inserts, subscription tier updates). Auth
# verification still goes through the raw httpx call against
# /auth/v1/user below , that only needs the user's own token, not a
# service-role client, so it's left as-is rather than routed through this
# client for no reason.
_supabase_client: Client | None = None


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Load model, eval report stats, and Supabase client at startup."""
    global _model, _cbc_mean_absolute_errors, _supabase_client

    log.info("Loading ONNX model ...")
    _model = AidePointONNX(ONNX_MODEL_PATH)
    log.info("Model ready")

    if os.path.exists(EVAL_REPORT_PATH):
        with open(EVAL_REPORT_PATH) as eval_report_file:
            eval_report = json.load(eval_report_file)
        _cbc_mean_absolute_errors = eval_report.get("cbc_mae_per_field", {})
    else:
        log.warning(
            "%s not found, CBC pattern summaries will mark every field "
            "as not_estimable until this file is present.", EVAL_REPORT_PATH,
        )

    if SUPABASE_URL and SUPABASE_SERVICE_KEY:
        _supabase_client = create_client(SUPABASE_URL, SUPABASE_SERVICE_KEY)
    else:
        log.error(
            "SUPABASE_URL or SUPABASE_SERVICE_KEY not set , prediction "
            "records will fail to persist."
        )

    # human_review.py's get_supabase_client dependency reads this off
    # app.state rather than importing _supabase_client directly, since
    # that module needs a client that reflects whatever got created here
    # at startup, including the "not configured" None case.
    app.state.supabase_client = _supabase_client
    # Same reasoning applies to the model and CBC MAE stats now that the
    # routes that use them live in routers/predict.py rather than here.
    app.state.model = _model
    app.state.cbc_mean_absolute_errors = _cbc_mean_absolute_errors

    yield
    log.info("Shutting down.")


app = FastAPI(
    title="AidePoint",
    version="1.1.0",
    description="AI-powered anemia risk detection from Red Blood Cell microscopic images",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=os.getenv("ALLOWED_ORIGINS", "*").split(","),
    allow_methods=["GET", "POST", "PATCH"],
    allow_headers=["*"],
)

app.include_router(health_router)
app.include_router(predict_router)
# app.include_router(payments_router)
app.include_router(aidebot_router)


#  Global error handler, never expose raw tracebacks 
@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    log.error("Unhandled error: %s", exc, exc_info=True)
    return JSONResponse(
        status_code=500,
        content={"detail": "An unexpected error occurred. Please try again."},
    )
