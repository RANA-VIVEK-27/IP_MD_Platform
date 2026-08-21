import uuid
from datetime import datetime, timezone, date
from typing import Optional, List, Tuple
from fastapi import HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import desc

from app.models.orders import (
    Cart,
    CartItem,
    Order,
    OrderLineItem,
    FulfillmentRecord,
    RoutingDecision,
    OrderDispute,
)
from app.models.catalog import (
    MedicineCatalogItem,
    OwnedInventoryStock,
    PartnerPharmacy,
    PartnerStock,
)
from app.models.prescription_report import Prescription
from app.models.identity import User, SavedAddress
from app.models.audit import AuditLogEntry
from app.schemas.orders import (
    CartItemDetail,
    CartDetailResponse,
    OrderSummary,
    OrderDetailResponse,
    OrderLineItemResponse,
    FulfillmentRecordResponse,
    RoutingDecisionResponse,
)


class OrderService:

    @staticmethod
    def create_cart(db: Session, patient_id: uuid.UUID) -> Cart:
        """
        Creates a new active cart for the patient (BRD FR-12, FR-14).
        """
        cart = Cart(
            patient_id=patient_id,
            status='active',
            created_at=datetime.now(timezone.utc)
        )
        db.add(cart)
        db.commit()
        db.refresh(cart)
        return cart

    @staticmethod
    def add_item_to_cart(
        db: Session,
        patient_id: uuid.UUID,
        cart_id: uuid.UUID,
        medicine_id: uuid.UUID,
        quantity: int,
        prescription_id: Optional[uuid.UUID] = None
    ) -> Tuple[CartItem, bool]:
        """
        Adds or updates a line item in the cart.
        Enforces prescription verification check for Schedule H/H1/X items (BRD FR-14, FR-15 / TRD Item 17).
        """
        cart = db.query(Cart).filter(Cart.cart_id == cart_id).first()
        if not cart:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="CART_NOT_FOUND"
            )
        if cart.patient_id != patient_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="FORBIDDEN: You do not own this cart"
            )
        if cart.status != 'active':
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="CART_NOT_ACTIVE"
            )

        medicine = db.query(MedicineCatalogItem).filter(
            MedicineCatalogItem.medicine_id == medicine_id
        ).first()
        if not medicine:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="MEDICINE_NOT_FOUND"
            )

        checkout_blocked = False
        # Check regulatory compliance
        if medicine.schedule in ('h', 'h1', 'x'):
            if not prescription_id:
                checkout_blocked = True
            else:
                prescription = db.query(Prescription).filter(
                    Prescription.prescription_id == prescription_id,
                    Prescription.patient_id == patient_id
                ).first()
                if not prescription or prescription.verification_status != 'doctor_verified':
                    checkout_blocked = True
                else:
                    checkout_blocked = False

        # Check existing item
        existing_item = db.query(CartItem).filter(
            CartItem.cart_id == cart_id,
            CartItem.medicine_id == medicine_id
        ).first()

        if existing_item:
            existing_item.quantity = quantity
            existing_item.prescription_id = prescription_id
            existing_item.checkout_blocked = checkout_blocked
            db.commit()
            db.refresh(existing_item)
            return existing_item, checkout_blocked
        else:
            new_item = CartItem(
                cart_id=cart_id,
                medicine_id=medicine_id,
                quantity=quantity,
                prescription_id=prescription_id,
                checkout_blocked=checkout_blocked
            )
            db.add(new_item)
            db.commit()
            db.refresh(new_item)
            return new_item, checkout_blocked

    @staticmethod
    def get_cart(db: Session, patient_id: uuid.UUID, cart_id: uuid.UUID, user_role: str = "patient") -> CartDetailResponse:
        """
        Retrieves cart items, recalculates compliance blocks and subtotal (BRD FR-14).
        """
        cart = db.query(Cart).filter(Cart.cart_id == cart_id).first()
        if not cart:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="CART_NOT_FOUND"
            )
        if user_role == "patient" and cart.patient_id != patient_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="FORBIDDEN: You do not own this cart"
            )

        cart_items = db.query(CartItem).filter(CartItem.cart_id == cart_id).all()

        item_details: List[CartItemDetail] = []
        subtotal = 0.0
        has_blocked_items = False

        for item in cart_items:
            medicine = db.query(MedicineCatalogItem).filter(
                MedicineCatalogItem.medicine_id == item.medicine_id
            ).first()

            # Dynamic compliance verification re-check
            if medicine and medicine.schedule in ('h', 'h1', 'x'):
                if not item.prescription_id:
                    item.checkout_blocked = True
                else:
                    prescription = db.query(Prescription).filter(
                        Prescription.prescription_id == item.prescription_id,
                        Prescription.patient_id == cart.patient_id
                    ).first()
                    if not prescription or prescription.verification_status != 'doctor_verified':
                        item.checkout_blocked = True
                    else:
                        item.checkout_blocked = False
            else:
                item.checkout_blocked = False

            if item.checkout_blocked:
                has_blocked_items = True

            # Determine best indicative price (owned inventory first, then partner)
            owned_stock = db.query(OwnedInventoryStock).filter(
                OwnedInventoryStock.medicine_id == item.medicine_id
            ).order_by(OwnedInventoryStock.price.asc()).first()

            if owned_stock:
                unit_price = float(owned_stock.price)
            else:
                partner_stock = db.query(PartnerStock).filter(
                    PartnerStock.medicine_id == item.medicine_id
                ).order_by(PartnerStock.price.asc()).first()
                unit_price = float(partner_stock.price) if partner_stock else 0.0

            line_price = round(unit_price * item.quantity, 2)
            subtotal += line_price

            item_details.append(
                CartItemDetail(
                    line_item_id=item.cart_item_id,
                    medicine_id=item.medicine_id,
                    medicine_name=medicine.name if medicine else "Unknown Item",
                    generic_name=medicine.generic_name if medicine else None,
                    schedule=medicine.schedule if medicine else "otc",
                    quantity=item.quantity,
                    unit_price=unit_price,
                    price=line_price,
                    prescription_id=item.prescription_id,
                    checkout_blocked=item.checkout_blocked
                )
            )

        db.commit()

        return CartDetailResponse(
            cart_id=cart.cart_id,
            patient_id=cart.patient_id,
            status=cart.status,
            items=item_details,
            subtotal=round(subtotal, 2),
            has_blocked_items=has_blocked_items
        )

    @staticmethod
    def checkout_order(
        db: Session,
        patient_id: uuid.UUID,
        cart_id: uuid.UUID,
        delivery_address_id: uuid.UUID,
        idempotency_key: str
    ) -> Tuple[Order, List[FulfillmentRecord], float]:
        """
        Converts active cart to order.
        Strict server-side enforcement:
        1. Schedule H/H1/X items must have doctor_verified prescription linkage.
        2. Order-routing engine automatically assigns owned vs partner fulfillment sources.
        3. Idempotency-Key prevents duplicate order creation.
        """
        if not idempotency_key or not idempotency_key.strip():
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="IDEMPOTENCY_KEY_REQUIRED"
            )

        # 1. Idempotency Check
        existing_order = db.query(Order).filter(
            Order.idempotency_key == idempotency_key
        ).first()
        if existing_order:
            if existing_order.patient_id != patient_id:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="FORBIDDEN: Idempotency key conflict"
                )
            fulfillments = db.query(FulfillmentRecord).join(
                OrderLineItem,
                FulfillmentRecord.line_item_id == OrderLineItem.line_item_id
            ).filter(OrderLineItem.order_id == existing_order.order_id).all()

            # Calculate total amount
            line_items = db.query(OrderLineItem).filter(
                OrderLineItem.order_id == existing_order.order_id
            ).all()
            total_amount = sum(float(item.unit_price) * item.quantity for item in line_items)
            return existing_order, fulfillments, round(total_amount, 2)

        # 2. Delivery Address Check
        address = db.query(SavedAddress).filter(
            SavedAddress.address_id == delivery_address_id,
            SavedAddress.user_id == patient_id
        ).first()
        if not address:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="ADDRESS_NOT_FOUND"
            )

        # 3. Cart Check
        cart = db.query(Cart).filter(
            Cart.cart_id == cart_id,
            Cart.patient_id == patient_id
        ).first()
        if not cart:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="CART_NOT_FOUND"
            )
        if cart.status != 'active':
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="CART_ALREADY_CONVERTED"
            )

        cart_items = db.query(CartItem).filter(CartItem.cart_id == cart_id).all()
        if not cart_items:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail="CART_EMPTY"
            )

        # 4. HARD REGULATORY COMPLIANCE GATE (TRD Items 5, 17, 34; BRD FR-14, FR-15)
        for item in cart_items:
            medicine = db.query(MedicineCatalogItem).filter(
                MedicineCatalogItem.medicine_id == item.medicine_id
            ).first()
            if not medicine:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail=f"MEDICINE_NOT_FOUND: Item {item.medicine_id} not found"
                )

            if medicine.schedule in ('h', 'h1', 'x'):
                if not item.prescription_id:
                    raise HTTPException(
                        status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                        detail=f"PRESCRIPTION_REQUIRED: Regulated medicine '{medicine.name}' requires a prescription"
                    )

                prescription = db.query(Prescription).filter(
                    Prescription.prescription_id == item.prescription_id,
                    Prescription.patient_id == patient_id
                ).first()

                if not prescription or prescription.verification_status != 'doctor_verified':
                    raise HTTPException(
                        status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                        detail=f"PRESCRIPTION_NOT_VERIFIED: Prescription for '{medicine.name}' is not verified by a doctor"
                    )

        # 5. ORDER ROUTING ENGINE
        # Routing decision logic:
        # Priority 1: Owned inventory stock if available with sufficient non-expired quantity.
        # Priority 2: Partner pharmacy stock from an active partner pharmacy (lowest price/best SLA).
        routing_plan = []
        today = date.today()

        for item in cart_items:
            # Check Owned Stock
            owned_stock = db.query(OwnedInventoryStock).filter(
                OwnedInventoryStock.medicine_id == item.medicine_id,
                OwnedInventoryStock.quantity >= item.quantity,
                OwnedInventoryStock.expiry_date >= today
            ).order_by(OwnedInventoryStock.expiry_date.asc()).first()

            if owned_stock:
                source_type = 'owned'
                source_id = owned_stock.stock_id
                unit_price = float(owned_stock.price)
                decision_basis = 'owned_inventory_primary'
            else:
                # Fallback to active Partner Pharmacy
                partner_stock = db.query(PartnerStock).join(
                    PartnerPharmacy,
                    PartnerStock.partner_id == PartnerPharmacy.partner_id
                ).filter(
                    PartnerStock.medicine_id == item.medicine_id,
                    PartnerStock.quantity >= item.quantity,
                    PartnerPharmacy.status == 'active'
                ).order_by(PartnerStock.price.asc()).first()

                if partner_stock:
                    source_type = 'partner'
                    source_id = partner_stock.partner_id
                    unit_price = float(partner_stock.price)
                    decision_basis = 'partner_fallback_lowest_price'
                else:
                    # Check if any stock exists to give accurate error
                    raise HTTPException(
                        status_code=status.HTTP_400_BAD_REQUEST,
                        detail=f"OUT_OF_STOCK: Insufficient stock available for medicine ID {item.medicine_id}"
                    )

            routing_plan.append({
                'item': item,
                'source_type': source_type,
                'source_id': source_id,
                'unit_price': unit_price,
                'decision_basis': decision_basis
            })

        # 6. Create Order and child records
        order = Order(
            patient_id=patient_id,
            cart_id=cart_id,
            delivery_address_id=delivery_address_id,
            status='placed',
            payment_status='pending',
            idempotency_key=idempotency_key,
            created_at=datetime.now(timezone.utc)
        )
        db.add(order)
        db.flush()

        fulfillments = []
        total_amount = 0.0

        for plan in routing_plan:
            c_item: CartItem = plan['item']
            line_item = OrderLineItem(
                order_id=order.order_id,
                medicine_id=c_item.medicine_id,
                prescription_id=c_item.prescription_id,
                quantity=c_item.quantity,
                unit_price=plan['unit_price'],
                status='pending'
            )
            db.add(line_item)
            db.flush()

            fulfillment = FulfillmentRecord(
                line_item_id=line_item.line_item_id,
                source_type=plan['source_type'],
                source_id=plan['source_id'],
                status='assigned'
            )
            db.add(fulfillment)
            fulfillments.append(fulfillment)

            decision = RoutingDecision(
                line_item_id=line_item.line_item_id,
                decision_basis=plan['decision_basis'],
                source_type=plan['source_type'],
                source_id=plan['source_id'],
                created_at=datetime.now(timezone.utc)
            )
            db.add(decision)

            total_amount += plan['unit_price'] * c_item.quantity

        # Mark cart as converted
        cart.status = 'converted'

        db.commit()
        db.refresh(order)
        for f in fulfillments:
            db.refresh(f)

        return order, fulfillments, round(total_amount, 2)

    @staticmethod
    def get_order_detail(db: Session, user: User, order_id: uuid.UUID) -> OrderDetailResponse:
        """
        Retrieves detailed order record with line items, routing, and fulfillments (BRD Section 3.1).
        """
        order = db.query(Order).filter(Order.order_id == order_id).first()
        if not order:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="ORDER_NOT_FOUND"
            )

        if user.role == 'patient' and order.patient_id != user.user_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="FORBIDDEN: You do not have access to this order"
            )

        line_items_db = db.query(OrderLineItem).filter(OrderLineItem.order_id == order.order_id).all()
        fulfillments_db = db.query(FulfillmentRecord).join(
            OrderLineItem, FulfillmentRecord.line_item_id == OrderLineItem.line_item_id
        ).filter(OrderLineItem.order_id == order.order_id).all()

        routing_decisions_db = db.query(RoutingDecision).join(
            OrderLineItem, RoutingDecision.line_item_id == OrderLineItem.line_item_id
        ).filter(OrderLineItem.order_id == order.order_id).all()

        line_items_response = []
        total_amount = 0.0

        for li in line_items_db:
            med = db.query(MedicineCatalogItem).filter(MedicineCatalogItem.medicine_id == li.medicine_id).first()
            frec = next((f for f in fulfillments_db if f.line_item_id == li.line_item_id), None)
            f_source = f"{frec.source_type}:{frec.source_id}" if frec else None
            tot = float(li.unit_price) * li.quantity
            total_amount += tot

            line_items_response.append(
                OrderLineItemResponse(
                    line_item_id=li.line_item_id,
                    medicine_id=li.medicine_id,
                    medicine_name=med.name if med else "Unknown Item",
                    prescription_id=li.prescription_id,
                    quantity=li.quantity,
                    unit_price=float(li.unit_price),
                    total_price=round(tot, 2),
                    status=li.status,
                    fulfillment_source=f_source
                )
            )

        return OrderDetailResponse(
            order_id=order.order_id,
            patient_id=order.patient_id,
            cart_id=order.cart_id,
            delivery_address_id=order.delivery_address_id,
            status=order.status,
            payment_status=order.payment_status,
            created_at=order.created_at,
            line_items=line_items_response,
            fulfillment_records=[
                FulfillmentRecordResponse.model_validate(f) for f in fulfillments_db
            ],
            routing_decisions=[
                RoutingDecisionResponse.model_validate(r) for r in routing_decisions_db
            ],
            total_amount=round(total_amount, 2)
        )

    @staticmethod
    def list_orders(
        db: Session,
        user: User,
        status_filter: Optional[str] = None,
        limit: int = 20,
        cursor: Optional[str] = None
    ) -> Tuple[List[OrderSummary], Optional[str]]:
        """
        Lists orders for patient or admin/staff queue with cursor pagination (BRD Section 3.1).
        """
        query = db.query(Order)

        if user.role == 'patient':
            query = query.filter(Order.patient_id == user.user_id)
        elif user.role == 'partner_pharmacy':
            query = query.join(OrderLineItem, Order.order_id == OrderLineItem.order_id)\
                         .join(FulfillmentRecord, OrderLineItem.line_item_id == FulfillmentRecord.line_item_id)\
                         .filter(FulfillmentRecord.source_id == user.user_id)

        if status_filter:
            query = query.filter(Order.status == status_filter)

        query = query.order_by(desc(Order.created_at))

        # Cursor pagination
        if cursor:
            try:
                cursor_dt = datetime.fromisoformat(cursor)
                query = query.filter(Order.created_at < cursor_dt)
            except ValueError:
                pass

        orders = query.limit(limit + 1).all()

        has_more = len(orders) > limit
        result_orders = orders[:limit]
        next_cursor = result_orders[-1].created_at.isoformat() if has_more and result_orders else None

        summaries = []
        for o in result_orders:
            items = db.query(OrderLineItem).filter(OrderLineItem.order_id == o.order_id).all()
            tot = sum(float(i.unit_price) * i.quantity for i in items)
            summaries.append(
                OrderSummary(
                    order_id=o.order_id,
                    patient_id=o.patient_id,
                    status=o.status,
                    payment_status=o.payment_status,
                    total_amount=round(tot, 2),
                    items_count=len(items),
                    created_at=o.created_at
                )
            )

        return summaries, next_cursor

    @staticmethod
    def cancel_order(db: Session, user: User, order_id: uuid.UUID, reason: Optional[str] = None) -> Order:
        """
        Cancels an order pre-dispatch (BRD FR-18).
        """
        order = db.query(Order).filter(Order.order_id == order_id).first()
        if not order:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="ORDER_NOT_FOUND"
            )

        if user.role == 'patient' and order.patient_id != user.user_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="FORBIDDEN: You do not have permission to cancel this order"
            )

        if order.status in ('dispatched', 'delivered'):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="ORDER_ALREADY_DISPATCHED: Cannot cancel order once dispatched or delivered"
            )

        order.status = 'cancelled'

        # Cancel all line items
        db.query(OrderLineItem).filter(
            OrderLineItem.order_id == order.order_id
        ).update({"status": "cancelled"})

        # If payment was captured, mark as refunded
        if order.payment_status == 'captured':
            order.payment_status = 'refunded'

        db.commit()
        db.refresh(order)
        return order

    @staticmethod
    def override_route(
        db: Session,
        admin_user: User,
        order_id: uuid.UUID,
        line_item_id: uuid.UUID,
        new_source_type: str,
        new_source_id: uuid.UUID,
        reason: str
    ) -> Tuple[uuid.UUID, str, uuid.UUID]:
        """
        Manually overrides routing decision for an order line item and creates audit log (BRD Section 4.1).
        """
        if not reason or len(reason.strip()) < 5:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="REASON_REQUIRED: A valid justification is mandatory for route overrides"
            )

        order = db.query(Order).filter(Order.order_id == order_id).first()
        if not order:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="ORDER_NOT_FOUND"
            )

        line_item = db.query(OrderLineItem).filter(
            OrderLineItem.line_item_id == line_item_id,
            OrderLineItem.order_id == order_id
        ).first()
        if not line_item:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="LINE_ITEM_NOT_FOUND"
            )

        # Update Fulfillment Record
        fulfillment = db.query(FulfillmentRecord).filter(
            FulfillmentRecord.line_item_id == line_item_id
        ).first()
        if fulfillment:
            fulfillment.source_type = new_source_type
            fulfillment.source_id = new_source_id
        else:
            fulfillment = FulfillmentRecord(
                line_item_id=line_item_id,
                source_type=new_source_type,
                source_id=new_source_id,
                status='assigned'
            )
            db.add(fulfillment)

        # Record manual routing decision
        routing_dec = RoutingDecision(
            line_item_id=line_item_id,
            decision_basis='admin_manual_override',
            source_type=new_source_type,
            source_id=new_source_id,
            overridden_by=admin_user.user_id,
            reason=reason,
            created_at=datetime.now(timezone.utc)
        )
        db.add(routing_dec)

        # Record Audit Log Entry
        audit = AuditLogEntry(
            actor_id=admin_user.user_id,
            actor_role=admin_user.role,
            action_type='ORDER_ROUTE_OVERRIDE',
            target_entity_type='order_line_item',
            target_entity_id=line_item_id,
            justification=reason,
            timestamp=datetime.now(timezone.utc)
        )
        db.add(audit)

        db.commit()
        db.refresh(audit)

        return line_item_id, f"{new_source_type}:{new_source_id}", audit.audit_log_id

    @staticmethod
    def flag_dispute(
        db: Session,
        user: User,
        order_id: uuid.UUID,
        dispute_type: str
    ) -> OrderDispute:
        """
        Flags an order for dispute resolution (BRD FR-20).
        """
        order = db.query(Order).filter(Order.order_id == order_id).first()
        if not order:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="ORDER_NOT_FOUND"
            )

        if user.role == 'patient' and order.patient_id != user.user_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="FORBIDDEN: You do not own this order"
            )

        dispute = OrderDispute(
            order_id=order_id,
            dispute_type=dispute_type,
            flagged_at=datetime.now(timezone.utc)
        )
        db.add(dispute)
        db.commit()
        db.refresh(dispute)
        return dispute

    @staticmethod
    def list_disputes(
        db: Session,
        limit: int = 20,
        cursor: Optional[str] = None
    ) -> Tuple[List[OrderDispute], Optional[str]]:
        """
        Lists disputes for Admin review (BRD FR-20).
        """
        query = db.query(OrderDispute).order_by(desc(OrderDispute.flagged_at))

        if cursor:
            try:
                cursor_dt = datetime.fromisoformat(cursor)
                query = query.filter(OrderDispute.flagged_at < cursor_dt)
            except ValueError:
                pass

        disputes = query.limit(limit + 1).all()
        has_more = len(disputes) > limit
        result = disputes[:limit]
        next_cursor = result[-1].flagged_at.isoformat() if has_more and result else None

        return result, next_cursor

    @staticmethod
    def resolve_dispute(
        db: Session,
        admin_user: User,
        dispute_id: uuid.UUID,
        resolution: str
    ) -> OrderDispute:
        """
        Resolves an order dispute and writes an audit log entry (BRD FR-20).
        """
        dispute = db.query(OrderDispute).filter(
            OrderDispute.dispute_id == dispute_id
        ).first()
        if not dispute:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="DISPUTE_NOT_FOUND"
            )

        dispute.resolved_by = admin_user.user_id
        dispute.resolved_at = datetime.now(timezone.utc)
        dispute.resolution = resolution

        # Record Audit Log Entry
        audit = AuditLogEntry(
            actor_id=admin_user.user_id,
            actor_role=admin_user.role,
            action_type='RESOLVE_ORDER_DISPUTE',
            target_entity_type='order_dispute',
            target_entity_id=dispute_id,
            justification=resolution,
            timestamp=datetime.now(timezone.utc)
        )
        db.add(audit)

        db.commit()
        db.refresh(dispute)
        return dispute
