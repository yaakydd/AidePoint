"""
Endpoints for the technician review workflow: accept, modify, or flag
an AI result, and record the outcome.

This is where "data-driven" stops being a claim and becomes something
real: every review with usable_for_retraining=True is a labeled example
you can eventually retrain on. A technician disagreeing with the model
and recording why is more valuable training signal than another correct
prediction, since it's a documented failure case rather than a guess.
"""

from datetime import datetime, timezone
from typing import Literal, Optional

from fastapi import APIRouter, Depends, HTTPException, Request
from pydantic import BaseModel, Field
from supabase import Client

router = APIRouter(prefix="/predictions", tags=["review"])


class ReviewSubmission(BaseModel):
    technician_decision: Literal["accepted", "modified", "flagged_for_review"]
    ai_was_correct: Optional[bool] = None
    observed_morphology: list[str] = Field(default_factory=list)
    final_interpretation: str
    technician_notes: Optional[str] = None


class ReviewResponse(BaseModel):
    review_id: str
    prediction_id: str
    reviewed_at: datetime


def get_supabase_client(request: Request) -> Client:
    """
    Wired to the same service-role Supabase client main.py builds once at
    startup (see _supabase_client in the lifespan handler), rather than
    creating a second client here -- reviews and predictions belong in
    the same audit trail and should go through one connection, not two
    independently configured ones that could drift apart.
    """
    supabase_client = request.app.state.supabase_client
    if supabase_client is None:
        raise HTTPException(
            status_code=503,
            detail="Supabase is not configured on this server.",
        )
    return supabase_client


async def get_current_technician_id(request: Request) -> str:
    """
    Wired to the same Supabase JWT check main.py's /predict endpoint
    uses, so a review submission requires the same login a prediction
    does -- there is no separate reviewer role yet, any authenticated
    technician can review any pending prediction.
    """
    from main import verify_supabase_token  # deferred to avoid a circular import at module load

    user = await verify_supabase_token(request)
    return user["id"]


@router.post("/{prediction_id}/review", response_model=ReviewResponse)
async def submit_review(
    prediction_id: str,
    submission: ReviewSubmission,
    supabase_client: Client = Depends(get_supabase_client),
    technician_id: str = Depends(get_current_technician_id),
) -> ReviewResponse:
    prediction_lookup = (
        supabase_client.table("prediction_records")
        .select("prediction_id, human_review_status")
        .eq("prediction_id", prediction_id)
        .execute()
    )

    if not prediction_lookup.data:
        raise HTTPException(status_code=404, detail="Prediction record not found")

    existing_review = (
        supabase_client.table("prediction_reviews")
        .select("review_id")
        .eq("prediction_id", prediction_id)
        .execute()
    )
    if existing_review.data:
        raise HTTPException(
            status_code=409,
            detail="This prediction already has a review on record",
        )

    # A flagged-for-review submission without a definite correctness call
    # is still useful for audit purposes but should not silently count as
    # a labeled training example -- a reviewer escalating uncertainty is
    # not the same as a reviewer providing a corrected label.
    usable_for_retraining = submission.ai_was_correct is not None

    review_row = {
        "prediction_id": prediction_id,
        "reviewing_technician_id": technician_id,
        "reviewed_at": datetime.now(timezone.utc).isoformat(),
        "technician_decision": submission.technician_decision,
        "ai_was_correct": submission.ai_was_correct,
        "observed_morphology": submission.observed_morphology,
        "final_interpretation": submission.final_interpretation,
        "technician_notes": submission.technician_notes,
        "usable_for_retraining": usable_for_retraining,
    }

    review_insert = supabase_client.table("prediction_reviews").insert(review_row).execute()
    if not review_insert.data:
        raise HTTPException(status_code=500, detail="Failed to save review")

    supabase_client.table("prediction_records").update(
        {"human_review_status": "completed"}
    ).eq("prediction_id", prediction_id).execute()

    saved_review = review_insert.data[0]
    return ReviewResponse(
        review_id=saved_review["review_id"],
        prediction_id=prediction_id,
        reviewed_at=saved_review["reviewed_at"],
    )


@router.get("/pending-review")
def list_pending_reviews(
    supabase_client: Client = Depends(get_supabase_client),
    technician_id: str = Depends(get_current_technician_id),
):
    """Predictions flagged by determine_review_requirement() in
    audit_trail.py that have not yet been reviewed by anyone."""
    pending = (
        supabase_client.table("prediction_records")
        .select("*")
        .eq("required_human_review", True)
        .eq("human_review_status", "pending")
        .order("created_at", desc=True)
        .execute()
    )
    return pending.data
