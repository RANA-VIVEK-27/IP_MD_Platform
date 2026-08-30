"""
Pharmacy Staff API Router
All endpoints for pharmacy staff operations:
- Dashboard
- Medicine catalog CRUD
- Inventory CRUD
- Order management
- Fulfillment management
"""
import uuid
from typing import Optional
from fastapi import APIRouter, Depends, Query, status, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel, Field

from app.db.session import get_db
from app.models.identity import User
from app.api.deps import get_current_user, require_roles
from app.services.pharmacy_service import PharmacyService


router = APIRouter(prefix="/pharmacy", tags=["Pharmacy Staff"])


# ── Schemas ──────────────────────────────────────────

class MedicineCreateRequest(BaseModel):
    standard_identifier: str = Field(..., min_length=1, max_length=50)
    name: str = Field(..., min_length=1, max_length=255)
    generic_name: Optional[str] = Field(None, max_length=255)
    schedule: str = Field("otc", description="otc, h, h1, x")
    manufacturer: Optional[str] = Field(None, max_length=255)
    dosage_form: Optional[str] = Field(None, max_length=100, description="tablet, capsule, syrup, injection, cream, drops, etc.")
    strength: Optional[str] = Field(None, max_length=100, description="e.g. 500mg, 10ml")
    pack_size: Optional[str] = Field(None, max_length=100, description="e.g. 10 tablets, 1 bottle")
    description: Optional[str] = Field(None, description="Medicine description / indications")
    side_effects: Optional[str] = Field(None, description="Common side effects")
    contraindications: Optional[str] = Field(None, description="When not to use")
    storage_conditions: Optional[str] = Field(None, max_length=255, description="e.g. Store below 25°C")
    drug_interactions: Optional[str] = Field(None, description="Known drug interactions")


class MedicineUpdateRequest(BaseModel):
    name: Optional[str] = Field(None, min_length=1, max_length=255)
    generic_name: Optional[str] = Field(None, max_length=255)
    schedule: Optional[str] = Field(None, description="otc, h, h1, x")
    manufacturer: Optional[str] = Field(None, max_length=255)
    dosage_form: Optional[str] = Field(None, max_length=100)
    strength: Optional[str] = Field(None, max_length=100)
    pack_size: Optional[str] = Field(None, max_length=100)
    description: Optional[str] = None
    side_effects: Optional[str] = None
    contraindications: Optional[str] = None
    storage_conditions: Optional[str] = Field(None, max_length=255)
    drug_interactions: Optional[str] = None


class StockCreateRequest(BaseModel):
    medicine_id: uuid.UUID
    batch_number: str = Field(..., min_length=1, max_length=50)
    expiry_date: str = Field(..., description="YYYY-MM-DD")
    quantity: int = Field(..., ge=0)
    price: float = Field(..., ge=0)


class StockUpdateRequest(BaseModel):
    batch_number: Optional[str] = Field(None, min_length=1, max_length=50)
    expiry_date: Optional[str] = Field(None, description="YYYY-MM-DD")
    quantity: Optional[int] = Field(None, ge=0)
    price: Optional[float] = Field(None, ge=0)


class OrderAcceptRequest(BaseModel):
    pass


class OrderDispatchRequest(BaseModel):
    pass


class FulfillmentUpdateRequest(BaseModel):
    status: str = Field(..., description="dispatched or delivered")


# ── Dashboard ────────────────────────────────────────

@router.get("/dashboard")
def get_dashboard(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles("pharmacy_staff_owned", "partner_pharmacy", "pharmacist", "pharmacy_admin", "admin", "super_admin")),
):
    """Pharmacy dashboard with real database statistics."""
    return PharmacyService.get_dashboard(db, current_user)


# ── Medicine Catalog ─────────────────────────────────

@router.get("/medicines")
def list_medicines(
    search: Optional[str] = Query(None, description="Search by name, generic, or code"),
    schedule: Optional[str] = Query(None, description="Filter: otc, h, h1, x"),
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles("pharmacy_staff_owned", "partner_pharmacy", "pharmacist", "pharmacy_admin", "admin", "super_admin")),
):
    """List medicines with search, filter, and pagination."""
    items, total = PharmacyService.list_medicines(db, search, schedule, page, page_size, user=current_user)
    return {
        "data": items,
        "total": total,
        "page": page,
        "page_size": page_size,
        "has_more": (page * page_size) < total,
    }


@router.get("/medicines/{medicine_id}")
def get_medicine(
    medicine_id: uuid.UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles("pharmacy_staff_owned", "partner_pharmacy", "pharmacist", "pharmacy_admin", "admin", "super_admin")),
):
    """Get single medicine detail."""
    return PharmacyService.get_medicine(db, medicine_id)


@router.post("/medicines", status_code=status.HTTP_201_CREATED)
def create_medicine(
    req: MedicineCreateRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles("pharmacy_staff_owned", "partner_pharmacy", "pharmacist", "pharmacy_admin", "admin", "super_admin")),
):
    """Create a new medicine in the catalog."""
    return PharmacyService.create_medicine(
        db, req.standard_identifier, req.name, req.generic_name, req.schedule,
        req.manufacturer, req.dosage_form, req.strength, req.pack_size,
        req.description, req.side_effects, req.contraindications,
        req.storage_conditions, req.drug_interactions,
    )


@router.patch("/medicines/{medicine_id}")
def update_medicine(
    medicine_id: uuid.UUID,
    req: MedicineUpdateRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles("pharmacy_staff_owned", "partner_pharmacy", "pharmacist", "pharmacy_admin", "admin", "super_admin")),
):
    """Update an existing medicine."""
    return PharmacyService.update_medicine(
        db, medicine_id, req.name, req.generic_name, req.schedule,
        req.manufacturer, req.dosage_form, req.strength, req.pack_size,
        req.description, req.side_effects, req.contraindications,
        req.storage_conditions, req.drug_interactions,
    )


@router.delete("/medicines/{medicine_id}")
def delete_medicine(
    medicine_id: uuid.UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles("pharmacy_staff_owned", "partner_pharmacy", "pharmacist", "pharmacy_admin", "admin", "super_admin")),
):
    """Delete a medicine (checks for references)."""
    return PharmacyService.delete_medicine(db, medicine_id)


# ── Inventory ────────────────────────────────────────

@router.get("/inventory")
def list_inventory(
    medicine_id: Optional[uuid.UUID] = Query(None),
    expiring_soon: bool = Query(False),
    low_stock: bool = Query(False),
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles("pharmacy_staff_owned", "partner_pharmacy", "pharmacist", "pharmacy_admin", "admin", "super_admin")),
):
    """List inventory stock with optional filters."""
    items, total = PharmacyService.list_stock(db, medicine_id, expiring_soon, low_stock, page, page_size, user=current_user)
    return {
        "data": items,
        "total": total,
        "page": page,
        "page_size": page_size,
        "has_more": (page * page_size) < total,
    }


@router.get("/inventory/{stock_id}")
def get_inventory_item(
    stock_id: uuid.UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles("pharmacy_staff_owned", "partner_pharmacy", "pharmacist", "pharmacy_admin", "admin", "super_admin")),
):
    """Get single inventory item."""
    return PharmacyService.get_stock(db, stock_id)


@router.post("/inventory", status_code=status.HTTP_201_CREATED)
def create_inventory(
    req: StockCreateRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles("pharmacy_staff_owned", "partner_pharmacy", "pharmacist", "pharmacy_admin", "admin", "super_admin")),
):
    """Add new stock batch. For partners, creates partner_stock."""
    from decimal import Decimal
    if current_user.role == 'partner_pharmacy':
        return PharmacyService.create_partner_stock(
            db, current_user, req.medicine_id, req.quantity, Decimal(str(req.price))
        )
    from datetime import date as date_type
    expiry = date_type.fromisoformat(req.expiry_date)
    return PharmacyService.create_stock(
        db, req.medicine_id, req.batch_number, expiry, req.quantity, Decimal(str(req.price))
    )


@router.patch("/inventory/{stock_id}")
def update_inventory(
    stock_id: uuid.UUID,
    req: StockUpdateRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles("pharmacy_staff_owned", "partner_pharmacy", "pharmacist", "pharmacy_admin", "admin", "super_admin")),
):
    """Update stock entry."""
    from datetime import date as date_type
    from decimal import Decimal
    expiry = date_type.fromisoformat(req.expiry_date) if req.expiry_date else None
    price = Decimal(str(req.price)) if req.price is not None else None
    return PharmacyService.update_stock(db, stock_id, req.batch_number, expiry, req.quantity, price)


@router.delete("/inventory/{stock_id}")
def delete_inventory(
    stock_id: uuid.UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles("pharmacy_staff_owned", "partner_pharmacy", "pharmacist", "pharmacy_admin", "admin", "super_admin")),
):
    """Delete stock entry."""
    return PharmacyService.delete_stock(db, stock_id)


# ── Orders ───────────────────────────────────────────

@router.get("/orders")
def list_orders(
    status: Optional[str] = Query(None, description="Filter: placed, processing, dispatched, delivered, cancelled"),
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles("pharmacy_staff_owned", "partner_pharmacy", "pharmacist", "pharmacy_admin", "admin", "super_admin")),
):
    """List orders relevant to this pharmacy."""
    items, total = PharmacyService.list_pharmacy_orders(db, current_user, status, page, page_size)
    return {
        "data": items,
        "total": total,
        "page": page,
        "page_size": page_size,
        "has_more": (page * page_size) < total,
    }


@router.get("/orders/{order_id}")
def get_order_detail(
    order_id: uuid.UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles("pharmacy_staff_owned", "partner_pharmacy", "pharmacist", "pharmacy_admin", "admin", "super_admin")),
):
    """Get order detail for pharmacy."""
    return PharmacyService.get_pharmacy_order_detail(db, order_id)


@router.post("/orders/{order_id}/accept")
def accept_order(
    order_id: uuid.UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles("pharmacy_staff_owned", "partner_pharmacy", "pharmacist", "pharmacy_admin", "admin", "super_admin")),
):
    """Accept an order (placed -> processing)."""
    return PharmacyService.accept_order(db, order_id, current_user)


@router.post("/orders/{order_id}/dispatch")
def dispatch_order(
    order_id: uuid.UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles("pharmacy_staff_owned", "partner_pharmacy", "pharmacist", "pharmacy_admin", "admin", "super_admin")),
):
    """Dispatch an order (processing -> dispatched, decrements stock)."""
    return PharmacyService.dispatch_order(db, order_id, current_user)


@router.post("/orders/{order_id}/collect-payment")
def collect_payment(
    order_id: uuid.UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles("pharmacy_staff_owned", "partner_pharmacy", "pharmacist", "pharmacy_admin", "admin", "super_admin")),
):
    """Mark payment as collected (COD / offline)."""
    return PharmacyService.collect_payment(db, order_id, current_user)


# ── Fulfillment ──────────────────────────────────────

@router.get("/fulfillment")
def list_fulfillments(
    status: Optional[str] = Query(None, description="Filter: assigned, dispatched, delivered"),
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles("pharmacy_staff_owned", "partner_pharmacy", "pharmacist", "pharmacy_admin", "admin", "super_admin")),
):
    """List fulfillment records."""
    items, total = PharmacyService.list_fulfillments(db, current_user, status, page, page_size)
    return {
        "data": items,
        "total": total,
        "page": page,
        "page_size": page_size,
        "has_more": (page * page_size) < total,
    }


@router.patch("/fulfillment/{fulfillment_id}")
def update_fulfillment(
    fulfillment_id: uuid.UUID,
    req: FulfillmentUpdateRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles("pharmacy_staff_owned", "partner_pharmacy", "pharmacist", "pharmacy_admin", "admin", "super_admin")),
):
    """Update fulfillment status (assigned->dispatched->delivered)."""
    return PharmacyService.update_fulfillment_status(db, fulfillment_id, req.status)


# ── Pharmacist-specific endpoints ─────────────────────

@router.get("/pharmacist/dashboard")
def pharmacist_dashboard(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles("pharmacist")),
):
    """Pharmacist dashboard: prescription verification queue and drug alerts."""
    return PharmacyService.get_pharmacist_dashboard(db, current_user)


@router.get("/pharmacist/prescriptions")
def pharmacist_prescriptions(
    status: Optional[str] = Query(None, description="Filter: pending_review, doctor_verified, verified, rejected"),
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles("pharmacist")),
):
    """List prescriptions for pharmacist review."""
    items, total = PharmacyService.list_pharmacist_prescriptions(db, current_user, status, page, page_size)
    return {"data": items, "total": total, "page": page, "page_size": page_size, "has_more": (page * page_size) < total}


class PharmacistReviewRequest(BaseModel):
    action: str = Field(..., description="approve or reject")
    notes: Optional[str] = Field(None, description="Review notes, required for rejection")


@router.post("/pharmacist/prescriptions/{prescription_id}/review")
def pharmacist_review_prescription(
    prescription_id: uuid.UUID,
    req: PharmacistReviewRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles("pharmacist")),
):
    """Pharmacist reviews a prescription: approve or reject with notes."""
    if req.action not in ("approve", "reject"):
        raise HTTPException(status_code=422, detail="INVALID_ACTION: Must be 'approve' or 'reject'")
    if req.action == "reject" and not req.notes:
        raise HTTPException(status_code=422, detail="NOTES_REQUIRED: Rejection requires notes explaining the reason")
    return PharmacyService.review_prescription(db, current_user, prescription_id, req.action, req.notes)
