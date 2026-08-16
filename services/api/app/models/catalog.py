from sqlalchemy import Column, String, Integer, Date, Numeric, TIMESTAMP, Enum, ForeignKey, UniqueConstraint, CheckConstraint, text as sql_text
from sqlalchemy.dialects.postgresql import UUID, JSONB
from app.db.base import Base

class MedicineCatalogItem(Base):
    __tablename__ = 'medicine_catalog_items'

    medicine_id = Column(UUID(as_uuid=True), primary_key=True, server_default=sql_text("gen_random_uuid()"))
    standard_identifier = Column(String(50), unique=True, nullable=False)
    name = Column(String(255), nullable=False)
    generic_name = Column(String(255), nullable=True)
    schedule = Column(
        Enum('otc', 'h', 'h1', 'x', name='medicine_schedule'),
        nullable=False
    )
    created_at = Column(TIMESTAMP(timezone=True), nullable=False)


class OwnedInventoryStock(Base):
    __tablename__ = 'owned_inventory_stock'

    stock_id = Column(UUID(as_uuid=True), primary_key=True, server_default=sql_text("gen_random_uuid()"))
    medicine_id = Column(UUID(as_uuid=True), ForeignKey('medicine_catalog_items.medicine_id'), nullable=False)
    batch_number = Column(String(50), nullable=False)
    expiry_date = Column(Date, nullable=False)
    quantity = Column(Integer, nullable=False)
    price = Column(Numeric(10, 2), nullable=False)
    updated_at = Column(TIMESTAMP(timezone=True), nullable=False)

    __table_args__ = (
        CheckConstraint('quantity >= 0', name='chk_owned_stock_quantity_non_negative'),
    )


class PartnerPharmacy(Base):
    __tablename__ = 'partner_pharmacies'

    partner_id = Column(UUID(as_uuid=True), primary_key=True, server_default=sql_text("gen_random_uuid()"))
    name = Column(String(255), nullable=False)
    address = Column(JSONB, nullable=False)
    gstin = Column(String(20), nullable=True)
    fulfillment_radius_km = Column(Numeric(6, 2), nullable=False)
    catalog_feed_url = Column(String(500), nullable=True)
    status = Column(
        Enum('pending_activation', 'active', 'suspended', 'delisted', name='partner_status'),
        nullable=False,
        server_default='pending_activation'
    )
    created_at = Column(TIMESTAMP(timezone=True), nullable=False)


class PartnerStock(Base):
    __tablename__ = 'partner_stock'

    stock_id = Column(UUID(as_uuid=True), primary_key=True, server_default=sql_text("gen_random_uuid()"))
    partner_id = Column(UUID(as_uuid=True), ForeignKey('partner_pharmacies.partner_id'), nullable=False)
    medicine_id = Column(UUID(as_uuid=True), ForeignKey('medicine_catalog_items.medicine_id'), nullable=False)
    quantity = Column(Integer, nullable=False)
    price = Column(Numeric(10, 2), nullable=False)
    last_synced_at = Column(TIMESTAMP(timezone=True), nullable=True)

    __table_args__ = (
        UniqueConstraint('partner_id', 'medicine_id', name='uq_partner_medicine'),
        CheckConstraint('quantity >= 0', name='chk_partner_stock_quantity_non_negative'),
    )


class GenericEquivalentMap(Base):
    __tablename__ = 'generic_equivalent_map'

    mapping_id = Column(UUID(as_uuid=True), primary_key=True, server_default=sql_text("gen_random_uuid()"))
    medicine_id = Column(UUID(as_uuid=True), ForeignKey('medicine_catalog_items.medicine_id'), nullable=False)
    equivalent_medicine_id = Column(UUID(as_uuid=True), ForeignKey('medicine_catalog_items.medicine_id'), nullable=False)
    created_at = Column(TIMESTAMP(timezone=True), nullable=False)

    __table_args__ = (
        UniqueConstraint('medicine_id', 'equivalent_medicine_id', name='uq_generic_equivalent'),
    )
