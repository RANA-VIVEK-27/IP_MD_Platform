import uuid
from typing import Optional
from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.models.identity import User
from app.api.deps import require_admin_permission, require_roles
from app.services.order_service import OrderService
from app.services.admin_service import AdminService
from app.schemas.orders import DisputeListResponse, DisputeResponse, DisputeResolveRequest
from app.schemas.admin import (
    DashboardSummaryResponse,
    PartnerPharmacyCreateRequest,
    PartnerPharmacyUpdateRequest,
    PartnerPharmacyResponse,
    PartnerPharmacyListResponse,
    OverdueVerificationResponse,
    OverdueVerificationItem,
)

router = APIRouter(prefix="/admin", tags=["Admin System Control & Operations"])


@router.get("/gated-feature")
def admin_gated_feature(
    current_user: User = Depends(require_admin_permission("MANAGE_SYSTEM_SETTINGS"))
):
    """Admin endpoint gated by explicit admin permissions check."""
    return {
        "status": "success",
        "message": "Admin feature accessed successfully",
        "user_id": str(current_user.user_id),
        "role": current_user.role
    }


@router.get("/dashboard/summary", response_model=DashboardSummaryResponse)
def get_dashboard_summary(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles("admin", "super_admin"))
):
    """
    Returns aggregate operational metrics (orders, inventory turnover, fulfillment SLA breaches, verification queue depth)
    per BRD FR-20 and API Collection §3.8.
    """
    summary = AdminService.get_dashboard_summary(db=db)
    return DashboardSummaryResponse(**summary)


@router.get("/partner-pharmacies", response_model=PartnerPharmacyListResponse)
def list_partner_pharmacies(
    status: Optional[str] = Query(None, description="Filter by onboarding status"),
    limit: int = Query(20, ge=1, le=100),
    cursor: Optional[str] = Query(None, description="Pagination cursor"),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles("admin", "super_admin"))
):
    """
    Lists onboarded partner pharmacies with fulfillment radius and status (BRD FR-20 / API §3.8).
    """
    partners, next_cursor = AdminService.list_partner_pharmacies(
        db=db, status_filter=status, limit=limit, cursor=cursor
    )
    return PartnerPharmacyListResponse(
        data=[PartnerPharmacyResponse.model_validate(p) for p in partners],
        next_cursor=next_cursor
    )


@router.post("/partner-pharmacies", response_model=PartnerPharmacyResponse, status_code=status.HTTP_201_CREATED)
def create_partner_pharmacy(
    req: PartnerPharmacyCreateRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles("admin", "super_admin"))
):
    """
    Onboards a new partner pharmacy (BRD FR-20 / API §3.8).
    """
    res = AdminService.create_partner_pharmacy(
        db=db,
        admin_user=current_user,
        name=req.name,
        email=req.email,
        password=req.password,
        address=req.address,
        fulfillment_radius_km=req.fulfillment_radius_km,
        phone=req.phone,
        catalog_feed_url=req.catalog_feed_url
    )
    return PartnerPharmacyResponse(
        partner_id=res["partner_id"],
        name=req.name,
        fulfillment_radius_km=req.fulfillment_radius_km,
        status=res["status"]
    )


@router.patch("/partner-pharmacies/{partner_id}", response_model=PartnerPharmacyResponse)
def update_partner_pharmacy(
    partner_id: uuid.UUID,
    req: PartnerPharmacyUpdateRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles("admin", "super_admin"))
):
    """
    Updates partner pharmacy details or activation status (BRD FR-20 / API §3.8).
    """
    res = AdminService.update_partner_pharmacy(
        db=db,
        admin_user=current_user,
        partner_id=partner_id,
        update_status=req.status,
        fulfillment_radius_km=req.fulfillment_radius_km
    )
    from app.models.catalog import PartnerPharmacy
    partner = db.query(PartnerPharmacy).filter(PartnerPharmacy.partner_id == partner_id).first()
    return PartnerPharmacyResponse.model_validate(partner)


@router.get("/orders/disputes", response_model=DisputeListResponse)
def list_disputes(
    limit: int = Query(20, ge=1, le=100),
    cursor: Optional[str] = Query(None, description="Pagination cursor"),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles("admin", "super_admin"))
):
    """
    Lists orders flagged for dispute resolution (BRD FR-20 / API §3.8).
    """
    disputes, next_cursor = OrderService.list_disputes(db=db, limit=limit, cursor=cursor)
    return DisputeListResponse(
        data=[DisputeResponse.model_validate(d) for d in disputes],
        next_cursor=next_cursor
    )


@router.post("/orders/disputes/{dispute_id}/resolve", response_model=DisputeResponse)
def resolve_dispute(
    dispute_id: uuid.UUID,
    req: DisputeResolveRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles("admin", "super_admin"))
):
    """
    Resolves an order dispute and generates an audit log entry (BRD FR-20 / API §3.8).
    """
    dispute = OrderService.resolve_dispute(
        db=db,
        admin_user=current_user,
        dispute_id=dispute_id,
        resolution=req.resolution
    )
    return DisputeResponse.model_validate(dispute)


@router.get("/verification-queue/overdue", response_model=OverdueVerificationResponse)
def list_overdue_verifications(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles("admin", "super_admin"))
):
    """
    Lists doctor-verification queue items exceeding the 12-hour SLA target for escalation (BRD FR-21 / API §3.8).
    """
    items = AdminService.list_overdue_verifications(db=db)
    return OverdueVerificationResponse(data=[OverdueVerificationItem(**item) for item in items])
