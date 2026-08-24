import uuid
from decimal import Decimal
from datetime import datetime
from typing import Optional, List
from pydantic import BaseModel, Field, ConfigDict

class CommissionConfigCreate(BaseModel):
    scope: str = Field('global', description="Scope: global, doctor, pharmacy")
    doctor_id: Optional[uuid.UUID] = None
    pharmacy_id: Optional[uuid.UUID] = None
    doctor_commission_rate: Decimal = Field(Decimal('5.00'), ge=0, le=100)
    platform_commission_rate: Decimal = Field(Decimal('2.00'), ge=0, le=100)
    platform_commission_base: str = Field('doctor_commission', description="doctor_commission or order_total")
    settlement_mode: str = Field('deduct_from_vendor', description="deduct_from_vendor or platform_funded")

class CommissionConfigResponse(CommissionConfigCreate):
    model_config = ConfigDict(from_attributes=True)
    config_id: uuid.UUID
    status: str
    created_at: datetime
    updated_at: datetime

class CommissionTransactionResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    transaction_id: uuid.UUID
    order_id: uuid.UUID
    doctor_id: Optional[uuid.UUID] = None
    pharmacy_id: Optional[uuid.UUID] = None
    doctor_commission_rate: Decimal
    doctor_commission_amount_paise: int
    platform_commission_rate: Decimal
    platform_commission_base: str
    platform_commission_amount_paise: int
    vendor_gross_amount_paise: int
    vendor_net_amount_paise: int
    settlement_mode: str
    currency: str
    commission_status: str
    created_at: datetime

class FinancialSummaryResponse(BaseModel):
    total_sales_paise: int
    total_doctor_commission_paise: int
    total_platform_commission_paise: int
    total_pharmacy_settlement_paise: int
    active_doctors_count: int
    active_pharmacies_count: int
    active_orders_count: int
