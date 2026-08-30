import uuid
from datetime import datetime, date
from decimal import Decimal
from typing import List, Optional, Dict, Any
from pydantic import BaseModel, ConfigDict, Field


class MedicineCatalogItemCreate(BaseModel):
    standard_identifier: str = Field(..., description="Unique standard medicine code / barcode")
    name: str = Field(..., description="Brand or trade name")
    generic_name: Optional[str] = Field(None, description="Active ingredient or salt formula")
    schedule: str = Field("otc", description="Regulatory schedule: otc, h, h1, x")


class MedicineCatalogItemUpdate(BaseModel):
    name: Optional[str] = None
    generic_name: Optional[str] = None
    schedule: Optional[str] = None


class MedicineCatalogItemResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    medicine_id: uuid.UUID
    standard_identifier: str
    name: str
    generic_name: Optional[str] = None
    schedule: str
    created_at: datetime


class StockSourceResponse(BaseModel):
    source_type: str  # "owned" or "partner"
    source_id: uuid.UUID
    source_name: Optional[str] = None
    quantity: int
    price: float


class GenericEquivalentResponse(BaseModel):
    medicine_id: uuid.UUID
    name: str
    generic_name: Optional[str] = None
    schedule: str


class MedicineSearchItemResponse(BaseModel):
    medicine_id: uuid.UUID
    name: str
    generic_name: Optional[str] = None
    schedule: str
    price: Optional[float] = None
    in_stock: bool = False
    total_stock: int = 0
    manufacturer: Optional[str] = None
    dosage_form: Optional[str] = None
    strength: Optional[str] = None
    pack_size: Optional[str] = None
    description: Optional[str] = None


class MedicineSearchResponse(BaseModel):
    data: List[MedicineSearchItemResponse]
    next_cursor: Optional[str] = None
    has_more: bool = False


class MedicineDetailResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    medicine_id: uuid.UUID
    standard_identifier: str
    name: str
    generic_name: Optional[str] = None
    schedule: str
    in_stock: bool
    total_quantity: int
    stock_sources: List[StockSourceResponse] = []
    generic_equivalents: List[GenericEquivalentResponse] = []
    created_at: datetime


class OwnedStockCreate(BaseModel):
    medicine_id: uuid.UUID
    batch_number: str
    expiry_date: date
    quantity: int = Field(..., ge=0)
    price: Decimal = Field(..., ge=0)


class OwnedStockResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    stock_id: uuid.UUID
    medicine_id: uuid.UUID
    batch_number: str
    expiry_date: date
    quantity: int
    price: float
    updated_at: datetime


class PartnerPharmacyCreate(BaseModel):
    name: str
    address: Dict[str, Any]
    gstin: Optional[str] = None
    fulfillment_radius_km: float = 15.0
    catalog_feed_url: Optional[str] = None


class PartnerPharmacyResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    partner_id: uuid.UUID
    name: str
    address: Dict[str, Any]
    gstin: Optional[str] = None
    fulfillment_radius_km: float
    status: str
    created_at: datetime


class PartnerStockCreate(BaseModel):
    partner_id: uuid.UUID
    medicine_id: uuid.UUID
    quantity: int = Field(..., ge=0)
    price: Decimal = Field(..., ge=0)


class PartnerStockResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    stock_id: uuid.UUID
    partner_id: uuid.UUID
    medicine_id: uuid.UUID
    quantity: int
    price: float
    last_synced_at: Optional[datetime] = None


class GenericMappingCreate(BaseModel):
    medicine_id: uuid.UUID
    equivalent_medicine_id: uuid.UUID


class GenericMappingResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    mapping_id: uuid.UUID
    medicine_id: uuid.UUID
    equivalent_medicine_id: uuid.UUID
    created_at: datetime


class PrescriptionMatchRequest(BaseModel):
    prescription_id: uuid.UUID


class MatchItem(BaseModel):
    field_id: uuid.UUID
    field_name: str
    extracted_value: str
    medicine_id: Optional[uuid.UUID] = None
    medicine_name: Optional[str] = None
    match_type: str  # "exact", "generic", "fuzzy", "none"
    confidence_score: float
    auto_addable: bool = False


class PrescriptionMatchResponse(BaseModel):
    prescription_id: uuid.UUID
    matches: List[MatchItem]
