import uuid
from typing import Optional
from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.orm import Session
from app.db.session import get_db
from app.models.identity import User
from app.api.deps import get_current_user, require_roles
from app.services.catalog_service import CatalogService
from app.schemas.catalog import (
    MedicineSearchResponse,
    MedicineDetailResponse,
    MedicineCatalogItemCreate,
    MedicineCatalogItemResponse,
    OwnedStockCreate,
    OwnedStockResponse,
    PartnerPharmacyCreate,
    PartnerPharmacyResponse,
    PartnerStockCreate,
    PartnerStockResponse,
    GenericMappingCreate,
    GenericMappingResponse,
    PrescriptionMatchRequest,
    PrescriptionMatchResponse,
)

router = APIRouter(prefix="/catalog", tags=["Medicine Catalog & Inventory"])


@router.get("/medicines", response_model=MedicineSearchResponse)
def search_medicines(
    q: Optional[str] = Query(None, description="Search by brand or generic name"),
    schedule: Optional[str] = Query(None, description="Filter by regulatory schedule: otc, h, h1, x"),
    limit: int = Query(20, ge=1, le=100),
    cursor: Optional[str] = Query(None, description="Cursor for pagination"),
    db: Session = Depends(get_db)
):
    """
    Unified medicine catalog search with multi-source inventory aggregation (BRD FR-12).
    """
    items, next_cursor, has_more = CatalogService.search_medicines(
        db=db,
        q=q,
        schedule=schedule,
        limit=limit,
        cursor=cursor
    )
    return MedicineSearchResponse(
        data=items,
        next_cursor=next_cursor,
        has_more=has_more
    )


@router.get("/medicines/{medicine_id}", response_model=MedicineDetailResponse)
def get_medicine_detail(
    medicine_id: uuid.UUID,
    db: Session = Depends(get_db)
):
    """
    Retrieves full catalog details, available stock sources (owned & partner), and generic equivalents (BRD FR-12, FR-13).
    """
    return CatalogService.get_medicine_detail(db, medicine_id)


@router.post("/match", response_model=PrescriptionMatchResponse)
def match_prescription_to_catalog(
    req: PrescriptionMatchRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Matches extracted prescription items against the catalog with confidence scoring (BRD FR-13 / TRD Item 15).
    """
    return CatalogService.match_prescription(db, req.prescription_id)


@router.post(
    "/medicines",
    response_model=MedicineCatalogItemResponse,
    status_code=status.HTTP_201_CREATED
)
def create_medicine(
    req: MedicineCatalogItemCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles("admin", "super_admin"))
):
    """
    Adds a new item to the master medicine catalog (Admin only).
    """
    return CatalogService.create_catalog_item(
        db=db,
        standard_identifier=req.standard_identifier,
        name=req.name,
        generic_name=req.generic_name,
        schedule=req.schedule
    )


@router.post(
    "/owned-stock",
    response_model=OwnedStockResponse,
    status_code=status.HTTP_201_CREATED
)
def add_owned_stock(
    req: OwnedStockCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles("admin", "super_admin", "pharmacy_staff_owned"))
):
    """
    Records warehouse inventory stock batch for a medicine item.
    """
    return CatalogService.add_owned_stock(
        db=db,
        medicine_id=req.medicine_id,
        batch_number=req.batch_number,
        expiry_date=req.expiry_date,
        quantity=req.quantity,
        price=req.price
    )


@router.post(
    "/partner-pharmacies",
    response_model=PartnerPharmacyResponse,
    status_code=status.HTTP_201_CREATED
)
def register_partner_pharmacy(
    req: PartnerPharmacyCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles("admin", "user_admin", "super_admin"))
):
    """
    Registers a new partner pharmacy in the network.
    """
    return CatalogService.register_partner_pharmacy(
        db=db,
        name=req.name,
        address=req.address,
        gstin=req.gstin,
        fulfillment_radius_km=req.fulfillment_radius_km,
        catalog_feed_url=req.catalog_feed_url
    )


@router.post(
    "/partner-stock",
    response_model=PartnerStockResponse,
    status_code=status.HTTP_201_CREATED
)
def update_partner_stock(
    req: PartnerStockCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles("admin", "super_admin", "partner_pharmacy"))
):
    """
    Updates or feeds partner pharmacy inventory stock and pricing.
    """
    return CatalogService.update_partner_stock(
        db=db,
        partner_id=req.partner_id,
        medicine_id=req.medicine_id,
        quantity=req.quantity,
        price=req.price
    )


@router.post(
    "/generic-mappings",
    response_model=GenericMappingResponse,
    status_code=status.HTTP_201_CREATED
)
def create_generic_mapping(
    req: GenericMappingCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles("admin", "super_admin"))
):
    """
    Maps generic equivalents between catalog medicine items.
    """
    return CatalogService.create_generic_mapping(
        db=db,
        medicine_id=req.medicine_id,
        equivalent_medicine_id=req.equivalent_medicine_id
    )
