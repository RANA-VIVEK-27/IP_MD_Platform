"""
Pharmacy Staff Module Service
Complete business logic for pharmacy staff operations:
- Medicine catalog CRUD
- Inventory management
- Order management (list, accept, dispatch)
- Fulfillment management
- Dashboard aggregation
"""
import uuid
from datetime import datetime, timezone, date, timedelta
from decimal import Decimal
from typing import List, Optional, Tuple, Dict, Any
from fastapi import HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import or_, func, desc, and_

from app.models.catalog import (
    MedicineCatalogItem,
    OwnedInventoryStock,
    PartnerPharmacy,
    PartnerStock,
)
from app.models.orders import (
    Order,
    OrderLineItem,
    FulfillmentRecord,
    RoutingDecision,
)
from app.models.payments import PaymentIntent, PaymentCapture
from app.models.identity import User, PharmacyProfile


# Configuration
LOW_STOCK_THRESHOLD = 10
EXPIRING_SOON_DAYS = 30


class PharmacyService:
    # ──────────────────────────────────────────────────
    # Ownership Resolution
    # ──────────────────────────────────────────────────

    @staticmethod
    def get_pharmacy_profile(db: Session, user: User):
        """Resolve the pharmacy profile for an authenticated pharmacy user."""
        if user.role == 'partner_pharmacy':
            partner = db.query(PartnerPharmacy).filter(
                PartnerPharmacy.user_id == user.user_id
            ).first()
            if not partner:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail="PARTNER_PROFILE_NOT_FOUND: No partner pharmacy linked to this account"
                )
            return partner
        elif user.role in ('pharmacy_staff_owned', 'admin', 'super_admin'):
            profile = db.query(PharmacyProfile).filter(
                PharmacyProfile.user_id == user.user_id
            ).first()
            if not profile and user.role == 'pharmacy_staff_owned':
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail="PHARMACY_PROFILE_NOT_FOUND: No pharmacy profile linked to this account"
                )
            return profile
        else:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="FORBIDDEN: Not pharmacy staff"
            )

    # ──────────────────────────────────────────────────
    # Dashboard
    # ──────────────────────────────────────────────────

    @staticmethod
    def get_dashboard(db: Session, user: User) -> Dict[str, Any]:
        """
        Aggregated pharmacy dashboard with real database values.
        For partner_pharmacy: shows only THEIR stock and orders routed to them.
        For others: shows global owned pharmacy stats.
        """
        today = date.today()
        expiry_cutoff = today + timedelta(days=EXPIRING_SOON_DAYS)

        if user.role == 'partner_pharmacy':
            # Resolve partner
            partner = db.query(PartnerPharmacy).filter(
                PartnerPharmacy.user_id == user.user_id
            ).first()
            if not partner:
                return {"total_medicines": 0, "total_stock_units": 0, "low_stock_count": 0,
                        "expiring_soon_count": 0, "pending_orders": 0, "dispatched_orders": 0,
                        "delivered_orders": 0, "cancelled_orders": 0, "recent_orders": [], "inventory_summary": []}

            partner_id = partner.partner_id

            # Partner's medicines (distinct medicines in partner_stock)
            total_medicines = db.query(
                func.count(func.distinct(PartnerStock.medicine_id))
            ).filter(PartnerStock.partner_id == partner_id).scalar() or 0

            # Partner's total stock quantity
            total_stock = db.query(
                func.coalesce(func.sum(PartnerStock.quantity), 0)
            ).filter(PartnerStock.partner_id == partner_id).scalar() or 0

            # Low stock items (partner stock quantity <= threshold)
            low_stock_count = db.query(
                func.count(func.distinct(PartnerStock.medicine_id))
            ).filter(
                PartnerStock.partner_id == partner_id,
                PartnerStock.quantity <= LOW_STOCK_THRESHOLD,
                PartnerStock.quantity > 0
            ).scalar() or 0

            # Expiring soon — partner_stock doesn't have expiry, so 0
            expiring_soon_count = 0

            # Orders routed to this partner (via FulfillmentRecord with source_type='partner')
            partner_order_ids = db.query(
                OrderLineItem.order_id
            ).join(
                FulfillmentRecord, FulfillmentRecord.line_item_id == OrderLineItem.line_item_id
            ).filter(
                FulfillmentRecord.source_type == 'partner',
                FulfillmentRecord.source_id == partner_id
            ).distinct().subquery()

            order_counts = dict(
                db.query(Order.status, func.count(Order.order_id))
                .filter(Order.order_id.in_(partner_order_ids))
                .group_by(Order.status)
                .all()
            )

            pending_orders = order_counts.get('placed', 0) + order_counts.get('processing', 0)
            dispatched_orders = order_counts.get('dispatched', 0)
            delivered_orders = order_counts.get('delivered', 0)
            cancelled_orders = order_counts.get('cancelled', 0)

            # Recent orders routed to this partner (last 10)
            recent_orders_raw = db.query(Order).filter(
                Order.order_id.in_(partner_order_ids)
            ).order_by(desc(Order.created_at)).limit(10).all()
            recent_orders = []
            for o in recent_orders_raw:
                items = db.query(OrderLineItem).filter(OrderLineItem.order_id == o.order_id).all()
                total = sum(float(i.unit_price) * i.quantity for i in items)
                patient = db.query(User).filter(User.user_id == o.patient_id).first()
                recent_orders.append({
                    "order_id": str(o.order_id),
                    "patient_name": patient.full_name if patient else "Unknown",
                    "status": o.status,
                    "payment_status": o.payment_status,
                    "total_amount": round(total, 2),
                    "items_count": len(items),
                    "created_at": o.created_at.isoformat() if o.created_at else None,
                })

            # Inventory summary (partner's stock by medicine)
            inventory_summary_raw = db.query(
                MedicineCatalogItem.medicine_id,
                MedicineCatalogItem.name,
                func.sum(PartnerStock.quantity).label("total_qty"),
                func.count(PartnerStock.stock_id).label("batch_count")
            ).join(
                PartnerStock, MedicineCatalogItem.medicine_id == PartnerStock.medicine_id
            ).filter(
                PartnerStock.partner_id == partner_id
            ).group_by(
                MedicineCatalogItem.medicine_id, MedicineCatalogItem.name
            ).order_by(desc("total_qty")).limit(10).all()

            inventory_summary = [
                {
                    "medicine_id": str(r.medicine_id),
                    "name": r.name,
                    "total_quantity": int(r.total_qty),
                    "batch_count": r.batch_count,
                    "is_low": 0 < int(r.total_qty) <= LOW_STOCK_THRESHOLD,
                }
                for r in inventory_summary_raw
            ]

            return {
                "total_medicines": total_medicines,
                "total_stock_units": int(total_stock),
                "low_stock_count": low_stock_count,
                "expiring_soon_count": expiring_soon_count,
                "pending_orders": pending_orders,
                "dispatched_orders": dispatched_orders,
                "delivered_orders": delivered_orders,
                "cancelled_orders": cancelled_orders,
                "recent_orders": recent_orders,
                "inventory_summary": inventory_summary,
            }

        # Non-partner: global owned pharmacy stats (existing logic)
        total_medicines = db.query(func.count(MedicineCatalogItem.medicine_id)).scalar() or 0

        # Total stock quantity (owned)
        total_stock = db.query(
            func.coalesce(func.sum(OwnedInventoryStock.quantity), 0)
        ).scalar() or 0

        # Low stock items (owned stock quantity <= threshold)
        low_stock_count = db.query(
            func.count(func.distinct(OwnedInventoryStock.medicine_id))
        ).filter(
            OwnedInventoryStock.quantity <= LOW_STOCK_THRESHOLD,
            OwnedInventoryStock.quantity > 0
        ).scalar() or 0

        # Expiring soon (owned stock)
        expiring_soon_count = db.query(
            func.count(OwnedInventoryStock.stock_id)
        ).filter(
            OwnedInventoryStock.expiry_date <= expiry_cutoff,
            OwnedInventoryStock.expiry_date >= today,
            OwnedInventoryStock.quantity > 0
        ).scalar() or 0

        # Order counts by status
        order_counts = dict(
            db.query(Order.status, func.count(Order.order_id))
            .group_by(Order.status)
            .all()
        )

        pending_orders = order_counts.get('placed', 0) + order_counts.get('processing', 0)
        dispatched_orders = order_counts.get('dispatched', 0)
        delivered_orders = order_counts.get('delivered', 0)
        cancelled_orders = order_counts.get('cancelled', 0)

        # Recent orders (last 10)
        recent_orders_raw = db.query(Order).order_by(desc(Order.created_at)).limit(10).all()
        recent_orders = []
        for o in recent_orders_raw:
            items = db.query(OrderLineItem).filter(OrderLineItem.order_id == o.order_id).all()
            total = sum(float(i.unit_price) * i.quantity for i in items)
            patient = db.query(User).filter(User.user_id == o.patient_id).first()
            recent_orders.append({
                "order_id": str(o.order_id),
                "patient_name": patient.full_name if patient else "Unknown",
                "status": o.status,
                "payment_status": o.payment_status,
                "total_amount": round(total, 2),
                "items_count": len(items),
                "created_at": o.created_at.isoformat() if o.created_at else None,
            })

        # Inventory summary (top 10 medicines by stock)
        inventory_summary_raw = db.query(
            MedicineCatalogItem.medicine_id,
            MedicineCatalogItem.name,
            func.coalesce(func.sum(OwnedInventoryStock.quantity), 0).label("total_qty"),
            func.count(OwnedInventoryStock.stock_id).label("batch_count")
        ).outerjoin(
            OwnedInventoryStock,
            MedicineCatalogItem.medicine_id == OwnedInventoryStock.medicine_id
        ).group_by(
            MedicineCatalogItem.medicine_id, MedicineCatalogItem.name
        ).order_by(desc("total_qty")).limit(10).all()

        inventory_summary = [
            {
                "medicine_id": str(r.medicine_id),
                "name": r.name,
                "total_quantity": int(r.total_qty),
                "batch_count": r.batch_count,
                "is_low": 0 < int(r.total_qty) <= LOW_STOCK_THRESHOLD,
            }
            for r in inventory_summary_raw
        ]

        return {
            "total_medicines": total_medicines,
            "total_stock_units": int(total_stock),
            "low_stock_count": low_stock_count,
            "expiring_soon_count": expiring_soon_count,
            "pending_orders": pending_orders,
            "dispatched_orders": dispatched_orders,
            "delivered_orders": delivered_orders,
            "cancelled_orders": cancelled_orders,
            "recent_orders": recent_orders,
            "inventory_summary": inventory_summary,
        }

    # ──────────────────────────────────────────────────
    # Medicine Catalog CRUD
    # ──────────────────────────────────────────────────

    @staticmethod
    def list_medicines(
        db: Session,
        search: Optional[str] = None,
        schedule: Optional[str] = None,
        page: int = 1,
        page_size: int = 20,
        user: Optional[User] = None,
    ) -> Tuple[List[Dict[str, Any]], int]:
        """
        List medicines with search, filter, pagination.
        For partner_pharmacy: only shows medicines in THEIR partner_stock.
        Returns (items, total_count).
        """
        if user and user.role == 'partner_pharmacy':
            partner = db.query(PartnerPharmacy).filter(
                PartnerPharmacy.user_id == user.user_id
            ).first()
            if not partner:
                return [], 0

            # Only medicines this partner has stock for
            partner_medicine_ids = db.query(PartnerStock.medicine_id).filter(
                PartnerStock.partner_id == partner.partner_id,
                PartnerStock.quantity > 0
            ).subquery()

            query = db.query(MedicineCatalogItem).filter(
                MedicineCatalogItem.medicine_id.in_(partner_medicine_ids)
            )
        else:
            query = db.query(MedicineCatalogItem)

        if search and search.strip():
            term = f"%{search.strip()}%"
            query = query.filter(or_(
                MedicineCatalogItem.name.ilike(term),
                MedicineCatalogItem.generic_name.ilike(term),
                MedicineCatalogItem.standard_identifier.ilike(term),
            ))

        if schedule:
            query = query.filter(MedicineCatalogItem.schedule == schedule.lower())

        total = query.count()
        offset = (max(1, page) - 1) * page_size
        items = query.order_by(MedicineCatalogItem.name.asc()).offset(offset).limit(page_size).all()

        results = []
        for med in items:
            if user and user.role == 'partner_pharmacy':
                partner_stock_qty = db.query(
                    func.coalesce(func.sum(PartnerStock.quantity), 0)
                ).filter(
                    PartnerStock.medicine_id == med.medicine_id,
                    PartnerStock.partner_id == partner.partner_id
                ).scalar() or 0
                total_qty = int(partner_stock_qty)
            else:
                owned_qty = db.query(
                    func.coalesce(func.sum(OwnedInventoryStock.quantity), 0)
                ).filter(OwnedInventoryStock.medicine_id == med.medicine_id).scalar() or 0

                partner_qty = db.query(
                    func.coalesce(func.sum(PartnerStock.quantity), 0)
                ).filter(PartnerStock.medicine_id == med.medicine_id).scalar() or 0

                total_qty = int(owned_qty) + int(partner_qty)

            results.append({
                "medicine_id": str(med.medicine_id),
                "standard_identifier": med.standard_identifier,
                "name": med.name,
                "generic_name": med.generic_name,
                "schedule": med.schedule,
                "total_stock": total_qty,
                "in_stock": total_qty > 0,
                "created_at": med.created_at.isoformat() if med.created_at else None,
            })

        return results, total

    @staticmethod
    def get_medicine(db: Session, medicine_id: uuid.UUID) -> Dict[str, Any]:
        """Get single medicine detail."""
        med = db.query(MedicineCatalogItem).filter(
            MedicineCatalogItem.medicine_id == medicine_id
        ).first()
        if not med:
            raise HTTPException(status_code=404, detail="MEDICINE_NOT_FOUND")

        owned_qty = db.query(
            func.coalesce(func.sum(OwnedInventoryStock.quantity), 0)
        ).filter(OwnedInventoryStock.medicine_id == med.medicine_id).scalar() or 0

        return {
            "medicine_id": str(med.medicine_id),
            "standard_identifier": med.standard_identifier,
            "name": med.name,
            "generic_name": med.generic_name,
            "schedule": med.schedule,
            "total_stock": int(owned_qty),
            "created_at": med.created_at.isoformat() if med.created_at else None,
        }

    @staticmethod
    def create_medicine(
        db: Session,
        standard_identifier: str,
        name: str,
        generic_name: Optional[str] = None,
        schedule: str = "otc",
        manufacturer: Optional[str] = None,
        dosage_form: Optional[str] = None,
        strength: Optional[str] = None,
        pack_size: Optional[str] = None,
        description: Optional[str] = None,
        side_effects: Optional[str] = None,
        contraindications: Optional[str] = None,
        storage_conditions: Optional[str] = None,
        drug_interactions: Optional[str] = None,
    ) -> Dict[str, Any]:
        """Create a new medicine in the catalog."""
        valid_schedules = ('otc', 'h', 'h1', 'x')
        if schedule.lower() not in valid_schedules:
            raise HTTPException(status_code=422, detail=f"INVALID_SCHEDULE: Must be one of {valid_schedules}")

        existing = db.query(MedicineCatalogItem).filter(
            MedicineCatalogItem.standard_identifier == standard_identifier
        ).first()
        if existing:
            raise HTTPException(status_code=409, detail="DUPLICATE: A medicine with this standard_identifier already exists")

        item = MedicineCatalogItem(
            medicine_id=uuid.uuid4(),
            standard_identifier=standard_identifier,
            name=name,
            generic_name=generic_name,
            schedule=schedule.lower(),
            manufacturer=manufacturer,
            dosage_form=dosage_form,
            strength=strength,
            pack_size=pack_size,
            description=description,
            side_effects=side_effects,
            contraindications=contraindications,
            storage_conditions=storage_conditions,
            drug_interactions=drug_interactions,
            created_at=datetime.now(timezone.utc),
        )
        db.add(item)
        db.commit()
        db.refresh(item)

        return {
            "medicine_id": str(item.medicine_id),
            "standard_identifier": item.standard_identifier,
            "name": item.name,
            "generic_name": item.generic_name,
            "schedule": item.schedule,
            "manufacturer": item.manufacturer,
            "dosage_form": item.dosage_form,
            "strength": item.strength,
            "pack_size": item.pack_size,
            "description": item.description,
            "side_effects": item.side_effects,
            "contraindications": item.contraindications,
            "storage_conditions": item.storage_conditions,
            "drug_interactions": item.drug_interactions,
            "created_at": item.created_at.isoformat() if item.created_at else None,
        }

    @staticmethod
    def update_medicine(
        db: Session,
        medicine_id: uuid.UUID,
        name: Optional[str] = None,
        generic_name: Optional[str] = None,
        schedule: Optional[str] = None,
        manufacturer: Optional[str] = None,
        dosage_form: Optional[str] = None,
        strength: Optional[str] = None,
        pack_size: Optional[str] = None,
        description: Optional[str] = None,
        side_effects: Optional[str] = None,
        contraindications: Optional[str] = None,
        storage_conditions: Optional[str] = None,
        drug_interactions: Optional[str] = None,
    ) -> Dict[str, Any]:
        """Update an existing medicine."""
        med = db.query(MedicineCatalogItem).filter(
            MedicineCatalogItem.medicine_id == medicine_id
        ).first()
        if not med:
            raise HTTPException(status_code=404, detail="MEDICINE_NOT_FOUND")

        if schedule:
            valid_schedules = ('otc', 'h', 'h1', 'x')
            if schedule.lower() not in valid_schedules:
                raise HTTPException(status_code=422, detail=f"INVALID_SCHEDULE: Must be one of {valid_schedules}")
            med.schedule = schedule.lower()

        if name is not None: med.name = name
        if generic_name is not None: med.generic_name = generic_name
        if manufacturer is not None: med.manufacturer = manufacturer
        if dosage_form is not None: med.dosage_form = dosage_form
        if strength is not None: med.strength = strength
        if pack_size is not None: med.pack_size = pack_size
        if description is not None: med.description = description
        if side_effects is not None: med.side_effects = side_effects
        if contraindications is not None: med.contraindications = contraindications
        if storage_conditions is not None: med.storage_conditions = storage_conditions
        if drug_interactions is not None: med.drug_interactions = drug_interactions

        db.commit()
        db.refresh(med)

        return {
            "medicine_id": str(med.medicine_id),
            "standard_identifier": med.standard_identifier,
            "name": med.name,
            "generic_name": med.generic_name,
            "schedule": med.schedule,
            "manufacturer": med.manufacturer,
            "dosage_form": med.dosage_form,
            "strength": med.strength,
            "pack_size": med.pack_size,
            "description": med.description,
            "side_effects": med.side_effects,
            "contraindications": med.contraindications,
            "storage_conditions": med.storage_conditions,
            "drug_interactions": med.drug_interactions,
            "created_at": med.created_at.isoformat() if med.created_at else None,
        }

    @staticmethod
    def delete_medicine(db: Session, medicine_id: uuid.UUID) -> Dict[str, str]:
        """
        Delete a medicine. Checks for foreign key references first.
        """
        med = db.query(MedicineCatalogItem).filter(
            MedicineCatalogItem.medicine_id == medicine_id
        ).first()
        if not med:
            raise HTTPException(status_code=404, detail="MEDICINE_NOT_FOUND")

        # Check references
        has_stock = db.query(OwnedInventoryStock).filter(
            OwnedInventoryStock.medicine_id == medicine_id
        ).first()
        if has_stock:
            raise HTTPException(
                status_code=409,
                detail="CONFLICT: Cannot delete medicine with existing inventory stock. Remove stock first."
            )

        has_partner_stock = db.query(PartnerStock).filter(
            PartnerStock.medicine_id == medicine_id
        ).first()
        if has_partner_stock:
            raise HTTPException(
                status_code=409,
                detail="CONFLICT: Cannot delete medicine with partner stock entries."
            )

        has_order_items = db.query(OrderLineItem).filter(
            OrderLineItem.medicine_id == medicine_id
        ).first()
        if has_order_items:
            raise HTTPException(
                status_code=409,
                detail="CONFLICT: Cannot delete medicine referenced by order line items."
            )

        db.delete(med)
        db.commit()
        return {"message": "Medicine deleted successfully", "medicine_id": str(medicine_id)}

    # ──────────────────────────────────────────────────
    # Inventory Management
    # ──────────────────────────────────────────────────

    @staticmethod
    def list_stock(
        db: Session,
        medicine_id: Optional[uuid.UUID] = None,
        expiring_soon: bool = False,
        low_stock: bool = False,
        page: int = 1,
        page_size: int = 20,
        user: Optional[User] = None,
    ) -> Tuple[List[Dict[str, Any]], int]:
        """
        List inventory stock with optional filters.
        For partner_pharmacy: shows THEIR partner_stock.
        For others: shows owned inventory stock.
        """
        today = date.today()

        if user and user.role == 'partner_pharmacy':
            partner = db.query(PartnerPharmacy).filter(
                PartnerPharmacy.user_id == user.user_id
            ).first()
            if not partner:
                return [], 0

            query = db.query(PartnerStock).filter(PartnerStock.partner_id == partner.partner_id)

            if medicine_id:
                query = query.filter(PartnerStock.medicine_id == medicine_id)

            if low_stock:
                query = query.filter(
                    PartnerStock.quantity <= LOW_STOCK_THRESHOLD,
                    PartnerStock.quantity > 0,
                )

            total = query.count()
            offset = (max(1, page) - 1) * page_size
            items = query.offset(offset).limit(page_size).all()

            results = []
            for stock in items:
                med = db.query(MedicineCatalogItem).filter(
                    MedicineCatalogItem.medicine_id == stock.medicine_id
                ).first()
                results.append({
                    "stock_id": str(stock.stock_id),
                    "medicine_id": str(stock.medicine_id),
                    "medicine_name": med.name if med else "Unknown",
                    "batch_number": "N/A",
                    "expiry_date": None,
                    "quantity": stock.quantity,
                    "price": float(stock.price),
                    "is_expired": False,
                    "is_expiring_soon": False,
                    "is_low_stock": 0 < stock.quantity <= LOW_STOCK_THRESHOLD,
                    "updated_at": stock.last_synced_at.isoformat() if stock.last_synced_at else None,
                })

        else:
            query = db.query(OwnedInventoryStock)

            if medicine_id:
                query = query.filter(OwnedInventoryStock.medicine_id == medicine_id)

            if expiring_soon:
                thirty_days = today + timedelta(days=30)
                query = query.filter(
                    OwnedInventoryStock.expiry_date <= thirty_days,
                    OwnedInventoryStock.expiry_date >= today,
                )

            if low_stock:
                query = query.filter(
                    OwnedInventoryStock.quantity <= LOW_STOCK_THRESHOLD,
                    OwnedInventoryStock.quantity > 0,
                )

            total = query.count()
            offset = (max(1, page) - 1) * page_size
            items = query.offset(offset).limit(page_size).all()

            results = []
            for stock in items:
                med = db.query(MedicineCatalogItem).filter(
                    MedicineCatalogItem.medicine_id == stock.medicine_id
                ).first()
                is_expired = stock.expiry_date < today if stock.expiry_date else False
                is_expiring_soon = (
                    stock.expiry_date is not None
                    and not is_expired
                    and stock.expiry_date <= today + timedelta(days=30)
                )
                results.append({
                    "stock_id": str(stock.stock_id),
                    "medicine_id": str(stock.medicine_id),
                    "medicine_name": med.name if med else "Unknown",
                    "batch_number": stock.batch_number,
                    "expiry_date": stock.expiry_date.isoformat() if stock.expiry_date else None,
                    "quantity": stock.quantity,
                    "price": float(stock.price),
                    "is_expired": is_expired,
                    "is_expiring_soon": is_expiring_soon,
                    "is_low_stock": 0 < stock.quantity <= LOW_STOCK_THRESHOLD,
                    "updated_at": stock.updated_at.isoformat() if stock.updated_at else None,
                })

        return results, total

    @staticmethod
    def review_prescription(
        db: Session,
        user: User,
        prescription_id: uuid.UUID,
        action: str,
        notes: Optional[str] = None,
    ) -> Dict[str, Any]:
        """
        Pharmacist reviews a prescription: approve (verify) or reject.
        """
        from app.models.prescription_report import Prescription

        rx = db.query(Prescription).filter(Prescription.prescription_id == prescription_id).first()
        if not rx:
            raise HTTPException(status_code=404, detail="PRESCRIPTION_NOT_FOUND")

        if rx.verification_status not in ("pending_review", "doctor_verified"):
            raise HTTPException(
                status_code=422,
                detail=f"INVALID_STATUS: Prescription is '{rx.verification_status}', cannot review"
            )

        if action == "approve":
            rx.verification_status = "verified"
        else:
            rx.verification_status = "rejected"

        db.commit()
        db.refresh(rx)

        return {
            "prescription_id": str(rx.prescription_id),
            "verification_status": rx.verification_status,
            "reviewed_by": str(user.user_id),
            "reviewed_at": datetime.now(timezone.utc).isoformat(),
            "notes": notes,
        }

    @staticmethod
    def get_stock(db: Session, stock_id: uuid.UUID) -> Dict[str, Any]:
        """Get single stock entry."""
        stock = db.query(OwnedInventoryStock).filter(
            OwnedInventoryStock.stock_id == stock_id
        ).first()
        if not stock:
            raise HTTPException(status_code=404, detail="STOCK_NOT_FOUND")

        med = db.query(MedicineCatalogItem).filter(
            MedicineCatalogItem.medicine_id == stock.medicine_id
        ).first()
        today = date.today()

        return {
            "stock_id": str(stock.stock_id),
            "medicine_id": str(stock.medicine_id),
            "medicine_name": med.name if med else "Unknown",
            "batch_number": stock.batch_number,
            "expiry_date": stock.expiry_date.isoformat() if stock.expiry_date else None,
            "quantity": stock.quantity,
            "price": float(stock.price),
            "is_expired": stock.expiry_date < today if stock.expiry_date else False,
            "updated_at": stock.updated_at.isoformat() if stock.updated_at else None,
        }

    @staticmethod
    def create_stock(
        db: Session,
        medicine_id: uuid.UUID,
        batch_number: str,
        expiry_date: date,
        quantity: int,
        price: Decimal,
    ) -> Dict[str, Any]:
        """Create a new stock batch."""
        # Validate medicine exists
        med = db.query(MedicineCatalogItem).filter(
            MedicineCatalogItem.medicine_id == medicine_id
        ).first()
        if not med:
            raise HTTPException(status_code=404, detail="MEDICINE_NOT_FOUND")

        if quantity < 0:
            raise HTTPException(status_code=422, detail="QUANTITY_CANNOT_BE_NEGATIVE")
        if price < 0:
            raise HTTPException(status_code=422, detail="PRICE_CANNOT_BE_NEGATIVE")
        if expiry_date < date.today():
            raise HTTPException(status_code=422, detail="EXPIRY_DATE_CANNOT_BE_IN_PAST")

        stock = OwnedInventoryStock(
            stock_id=uuid.uuid4(),
            medicine_id=medicine_id,
            batch_number=batch_number,
            expiry_date=expiry_date,
            quantity=quantity,
            price=price,
            updated_at=datetime.now(timezone.utc),
        )
        db.add(stock)
        db.commit()
        db.refresh(stock)

        return {
            "stock_id": str(stock.stock_id),
            "medicine_id": str(stock.medicine_id),
            "medicine_name": med.name,
            "batch_number": stock.batch_number,
            "expiry_date": stock.expiry_date.isoformat() if stock.expiry_date else None,
            "quantity": stock.quantity,
            "price": float(stock.price),
            "updated_at": stock.updated_at.isoformat() if stock.updated_at else None,
        }

    @staticmethod
    def create_partner_stock(
        db: Session,
        user: User,
        medicine_id: uuid.UUID,
        quantity: int,
        price: Decimal,
    ) -> Dict[str, Any]:
        """Create or update partner pharmacy stock entry."""
        partner = db.query(PartnerPharmacy).filter(
            PartnerPharmacy.user_id == user.user_id
        ).first()
        if not partner:
            raise HTTPException(status_code=404, detail="PARTNER_NOT_FOUND")

        med = db.query(MedicineCatalogItem).filter(
            MedicineCatalogItem.medicine_id == medicine_id
        ).first()
        if not med:
            raise HTTPException(status_code=404, detail="MEDICINE_NOT_FOUND")

        if quantity < 0:
            raise HTTPException(status_code=422, detail="QUANTITY_CANNOT_BE_NEGATIVE")
        if price < 0:
            raise HTTPException(status_code=422, detail="PRICE_CANNOT_BE_NEGATIVE")

        # Upsert: if partner already has stock for this medicine, update it
        existing = db.query(PartnerStock).filter(
            PartnerStock.partner_id == partner.partner_id,
            PartnerStock.medicine_id == medicine_id,
        ).first()

        if existing:
            existing.quantity = quantity
            existing.price = price
            existing.last_synced_at = datetime.now(timezone.utc)
            db.commit()
            db.refresh(existing)
            stock = existing
        else:
            stock = PartnerStock(
                stock_id=uuid.uuid4(),
                partner_id=partner.partner_id,
                medicine_id=medicine_id,
                quantity=quantity,
                price=price,
                last_synced_at=datetime.now(timezone.utc),
            )
            db.add(stock)
            db.commit()
            db.refresh(stock)

        return {
            "stock_id": str(stock.stock_id),
            "medicine_id": str(stock.medicine_id),
            "medicine_name": med.name,
            "batch_number": "N/A",
            "expiry_date": None,
            "quantity": stock.quantity,
            "price": float(stock.price),
            "updated_at": stock.last_synced_at.isoformat() if stock.last_synced_at else None,
        }

    @staticmethod
    def update_stock(
        db: Session,
        stock_id: uuid.UUID,
        batch_number: Optional[str] = None,
        expiry_date: Optional[date] = None,
        quantity: Optional[int] = None,
        price: Optional[Decimal] = None,
    ) -> Dict[str, Any]:
        """Update an existing stock entry."""
        stock = db.query(OwnedInventoryStock).filter(
            OwnedInventoryStock.stock_id == stock_id
        ).first()
        if not stock:
            raise HTTPException(status_code=404, detail="STOCK_NOT_FOUND")

        if quantity is not None and quantity < 0:
            raise HTTPException(status_code=422, detail="QUANTITY_CANNOT_BE_NEGATIVE")
        if price is not None and price < 0:
            raise HTTPException(status_code=422, detail="PRICE_CANNOT_BE_NEGATIVE")

        if batch_number is not None:
            stock.batch_number = batch_number
        if expiry_date is not None:
            stock.expiry_date = expiry_date
        if quantity is not None:
            stock.quantity = quantity
        if price is not None:
            stock.price = price

        stock.updated_at = datetime.now(timezone.utc)
        db.commit()
        db.refresh(stock)

        med = db.query(MedicineCatalogItem).filter(
            MedicineCatalogItem.medicine_id == stock.medicine_id
        ).first()

        return {
            "stock_id": str(stock.stock_id),
            "medicine_id": str(stock.medicine_id),
            "medicine_name": med.name if med else "Unknown",
            "batch_number": stock.batch_number,
            "expiry_date": stock.expiry_date.isoformat() if stock.expiry_date else None,
            "quantity": stock.quantity,
            "price": float(stock.price),
            "updated_at": stock.updated_at.isoformat() if stock.updated_at else None,
        }

    @staticmethod
    def delete_stock(db: Session, stock_id: uuid.UUID) -> Dict[str, str]:
        """Delete a stock entry."""
        stock = db.query(OwnedInventoryStock).filter(
            OwnedInventoryStock.stock_id == stock_id
        ).first()
        if not stock:
            raise HTTPException(status_code=404, detail="STOCK_NOT_FOUND")

        db.delete(stock)
        db.commit()
        return {"message": "Stock deleted successfully", "stock_id": str(stock_id)}

    # ──────────────────────────────────────────────────
    # Order Management (pharmacy staff view)
    # ──────────────────────────────────────────────────

    @staticmethod
    def list_pharmacy_orders(
        db: Session,
        user: User,
        status_filter: Optional[str] = None,
        page: int = 1,
        page_size: int = 20,
    ) -> Tuple[List[Dict[str, Any]], int]:
        """
        List orders relevant to the pharmacy staff.
        - pharmacy_staff_owned: shows orders with fulfillments using owned stock.
        - partner_pharmacy: shows ALL orders (marketplace model) + orders routed to them.
        """
        if user.role == 'partner_pharmacy':
            # Partner pharmacy sees only orders routed to them via FulfillmentRecord
            partner = db.query(PartnerPharmacy).filter(
                PartnerPharmacy.user_id == user.user_id
            ).first()
            if not partner:
                return [], 0

            partner_order_ids = db.query(
                OrderLineItem.order_id
            ).join(
                FulfillmentRecord, FulfillmentRecord.line_item_id == OrderLineItem.line_item_id
            ).filter(
                FulfillmentRecord.source_type == 'partner',
                FulfillmentRecord.source_id == partner.partner_id
            ).distinct().subquery()

            query = db.query(Order).filter(Order.order_id.in_(partner_order_ids))
        else:
            # Owned pharmacy staff sees only orders with owned stock fulfillments
            fulfillment_subquery = db.query(
                FulfillmentRecord.line_item_id
            ).filter(
                FulfillmentRecord.source_type == 'owned'
            ).subquery()

            order_ids_subquery = db.query(
                OrderLineItem.order_id
            ).filter(
                OrderLineItem.line_item_id.in_(fulfillment_subquery)
            ).distinct().subquery()

            query = db.query(Order).filter(Order.order_id.in_(order_ids_subquery))

        if status_filter:
            query = query.filter(Order.status == status_filter)

        total = query.count()
        offset = (max(1, page) - 1) * page_size
        orders = query.order_by(desc(Order.created_at)).offset(offset).limit(page_size).all()

        results = []
        for o in orders:
            items = db.query(OrderLineItem).filter(OrderLineItem.order_id == o.order_id).all()
            total_amount = sum(float(i.unit_price) * i.quantity for i in items)
            patient = db.query(User).filter(User.user_id == o.patient_id).first()

            # Get fulfillment statuses for this order
            fulfillments = db.query(FulfillmentRecord).join(
                OrderLineItem, FulfillmentRecord.line_item_id == OrderLineItem.line_item_id
            ).filter(OrderLineItem.order_id == o.order_id).all()

            fulfillment_statuses = [f.status for f in fulfillments]

            # Resolve delivery address
            from app.models.identity import SavedAddress
            addr = db.query(SavedAddress).filter(SavedAddress.address_id == o.delivery_address_id).first()
            delivery_address = None
            if addr:
                delivery_address = {
                    "line1": addr.line1,
                    "line2": addr.line2,
                    "city": addr.city,
                    "state": addr.state,
                    "pincode": addr.pincode,
                    "full": f"{addr.line1}, {addr.line2 or ''}, {addr.city}, {addr.state} - {addr.pincode}".replace(', ,', ',').strip(', ')
                }

            results.append({
                "order_id": str(o.order_id),
                "patient_id": str(o.patient_id),
                "patient_name": patient.full_name if patient else "Unknown",
                "status": o.status,
                "payment_status": o.payment_status,
                "total_amount": round(total_amount, 2),
                "items_count": len(items),
                "fulfillment_statuses": fulfillment_statuses,
                "delivery_address": delivery_address,
                "created_at": o.created_at.isoformat() if o.created_at else None,
            })

        return results, total

    @staticmethod
    def get_pharmacy_order_detail(db: Session, order_id: uuid.UUID) -> Dict[str, Any]:
        """Get order detail for pharmacy staff."""
        order = db.query(Order).filter(Order.order_id == order_id).first()
        if not order:
            raise HTTPException(status_code=404, detail="ORDER_NOT_FOUND")

        line_items = db.query(OrderLineItem).filter(
            OrderLineItem.order_id == order.order_id
        ).all()

        fulfillments = db.query(FulfillmentRecord).join(
            OrderLineItem, FulfillmentRecord.line_item_id == OrderLineItem.line_item_id
        ).filter(OrderLineItem.order_id == order.order_id).all()

        patient = db.query(User).filter(User.user_id == order.patient_id).first()

        items_data = []
        total = 0.0
        for li in line_items:
            med = db.query(MedicineCatalogItem).filter(
                MedicineCatalogItem.medicine_id == li.medicine_id
            ).first()
            frec = next((f for f in fulfillments if f.line_item_id == li.line_item_id), None)
            tot = float(li.unit_price) * li.quantity
            total += tot

            items_data.append({
                "line_item_id": str(li.line_item_id),
                "medicine_id": str(li.medicine_id),
                "medicine_name": med.name if med else "Unknown",
                "quantity": li.quantity,
                "unit_price": float(li.unit_price),
                "total_price": round(tot, 2),
                "status": li.status,
                "fulfillment": {
                    "fulfillment_record_id": str(frec.fulfillment_record_id) if frec else None,
                    "source_type": frec.source_type if frec else None,
                    "status": frec.status if frec else None,
                    "dispatched_at": frec.dispatched_at.isoformat() if frec and frec.dispatched_at else None,
                } if frec else None,
            })

        return {
            "order_id": str(order.order_id),
            "patient_id": str(order.patient_id),
            "patient_name": patient.full_name if patient else "Unknown",
            "status": order.status,
            "payment_status": order.payment_status,
            "total_amount": round(total, 2),
            "items": items_data,
            "created_at": order.created_at.isoformat() if order.created_at else None,
        }

    @staticmethod
    def accept_order(db: Session, order_id: uuid.UUID, user: User) -> Dict[str, Any]:
        """
        Accept/confirm an order. Transitions: placed -> processing.
        """
        order = db.query(Order).filter(Order.order_id == order_id).first()
        if not order:
            raise HTTPException(status_code=404, detail="ORDER_NOT_FOUND")

        if order.status != 'placed':
            raise HTTPException(
                status_code=409,
                detail=f"CONFLICT: Order is already '{order.status}', cannot accept"
            )

        order.status = 'processing'

        # Update line items to confirmed
        line_items = db.query(OrderLineItem).filter(
            OrderLineItem.order_id == order.order_id
        ).all()
        for li in line_items:
            li.status = 'confirmed'

        db.commit()
        db.refresh(order)

        return {
            "order_id": str(order.order_id),
            "status": order.status,
            "message": "Order accepted and processing",
        }

    @staticmethod
    def dispatch_order(db: Session, order_id: uuid.UUID, user: User) -> Dict[str, Any]:
        """
        Dispatch an order. Transitions: processing -> dispatched.
        Decrements inventory stock atomically.
        """
        order = db.query(Order).filter(Order.order_id == order_id).first()
        if not order:
            raise HTTPException(status_code=404, detail="ORDER_NOT_FOUND")

        if order.status not in ('placed', 'processing'):
            raise HTTPException(
                status_code=409,
                detail=f"CONFLICT: Order is '{order.status}', cannot dispatch. Must be 'placed' or 'processing'."
            )

        # Get all fulfillments for this order
        fulfillments = db.query(FulfillmentRecord).join(
            OrderLineItem, FulfillmentRecord.line_item_id == OrderLineItem.line_item_id
        ).filter(OrderLineItem.order_id == order.order_id).all()

        line_items = db.query(OrderLineItem).filter(
            OrderLineItem.order_id == order.order_id
        ).all()

        # Decrement stock for owned fulfillments
        now = datetime.now(timezone.utc)
        for fr in fulfillments:
            if fr.source_type == 'owned':
                stock = db.query(OwnedInventoryStock).filter(
                    OwnedInventoryStock.stock_id == fr.source_id
                ).with_for_update().first()

                if not stock:
                    raise HTTPException(
                        status_code=400,
                        detail=f"STOCK_NOT_FOUND: Stock {fr.source_id} no longer exists"
                    )

                li = next((l for l in line_items if l.line_item_id == fr.line_item_id), None)
                if li and stock.quantity < li.quantity:
                    raise HTTPException(
                        status_code=400,
                        detail=f"INSUFFICIENT_STOCK: Only {stock.quantity} units available for batch {stock.batch_number}"
                    )

                if li:
                    stock.quantity -= li.quantity
                    stock.updated_at = now

            # Update fulfillment status
            fr.status = 'dispatched'
            fr.dispatched_at = now

        # Update line items
        for li in line_items:
            li.status = 'dispatched'

        # Update order status
        order.status = 'dispatched'

        db.commit()
        db.refresh(order)

        return {
            "order_id": str(order.order_id),
            "status": order.status,
            "message": "Order dispatched successfully",
        }

    # ──────────────────────────────────────────────────
    # Fulfillment Management
    # ──────────────────────────────────────────────────

    @staticmethod
    def collect_payment(db: Session, order_id: uuid.UUID, user: User) -> Dict[str, Any]:
        """
        Mark payment as collected (COD / offline payment).
        Creates PaymentIntent + PaymentCapture, updates order.payment_status.
        """
        order = db.query(Order).filter(Order.order_id == order_id).first()
        if not order:
            raise HTTPException(status_code=404, detail="ORDER_NOT_FOUND")

        if order.payment_status == 'captured':
            raise HTTPException(status_code=409, detail="PAYMENT_ALREADY_CAPTURED")

        if order.payment_status == 'refunded':
            raise HTTPException(status_code=409, detail="ORDER_ALREADY_REFUNDED")

        now = datetime.now(timezone.utc)

        # Calculate total in paise
        line_items = db.query(OrderLineItem).filter(
            OrderLineItem.order_id == order.order_id
        ).all()
        total_paise = sum(int(li.unit_price * 100) * li.quantity for li in line_items)

        # Create PaymentIntent (offline, no Razorpay IDs)
        intent = PaymentIntent(
            order_id=order.order_id,
            razorpay_order_id=f"OFFLINE_{order.order_id.hex[:16]}",
            amount_paise=total_paise,
            status='captured',
            idempotency_key=f"offline_{order.order_id}_{now.isoformat()}",
            created_at=now,
        )
        db.add(intent)
        db.flush()

        # Create PaymentCapture record
        capture = PaymentCapture(
            payment_intent_id=intent.payment_intent_id,
            razorpay_payment_id=f"OFFLINE_{now.strftime('%Y%m%d%H%M%S')}",
            razorpay_signature="offline_collection",
            status='captured',
            captured_at=now,
        )
        db.add(capture)

        # Update order
        order.payment_status = 'captured'

        db.commit()
        db.refresh(order)

        return {
            "order_id": str(order.order_id),
            "payment_status": order.payment_status,
            "message": "Payment marked as collected",
        }

    @staticmethod
    def list_fulfillments(
        db: Session,
        user: Optional[User] = None,
        status_filter: Optional[str] = None,
        page: int = 1,
        page_size: int = 20,
    ) -> Tuple[List[Dict[str, Any]], int]:
        """List fulfillment records relevant to the pharmacy staff role."""
        query = db.query(FulfillmentRecord)
        if user and user.role == 'partner_pharmacy':
            partner = db.query(PartnerPharmacy).filter(
                PartnerPharmacy.user_id == user.user_id
            ).first()
            if partner:
                query = query.filter(
                    FulfillmentRecord.source_type == 'partner',
                    FulfillmentRecord.source_id == partner.partner_id
                )
            else:
                return [], 0
        else:
            # Owned pharmacy staff sees owned fulfillments
            query = query.filter(FulfillmentRecord.source_type == 'owned')

        if status_filter:
            query = query.filter(FulfillmentRecord.status == status_filter)

        total = query.count()
        offset = (max(1, page) - 1) * page_size
        records = query.order_by(desc(FulfillmentRecord.dispatched_at).nullsfirst()).offset(offset).limit(page_size).all()

        results = []
        for fr in records:
            li = db.query(OrderLineItem).filter(
                OrderLineItem.line_item_id == fr.line_item_id
            ).first()
            order = db.query(Order).filter(Order.order_id == li.order_id).first() if li else None
            med = db.query(MedicineCatalogItem).filter(
                MedicineCatalogItem.medicine_id == li.medicine_id
            ).first() if li else None

            results.append({
                "fulfillment_record_id": str(fr.fulfillment_record_id),
                "line_item_id": str(fr.line_item_id),
                "order_id": str(order.order_id) if order else None,
                "medicine_name": med.name if med else "Unknown",
                "quantity": li.quantity if li else 0,
                "source_type": fr.source_type,
                "status": fr.status,
                "dispatched_at": fr.dispatched_at.isoformat() if fr.dispatched_at else None,
                "delivered_at": fr.delivered_at.isoformat() if fr.delivered_at else None,
            })

        return results, total

    @staticmethod
    def update_fulfillment_status(
        db: Session,
        fulfillment_id: uuid.UUID,
        new_status: str,
    ) -> Dict[str, Any]:
        """
        Update fulfillment status: assigned -> dispatched -> delivered.
        """
        fr = db.query(FulfillmentRecord).filter(
            FulfillmentRecord.fulfillment_record_id == fulfillment_id
        ).first()
        if not fr:
            raise HTTPException(status_code=404, detail="FULFILLMENT_NOT_FOUND")

        valid_transitions = {
            'assigned': ['dispatched'],
            'dispatched': ['delivered'],
        }

        allowed = valid_transitions.get(fr.status, [])
        if new_status not in allowed:
            raise HTTPException(
                status_code=409,
                detail=f"CONFLICT: Cannot transition from '{fr.status}' to '{new_status}'. Allowed: {allowed}"
            )

        now = datetime.now(timezone.utc)
        fr.status = new_status
        if new_status == 'dispatched':
            fr.dispatched_at = now
        elif new_status == 'delivered':
            fr.delivered_at = now

        # If all fulfillments for an order are delivered, mark order as delivered
        li = db.query(OrderLineItem).filter(
            OrderLineItem.line_item_id == fr.line_item_id
        ).first()
        if li:
            order = db.query(Order).filter(Order.order_id == li.order_id).first()
            if order and order.status == 'dispatched':
                all_f = db.query(FulfillmentRecord).join(
                    OrderLineItem, FulfillmentRecord.line_item_id == OrderLineItem.line_item_id
                ).filter(OrderLineItem.order_id == order.order_id).all()
                if all(f.status == 'delivered' for f in all_f):
                    order.status = 'delivered'
                    # Also update all line items
                    db.query(OrderLineItem).filter(
                        OrderLineItem.order_id == order.order_id
                    ).update({"status": "delivered"})

        db.commit()
        db.refresh(fr)

        return {
            "fulfillment_record_id": str(fr.fulfillment_record_id),
            "status": fr.status,
            "dispatched_at": fr.dispatched_at.isoformat() if fr.dispatched_at else None,
            "delivered_at": fr.delivered_at.isoformat() if fr.delivered_at else None,
            "message": f"Fulfillment updated to '{new_status}'",
        }

    # ──────────────────────────────────────────────────
    # Pharmacist-specific endpoints
    # ──────────────────────────────────────────────────

    @staticmethod
    def get_pharmacist_dashboard(db: Session, user: User) -> Dict[str, Any]:
        """
        Pharmacist dashboard: prescription verification queue stats.
        Shows all prescriptions in the review pipeline.
        """
        from app.models.prescription_report import Prescription

        base_query = db.query(Prescription).filter(
            Prescription.verification_status.in_(["pending_review", "doctor_verified", "verified", "rejected"])
        )

        total_prescriptions = base_query.count() or 0

        pending_review = base_query.filter(
            Prescription.verification_status == 'pending_review'
        ).count() or 0

        doctor_verified = base_query.filter(
            Prescription.verification_status == 'doctor_verified'
        ).count() or 0

        verified = base_query.filter(
            Prescription.verification_status == 'verified'
        ).count() or 0

        rejected = base_query.filter(
            Prescription.verification_status == 'rejected'
        ).count() or 0

        # Recent prescriptions (last 10)
        recent_raw = base_query.order_by(desc(Prescription.created_at)).limit(10).all()
        recent = []
        for rx in recent_raw:
            patient = db.query(User).filter(User.user_id == rx.patient_id).first()
            recent.append({
                "prescription_id": str(rx.prescription_id),
                "patient_name": patient.full_name if patient else "Unknown",
                "extraction_status": rx.extraction_status,
                "verification_status": rx.verification_status,
                "created_at": rx.created_at.isoformat() if rx.created_at else None,
            })

        return {
            "total_prescriptions": total_prescriptions,
            "pending_review": pending_review,
            "doctor_verified": doctor_verified,
            "verified": verified,
            "rejected": rejected,
            "recent_prescriptions": recent,
        }

    @staticmethod
    def list_pharmacist_prescriptions(
        db: Session,
        user: User,
        status_filter: Optional[str] = None,
        page: int = 1,
        page_size: int = 20,
    ) -> Tuple[List[Dict[str, Any]], int]:
        """
        List prescriptions for pharmacist review — all doctor_verified or pending_review prescriptions.
        """
        from app.models.prescription_report import Prescription

        query = db.query(Prescription).filter(
            Prescription.verification_status.in_(["doctor_verified", "pending_review", "verified", "rejected"])
        )

        if status_filter:
            query = query.filter(Prescription.verification_status == status_filter)

        total = query.count()
        offset = (max(1, page) - 1) * page_size
        items = query.order_by(desc(Prescription.created_at)).offset(offset).limit(page_size).all()

        results = []
        for rx in items:
            patient = db.query(User).filter(User.user_id == rx.patient_id).first()
            doctor = db.query(User).filter(User.user_id == rx.doctor_id).first() if rx.doctor_id else None
            results.append({
                "prescription_id": str(rx.prescription_id),
                "patient_id": str(rx.patient_id),
                "patient_name": patient.full_name if patient else "Unknown",
                "doctor_name": doctor.full_name if doctor else "Unassigned",
                "extraction_status": rx.extraction_status,
                "verification_status": rx.verification_status,
                "created_at": rx.created_at.isoformat() if rx.created_at else None,
            })

        return results, total
