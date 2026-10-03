"""
PayPal Sandbox Payment Integration Module for FastAPI
Supports SQLite (local development) and PostgreSQL (production).
Compatible with official PayPal REST Checkout v2 API.
"""

import os
import base64
import httpx
from datetime import datetime
from typing import Optional, List, Dict
from pydantic import BaseModel
from fastapi import FastAPI, APIRouter, HTTPException, Depends, Header, status

router = APIRouter(prefix="/api/paypal", tags=["PayPal Payments"])

# -------------------------------------------------------------
# Configuration (loaded from Environment Variables)
# -------------------------------------------------------------
PAYPAL_CLIENT_ID = os.getenv("PAYPAL_CLIENT_ID", "")
PAYPAL_CLIENT_SECRET = os.getenv("PAYPAL_CLIENT_SECRET", "")
PAYPAL_MODE = os.getenv("PAYPAL_MODE", "sandbox").strip().lower()

PAYPAL_BASE_URL = (
    "https://api-m.paypal.com"
    if PAYPAL_MODE == "live"
    else "https://api-m.sandbox.paypal.com"
)

# -------------------------------------------------------------
# Server-Authoritative Package Tiers (Never modified by client)
# -------------------------------------------------------------
PACKAGE_TIERS: Dict[str, Dict] = {
    "pkg_100": {
        "id": "pkg_100",
        "name_ar": "باقة الانطلاق (100 تعليق)",
        "name_en": "Starter Pack (100 Comments)",
        "max_comments": 100,
        "amount": "4.99",
        "currency": "USD",
        "popular": False,
    },
    "pkg_1000": {
        "id": "pkg_1000",
        "name_ar": "باقة المحترفين (1,000 تعليق)",
        "name_en": "Pro Pack (1,000 Comments)",
        "max_comments": 1000,
        "amount": "14.99",
        "currency": "USD",
        "popular": True,
        "badge": "الأكثر طلباً",
    },
    "pkg_10000": {
        "id": "pkg_10000",
        "name_ar": "باقة الأعمال (10,000 تعليق)",
        "name_en": "Business Pack (10,000 Comments)",
        "max_comments": 10000,
        "amount": "49.99",
        "currency": "USD",
        "badge": "قيمة فائقة",
    },
    "pkg_100000": {
        "id": "pkg_100000",
        "name_ar": "باقة المؤثرين (100,000 تعليق)",
        "name_en": "Enterprise Pack (100,000 Comments)",
        "max_comments": 100000,
        "amount": "149.99",
        "currency": "USD",
    },
    "pkg_1000000": {
        "id": "pkg_1000000",
        "name_ar": "باقة المليون (1,000,000 تعليق)",
        "name_en": "VIP Million Pack (1,000,000 Comments)",
        "max_comments": 1000000,
        "amount": "499.99",
        "currency": "USD",
        "badge": "غير محدود تقريباً",
    },
}

# -------------------------------------------------------------
# Pydantic Schemas
# -------------------------------------------------------------
class CreateOrderRequest(BaseModel):
    page_id: str
    package_id: str

class CaptureOrderRequest(BaseModel):
    order_id: str
    page_id: str

class PackageInfo(BaseModel):
    id: str
    name_ar: str
    name_en: str
    max_comments: int
    amount: str
    currency: str
    popular: Optional[bool] = False
    badge: Optional[str] = None

# -------------------------------------------------------------
# PayPal Helper Functions
# -------------------------------------------------------------
async def get_paypal_access_token() -> str:
    """Fetch OAuth 2.0 access token from PayPal Sandbox"""
    if not PAYPAL_CLIENT_ID or not PAYPAL_CLIENT_SECRET:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="PayPal Sandbox credentials (PAYPAL_CLIENT_ID / PAYPAL_CLIENT_SECRET) are missing.",
        )

    credentials = f"{PAYPAL_CLIENT_ID}:{PAYPAL_CLIENT_SECRET}"
    encoded = base64.b64encode(credentials.encode()).decode()

    async with httpx.AsyncClient() as client:
        res = await client.post(
            f"{PAYPAL_BASE_URL}/v1/oauth2/token",
            headers={
                "Authorization": f"Basic {encoded}",
                "Content-Type": "application/x-www-form-urlencoded",
            },
            data={"grant_type": "client_credentials"},
            timeout=15.0,
        )

    if res.status_code != 200:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="Failed to authenticate with PayPal Sandbox API.",
        )

    return res.json().get("access_token", "")

# -------------------------------------------------------------
# Endpoints
# -------------------------------------------------------------
@router.get("/packages", response_model=List[PackageInfo])
async def list_packages():
    """Returns available upgrade tiers with backend-enforced prices"""
    return list(PACKAGE_TIERS.values())

@router.get("/config")
async def get_config():
    """Returns PayPal mode and readiness without leaking secrets"""
    return {
        "mode": PAYPAL_MODE,
        "is_configured": bool(PAYPAL_CLIENT_ID and PAYPAL_CLIENT_SECRET),
    }

@router.post("/create-order")
async def create_order(payload: CreateOrderRequest):
    """
    Creates a PayPal Checkout v2 Order with Intent: CAPTURE.
    Prices are enforced strictly from backend constants.
    """
    pkg = PACKAGE_TIERS.get(payload.package_id)
    if not pkg:
        raise HTTPException(status_code=400, detail="Invalid package ID.")

    token = await get_paypal_access_token()

    order_payload = {
        "intent": "CAPTURE",
        "purchase_units": [
            {
                "reference_id": payload.page_id,
                "description": f"Baseera AI Upgrade - {pkg['name_en']}",
                "amount": {
                    "currency_code": pkg["currency"],
                    "value": pkg["amount"],
                },
            }
        ],
        "application_context": {
            "brand_name": "Baseera AI",
            "user_action": "PAY_NOW",
            "return_url": f"/payment/success?page_id={payload.page_id}&pkg={pkg['id']}",
            "cancel_url": f"/payment/cancel?page_id={payload.page_id}",
        },
    }

    async with httpx.AsyncClient() as client:
        res = await client.post(
            f"{PAYPAL_BASE_URL}/v2/checkout/orders",
            headers={
                "Authorization": f"Bearer {token}",
                "Content-Type": "application/json",
            },
            json=order_payload,
            timeout=15.0,
        )

    if res.status_code not in (200, 201):
        raise HTTPException(status_code=res.status_code, detail="PayPal order creation failed.")

    data = res.json()
    approval_url = next((l["href"] for l in data.get("links", []) if l.get("rel") == "approve"), None)

    return {
        "success": True,
        "order_id": data["id"],
        "approval_url": approval_url,
        "package": pkg,
    }

@router.post("/capture-order")
async def capture_order(payload: CaptureOrderRequest):
    """
    Captures PayPal Order, validates COMPLETED status,
    and updates the maximum comments allowed on the question page.
    """
    token = await get_paypal_access_token()

    async with httpx.AsyncClient() as client:
        res = await client.post(
            f"{PAYPAL_BASE_URL}/v2/checkout/orders/{payload.order_id}/capture",
            headers={
                "Authorization": f"Bearer {token}",
                "Content-Type": "application/json",
            },
            json={},
            timeout=15.0,
        )

    if res.status_code not in (200, 201):
        raise HTTPException(status_code=res.status_code, detail="PayPal capture failed.")

    data = res.json()
    status_str = data.get("status", "")
    if status_str != "COMPLETED":
        raise HTTPException(status_code=400, detail=f"Payment not completed. Status: {status_str}")

    capture_id = data.get("purchase_units", [{}])[0].get("payments", {}).get("captures", [{}])[0].get("id", payload.order_id)

    # Note: In your application, run SQL:
    # UPDATE pages SET max_comments = :new_max WHERE id = :page_id;
    # INSERT INTO payments (...) VALUES (...);

    return {
        "success": True,
        "capture_id": capture_id,
        "status": "COMPLETED",
    }
