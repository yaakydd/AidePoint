from fastapi import APIRouter, Request

router = APIRouter()


@router.get("/health")
async def health(request: Request):
    return {
        "status": "OK",
        "model_loaded": request.app.state.model is not None,
    }