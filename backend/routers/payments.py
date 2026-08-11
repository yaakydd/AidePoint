import os
import hmac
import hashlib
import logging
import httpx
from fastapi import APIRouter, HTTPException, Request, Depends, status
from pydantic import BaseModel

from auth import verify_supabase_token
from services.subscription import _update_subscription_tier

log = logging.getLogger("aidepoint")
router = APIRouter()

# Payments (Paystack) 
# Ghana-only, GHS-only app, needs recurring billing — Paystack fits better
# here than Flutterwave for this specific combination. Decision already
# made before this code was written; not re-litigating it here.

PAYSTACK_SECRET_KEY = os.getenv("PAYSTACK_SECRET_KEY", "")
PAYSTACK_BASE_URL   = "https://api.paystack.co"

# Prices live here, not in the client. The app sends a plan_id; the server
# decides what that plan actually costs. Trusting a client-sent amount
# would let anyone pay ₵1 for a subscription just by editing the request.
# GHS here, converted to pesewas (x100) right before calling Paystack,
# since Paystack's API always wants the smallest currency unit.
PLAN_PRICES_GHS = {
    "monthly": 30.00,
    "annual":  300.00,
}


class InitializePaymentRequest(BaseModel):
    plan_id: str  # "monthly" or "annual" — validated against PLAN_PRICES_GHS below


@router.post("/payments/initialize")
async def initialize_payment(
    body: InitializePaymentRequest,
    user: dict = Depends(verify_supabase_token),
):
    """
    Starts a Paystack transaction and hands the app a checkout URL.
    The amount is looked up server-side from PLAN_PRICES_GHS — never taken
    from the request body — so a modified client can't pay less than the
    real price.
    """
    if body.plan_id not in PLAN_PRICES_GHS:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Unknown plan_id '{body.plan_id}'. "
                   f"Valid options: {list(PLAN_PRICES_GHS.keys())}",
        )
    if not PAYSTACK_SECRET_KEY:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Payments are not configured on this server.",
        )

    amount_ghs = PLAN_PRICES_GHS[body.plan_id]
    amount_pesewas = int(round(amount_ghs * 100))  # Paystack wants the smallest unit

    async with httpx.AsyncClient(timeout=10.0) as client:
        resp = await client.post(
            f"{PAYSTACK_BASE_URL}/transaction/initialize",
            headers={
                "Authorization": f"Bearer {PAYSTACK_SECRET_KEY}",
                "Content-Type":  "application/json",
            },
            json={
                "email":  user.get("email"),
                "amount": amount_pesewas,
                # metadata rides along to the webhook/verify response, so
                # there's no need for a separate pending-payments table
                # for a first version of this — the reference itself plus
                # this metadata is enough to reconcile a payment.
                "metadata": {
                    "user_id": user.get("id"),
                    "plan_id": body.plan_id,
                },
            },
        )

    data = resp.json()
    if resp.status_code >= 300 or not data.get("status"):
        log.error("Paystack initialize failed for user %s: %s", user.get("id"), data)
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="Could not start payment. Please try again.",
        )

    return {
        "authorization_url": data["data"]["authorization_url"],
        "reference":          data["data"]["reference"],
    }


@router.post("/payments/webhook")
async def paystack_webhook(request: Request):
    """
    Paystack calls this directly — no user is logged in on this request,
    so there's no Supabase JWT to check. Instead, trust is established by
    verifying the request itself came from Paystack, via an HMAC-SHA512
    signature over the raw request body using PAYSTACK_SECRET_KEY.

    This is the authoritative path for confirming a payment — a client-
    side redirect back to the app after checkout is NOT proof of payment
    (the user could close the browser, lose connection, or the redirect
    itself could be spoofed). This webhook is what actually grants access.
    """
    raw_body = await request.body()
    signature = request.headers.get("x-paystack-signature", "")

    expected_signature = hmac.new(
        PAYSTACK_SECRET_KEY.encode("utf-8"),
        raw_body,
        hashlib.sha512,
    ).hexdigest()

    # constant-time comparison — a naive `==` here would leak timing
    # information an attacker could use to forge a valid signature byte
    # by byte, which defeats the point of checking it at all
    if not hmac.compare_digest(expected_signature, signature):
        log.warning("Rejected webhook with invalid signature")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid signature",
        )

    event = await request.json()

    if event.get("event") == "charge.success":
        metadata = event.get("data", {}).get("metadata", {})
        user_id = metadata.get("user_id")
        plan_id = metadata.get("plan_id")

        if user_id and plan_id:
            await _update_subscription_tier(user_id, plan_id)
            log.info("Subscription updated via webhook: user=%s plan=%s", user_id, plan_id)
        else:
            # Not fatal — Paystack still gets its 200, just logged for
            # investigation. Returning an error here would make Paystack
            # retry a webhook that will never have the missing metadata.
            log.error("charge.success webhook missing user_id/plan_id in metadata: %s", event)

    # Paystack expects a 200 regardless of what the event was, as
    # acknowledgement it was received — anything else triggers retries.
    return {"status": "received"}


@router.get("/payments/verify/{reference}")
async def verify_payment(
    reference: str,
    user: dict = Depends(verify_supabase_token),
):
    """
    Lets the app proactively confirm payment right after the browser
    redirects back, instead of waiting on webhook delivery (which can lag
    by seconds to minutes). Applies the same subscription update the
    webhook would — both paths are allowed to independently grant access,
    since either one alone is sufficient proof of a successful charge.
    """
    if not PAYSTACK_SECRET_KEY:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Payments are not configured on this server.",
        )

    async with httpx.AsyncClient(timeout=10.0) as client:
        resp = await client.get(
            f"{PAYSTACK_BASE_URL}/transaction/verify/{reference}",
            headers={"Authorization": f"Bearer {PAYSTACK_SECRET_KEY}"},
        )
    data = resp.json()

    if resp.status_code >= 300 or not data.get("status"):
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="Could not verify payment with Paystack.",
        )

    charge = data["data"]
    metadata = charge.get("metadata", {})

    # Confirms the payment belongs to the person asking about it — without
    # this, one logged-in user could probe another user's reference and
    # have it silently applied to themselves.
    if metadata.get("user_id") != user.get("id"):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="This payment reference does not belong to your account.",
        )

    if charge.get("status") == "success":
        plan_id = metadata.get("plan_id")
        if plan_id:
            await _update_subscription_tier(user["id"], plan_id)
        return {"verified": True, "plan_id": plan_id}

    return {"verified": False, "status": charge.get("status")}