import uuid
from datetime import datetime, timezone, date
from decimal import Decimal
from typing import List, Optional, Tuple, Dict, Any
from fastapi import HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import or_, func

from app.models.catalog import (
    MedicineCatalogItem,
    OwnedInventoryStock,
    PartnerPharmacy,
    PartnerStock,
    GenericEquivalentMap,
)
from app.models.prescription_report import Prescription, ExtractedField
from app.schemas.catalog import (
    MedicineSearchItemResponse,
    MedicineDetailResponse,
    StockSourceResponse,
    GenericEquivalentResponse,
    PrescriptionMatchResponse,
    MatchItem,
)


class CatalogService:
    @staticmethod
    def search_medicines(
        db: Session,
        q: Optional[str] = None,
        schedule: Optional[str] = None,
        limit: int = 20,
        cursor: Optional[str] = None
    ) -> Tuple[List[MedicineSearchItemResponse], Optional[str], bool]:
        """
        Unified search across catalog items with multi-source stock aggregation (BRD FR-12).
        """
        query = db.query(MedicineCatalogItem)

        if q and q.strip():
            term = f"%{q.strip()}%"
            query = query.filter(
                or_(
                    MedicineCatalogItem.name.ilike(term),
                    MedicineCatalogItem.generic_name.ilike(term),
                    MedicineCatalogItem.standard_identifier.ilike(term)
                )
            )

        if schedule:
            query = query.filter(MedicineCatalogItem.schedule == schedule.lower())

        query = query.order_by(MedicineCatalogItem.name.asc())

        offset = 0
        if cursor:
            try:
                offset = int(cursor)
            except ValueError:
                offset = 0

        items = query.offset(offset).limit(limit + 1).all()
        has_more = len(items) > limit
        page_items = items[:limit]
        next_cursor = str(offset + limit) if has_more else None

        results: List[MedicineSearchItemResponse] = []
        for med in page_items:
            # Aggregate owned stock
            owned_rows = db.query(OwnedInventoryStock).filter(
                OwnedInventoryStock.medicine_id == med.medicine_id
            ).all()
            owned_qty = sum(r.quantity for r in owned_rows)
            owned_prices = [float(r.price) for r in owned_rows if r.quantity > 0]

            # Aggregate partner stock
            partner_rows = db.query(PartnerStock).join(
                PartnerPharmacy, PartnerPharmacy.partner_id == PartnerStock.partner_id
            ).filter(
                PartnerStock.medicine_id == med.medicine_id,
                PartnerPharmacy.status == "active"
            ).all()
            partner_qty = sum(r.quantity for r in partner_rows)
            partner_prices = [float(r.price) for r in partner_rows if r.quantity > 0]

            total_qty = owned_qty + partner_qty
            in_stock = total_qty > 0

            all_prices = owned_prices + partner_prices
            min_price = min(all_prices) if all_prices else (float(owned_rows[0].price) if owned_rows else None)

            results.append(
                MedicineSearchItemResponse(
                    medicine_id=med.medicine_id,
                    name=med.name,
                    generic_name=med.generic_name,
                    schedule=med.schedule,
                    price=min_price,
                    in_stock=in_stock,
                    total_stock=total_qty
                )
            )

        return results, next_cursor, has_more

    @staticmethod
    def get_medicine_detail(
        db: Session,
        medicine_id: uuid.UUID
    ) -> MedicineDetailResponse:
        """
        Retrieves full catalog detail including stock sources and generic equivalents (BRD FR-12, FR-13).
        """
        med = db.query(MedicineCatalogItem).filter(
            MedicineCatalogItem.medicine_id == medicine_id
        ).first()

        if not med:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="MEDICINE_NOT_FOUND"
            )

        stock_sources: List[StockSourceResponse] = []

        # 1. Owned inventory stock
        owned_rows = db.query(OwnedInventoryStock).filter(
            OwnedInventoryStock.medicine_id == med.medicine_id
        ).all()
        for o in owned_rows:
            stock_sources.append(
                StockSourceResponse(
                    source_type="owned",
                    source_id=o.stock_id,
                    source_name=f"Central Warehouse (Batch: {o.batch_number})",
                    quantity=o.quantity,
                    price=float(o.price)
                )
            )

        # 2. Partner stock from active pharmacies
        partner_rows = db.query(PartnerStock, PartnerPharmacy).join(
            PartnerPharmacy, PartnerPharmacy.partner_id == PartnerStock.partner_id
        ).filter(
            PartnerStock.medicine_id == med.medicine_id,
            PartnerPharmacy.status == "active"
        ).all()
        for p_stock, p_pharm in partner_rows:
            stock_sources.append(
                StockSourceResponse(
                    source_type="partner",
                    source_id=p_pharm.partner_id,
                    source_name=p_pharm.name,
                    quantity=p_stock.quantity,
                    price=float(p_stock.price)
                )
            )

        total_quantity = sum(s.quantity for s in stock_sources)
        in_stock = total_quantity > 0

        # 3. Generic equivalents
        mappings = db.query(GenericEquivalentMap).filter(
            or_(
                GenericEquivalentMap.medicine_id == med.medicine_id,
                GenericEquivalentMap.equivalent_medicine_id == med.medicine_id
            )
        ).all()

        equiv_ids = set()
        for m in mappings:
            if m.medicine_id != med.medicine_id:
                equiv_ids.add(m.medicine_id)
            if m.equivalent_medicine_id != med.medicine_id:
                equiv_ids.add(m.equivalent_medicine_id)

        generic_equivalents: List[GenericEquivalentResponse] = []
        if equiv_ids:
            equiv_meds = db.query(MedicineCatalogItem).filter(
                MedicineCatalogItem.medicine_id.in_(equiv_ids)
            ).all()
            generic_equivalents = [
                GenericEquivalentResponse(
                    medicine_id=em.medicine_id,
                    name=em.name,
                    generic_name=em.generic_name,
                    schedule=em.schedule
                )
                for em in equiv_meds
            ]

        return MedicineDetailResponse(
            medicine_id=med.medicine_id,
            standard_identifier=med.standard_identifier,
            name=med.name,
            generic_name=med.generic_name,
            schedule=med.schedule,
            in_stock=in_stock,
            total_quantity=total_quantity,
            stock_sources=stock_sources,
            generic_equivalents=generic_equivalents,
            created_at=med.created_at
        )

    @staticmethod
    def create_catalog_item(
        db: Session,
        standard_identifier: str,
        name: str,
        generic_name: Optional[str] = None,
        schedule: str = "otc"
    ) -> MedicineCatalogItem:
        """
        Creates a new medicine catalog item.
        """
        existing = db.query(MedicineCatalogItem).filter(
            MedicineCatalogItem.standard_identifier == standard_identifier
        ).first()

        if existing:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="DUPLICATE_IDENTIFIER: A medicine with this standard identifier already exists."
            )

        item = MedicineCatalogItem(
            medicine_id=uuid.uuid4(),
            standard_identifier=standard_identifier,
            name=name,
            generic_name=generic_name,
            schedule=schedule.lower(),
            created_at=datetime.now(timezone.utc)
        )
        db.add(item)
        db.commit()
        db.refresh(item)
        return item

    @staticmethod
    def add_owned_stock(
        db: Session,
        medicine_id: uuid.UUID,
        batch_number: str,
        expiry_date: date,
        quantity: int,
        price: Decimal
    ) -> OwnedInventoryStock:
        """
        Records warehouse stock for a catalog item.
        """
        med = db.query(MedicineCatalogItem).filter(
            MedicineCatalogItem.medicine_id == medicine_id
        ).first()

        if not med:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="MEDICINE_NOT_FOUND"
            )

        stock = OwnedInventoryStock(
            stock_id=uuid.uuid4(),
            medicine_id=medicine_id,
            batch_number=batch_number,
            expiry_date=expiry_date,
            quantity=quantity,
            price=price,
            updated_at=datetime.now(timezone.utc)
        )
        db.add(stock)
        db.commit()
        db.refresh(stock)
        return stock

    @staticmethod
    def register_partner_pharmacy(
        db: Session,
        name: str,
        address: Dict[str, Any],
        gstin: Optional[str] = None,
        fulfillment_radius_km: float = 15.0,
        catalog_feed_url: Optional[str] = None,
        status: str = "active"
    ) -> PartnerPharmacy:
        """
        Registers a partner pharmacy.
        """
        pharmacy = PartnerPharmacy(
            partner_id=uuid.uuid4(),
            name=name,
            address=address,
            gstin=gstin,
            fulfillment_radius_km=Decimal(str(fulfillment_radius_km)),
            catalog_feed_url=catalog_feed_url,
            status=status,
            created_at=datetime.now(timezone.utc)
        )
        db.add(pharmacy)
        db.commit()
        db.refresh(pharmacy)
        return pharmacy

    @staticmethod
    def update_partner_stock(
        db: Session,
        partner_id: uuid.UUID,
        medicine_id: uuid.UUID,
        quantity: int,
        price: Decimal
    ) -> PartnerStock:
        """
        Updates or creates partner pharmacy inventory stock feed.
        """
        stock = db.query(PartnerStock).filter(
            PartnerStock.partner_id == partner_id,
            PartnerStock.medicine_id == medicine_id
        ).first()

        if stock:
            stock.quantity = quantity
            stock.price = price
            stock.last_synced_at = datetime.now(timezone.utc)
        else:
            stock = PartnerStock(
                stock_id=uuid.uuid4(),
                partner_id=partner_id,
                medicine_id=medicine_id,
                quantity=quantity,
                price=price,
                last_synced_at=datetime.now(timezone.utc)
            )
            db.add(stock)

        db.commit()
        db.refresh(stock)
        return stock

    @staticmethod
    def create_generic_mapping(
        db: Session,
        medicine_id: uuid.UUID,
        equivalent_medicine_id: uuid.UUID
    ) -> GenericEquivalentMap:
        """
        Maps a generic alternative between two catalog medicines.
        """
        if medicine_id == equivalent_medicine_id:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="INVALID_MAPPING: Cannot map a medicine to itself."
            )

        existing = db.query(GenericEquivalentMap).filter(
            or_(
                (GenericEquivalentMap.medicine_id == medicine_id) & (GenericEquivalentMap.equivalent_medicine_id == equivalent_medicine_id),
                (GenericEquivalentMap.medicine_id == equivalent_medicine_id) & (GenericEquivalentMap.equivalent_medicine_id == medicine_id)
            )
        ).first()

        if existing:
            return existing

        mapping = GenericEquivalentMap(
            mapping_id=uuid.uuid4(),
            medicine_id=medicine_id,
            equivalent_medicine_id=equivalent_medicine_id,
            created_at=datetime.now(timezone.utc)
        )
        db.add(mapping)
        db.commit()
        db.refresh(mapping)
        return mapping

    @staticmethod
    def match_prescription(
        db: Session,
        prescription_id: uuid.UUID
    ) -> PrescriptionMatchResponse:
        """
        Matches extracted prescription fields against the medicine catalog (BRD FR-13 / TRD Item 15).
        """
        prescription = db.query(Prescription).filter(
            Prescription.prescription_id == prescription_id
        ).first()

        if not prescription:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="PRESCRIPTION_NOT_FOUND"
            )

        extracted_fields = db.query(ExtractedField).filter(
            ExtractedField.prescription_id == prescription_id,
            ExtractedField.field_name.in_(["medicine_name", "drug_name"])
        ).all()

        matches: List[MatchItem] = []

        all_medicines = db.query(MedicineCatalogItem).all()

        for field in extracted_fields:
            val_clean = field.value.strip().lower()

            matched_med = None
            match_type = "none"
            score = 0.0
            auto_addable = False

            # 1. Exact match on brand name
            for med in all_medicines:
                if med.name.strip().lower() == val_clean or val_clean.startswith(med.name.strip().lower()):
                    matched_med = med
                    match_type = "exact"
                    score = 0.98
                    auto_addable = True
                    break

            # 2. Generic name match
            if not matched_med:
                for med in all_medicines:
                    if med.generic_name and (med.generic_name.strip().lower() == val_clean or val_clean.startswith(med.generic_name.strip().lower())):
                        matched_med = med
                        match_type = "generic"
                        score = 0.90
                        auto_addable = True
                        break

            # 3. Fuzzy substring match
            if not matched_med:
                for med in all_medicines:
                    if med.name.strip().lower() in val_clean or (med.generic_name and med.generic_name.strip().lower() in val_clean):
                        matched_med = med
                        match_type = "fuzzy"
                        score = 0.70
                        auto_addable = False
                        break

            matches.append(
                MatchItem(
                    field_id=field.field_id,
                    field_name=field.field_name,
                    extracted_value=field.value,
                    medicine_id=matched_med.medicine_id if matched_med else None,
                    medicine_name=matched_med.name if matched_med else None,
                    match_type=match_type,
                    confidence_score=score,
                    auto_addable=auto_addable
                )
            )

        return PrescriptionMatchResponse(
            prescription_id=prescription_id,
            matches=matches
        )
