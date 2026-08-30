import uuid
from typing import Optional, List
from fastapi import APIRouter, Depends, Header, HTTPException, Query, status
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.models.identity import User, SavedAddress
from app.models.orders import Cart, CartItem as CartItemModel
from app.api.deps import get_current_user, require_roles
from app.services.order_service import OrderService
from app.schemas.orders import (
    CartCreateResponse,
    CartItemAddRequest,
    CartItemResponse,
    CartDetailResponse,
    OrderCreateRequest,
    OrderCreateResponse,
    OrderDetailResponse,
    OrderListResponse,
    OrderCancelRequest,
    OrderCancelResponse,
    RouteOverrideRequest,
    RouteOverrideResponse,
    DisputeCreateRequest,
    DisputeResponse,
    FulfillmentRecordResponse,
)


# --- Saved Address Schemas ---

class SavedAddressCreateRequest(BaseModel):
    label: Optional[str] = Field(None, max_length=50)
    line1: str = Field(..., min_length=1, max_length=255)
    line2: Optional[str] = Field(None, max_length=255)
    city: str = Field(..., min_length=1, max_length=100)
    state: str = Field(..., min_length=1, max_length=100)
    pincode: str = Field(..., min_length=1, max_length=10)
    is_default: bool = False


class SavedAddressResponse(BaseModel):
    address_id: uuid.UUID
    label: Optional[str] = None
    line1: str
    line2: Optional[str] = None
    city: str
    state: str
    pincode: str
    is_default: bool

router = APIRouter(tags=["Orders & Fulfillment"])


# --- Cart Endpoints ---

@router.post(
    "/cart",
    response_model=CartCreateResponse,
    status_code=status.HTTP_201_CREATED
)
def create_cart(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles("patient"))
):
    """
    Creates a new shopping cart for the authenticated patient (BRD FR-12, FR-14).
    """
    cart = OrderService.create_cart(db, current_user.user_id)
    return cart


@router.post(
    "/cart/{cart_id}/items",
    response_model=CartItemResponse,
    status_code=status.HTTP_201_CREATED
)
def add_item_to_cart(
    cart_id: uuid.UUID,
    req: CartItemAddRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles("patient"))
):
    """
    Adds a line item to the cart (BRD FR-14, FR-15 / TRD Item 17).
    If the item's schedule is H/H1/X, a prescription_id with verification_status = doctor_verified
    must be attached, or the item is added in a blocked state (checkout_blocked = True).
    """
    item, checkout_blocked = OrderService.add_item_to_cart(
        db=db,
        patient_id=current_user.user_id,
        cart_id=cart_id,
        medicine_id=req.medicine_id,
        quantity=req.quantity,
        prescription_id=req.prescription_id
    )
    return CartItemResponse(
        cart_id=cart_id,
        line_item_id=item.cart_item_id,
        checkout_blocked=checkout_blocked
    )


class CartItemUpdateRequest(BaseModel):
    quantity: int = Field(..., ge=1)


@router.patch(
    "/cart/{cart_id}/items/{cart_item_id}",
)
def update_cart_item(
    cart_id: uuid.UUID,
    cart_item_id: uuid.UUID,
    req: CartItemUpdateRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles("patient"))
):
    """Update quantity of a cart item."""
    cart = db.query(Cart).filter(Cart.cart_id == cart_id).first()
    if not cart or cart.patient_id != current_user.user_id:
        raise HTTPException(status_code=404, detail="CART_NOT_FOUND")
    item = db.query(CartItemModel).filter(
        CartItemModel.cart_item_id == cart_item_id,
        CartItemModel.cart_id == cart_id,
    ).first()
    if not item:
        raise HTTPException(status_code=404, detail="CART_ITEM_NOT_FOUND")
    item.quantity = req.quantity
    db.commit()
    return {"message": "Updated", "cart_item_id": str(cart_item_id), "quantity": item.quantity}


@router.delete(
    "/cart/{cart_id}/items/{cart_item_id}",
)
def remove_cart_item(
    cart_id: uuid.UUID,
    cart_item_id: uuid.UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles("patient"))
):
    """Remove an item from the cart."""
    return OrderService.remove_item_from_cart(db, current_user.user_id, cart_id, cart_item_id)


@router.get(
    "/cart/{cart_id}",
    response_model=CartDetailResponse
)
def get_cart(
    cart_id: uuid.UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Returns cart contents, computed subtotal, and per-item checkout_blocked status (BRD FR-14).
    """
    return OrderService.get_cart(
        db=db,
        patient_id=current_user.user_id,
        cart_id=cart_id,
        user_role=current_user.role
    )


# --- Saved Address Endpoints ---

@router.get(
    "/addresses",
    response_model=List[SavedAddressResponse]
)
def list_addresses(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Returns all saved addresses for the current user."""
    addrs = db.query(SavedAddress).filter(SavedAddress.user_id == current_user.user_id).all()
    return addrs


@router.post(
    "/addresses",
    response_model=SavedAddressResponse,
    status_code=status.HTTP_201_CREATED
)
def create_address(
    req: SavedAddressCreateRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles("patient"))
):
    """Creates a new saved address for the current user."""
    if req.is_default:
        db.query(SavedAddress).filter(
            SavedAddress.user_id == current_user.user_id,
            SavedAddress.is_default == True
        ).update({"is_default": False})

    addr = SavedAddress(
        user_id=current_user.user_id,
        label=req.label,
        line1=req.line1,
        line2=req.line2,
        city=req.city,
        state=req.state,
        pincode=req.pincode,
        is_default=req.is_default,
    )
    db.add(addr)
    db.commit()
    db.refresh(addr)
    return addr


# --- Order Endpoints ---

@router.post(
    "/orders",
    response_model=OrderCreateResponse,
    status_code=status.HTTP_201_CREATED
)
def create_order(
    req: OrderCreateRequest,
    idempotency_key: str = Header(..., alias="Idempotency-Key"),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles("patient"))
):
    """
    Converts a cart to an order (BRD FR-14, FR-15 / TRD Item 14, 16, 17).
    Enforces the non-bypassable Schedule H/H1/X compliance gate at server-side.
    Selects optimal fulfillment sources (owned vs partner) via routing engine.
    """
    order, fulfillments, total_amount = OrderService.checkout_order(
        db=db,
        patient_id=current_user.user_id,
        cart_id=req.cart_id,
        delivery_address_id=req.delivery_address_id,
        idempotency_key=idempotency_key
    )
    return OrderCreateResponse(
        order_id=order.order_id,
        cart_id=order.cart_id,
        patient_id=order.patient_id,
        status=order.status,
        payment_status=order.payment_status,
        fulfillment_records=[
            FulfillmentRecordResponse.model_validate(f) for f in fulfillments
        ],
        payment_required_amount=total_amount,
        created_at=order.created_at
    )


@router.get(
    "/orders/{order_id}",
    response_model=OrderDetailResponse
)
def get_order(
    order_id: uuid.UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Returns full order details, line items, fulfillment sources, and routing decisions (BRD Section 3.1).
    """
    return OrderService.get_order_detail(db, current_user, order_id)


@router.get(
    "/orders",
    response_model=OrderListResponse
)
def list_orders(
    status_filter: Optional[str] = Query(None, alias="status", description="Filter by order status"),
    limit: int = Query(20, ge=1, le=100),
    cursor: Optional[str] = Query(None, description="Cursor for pagination"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Lists orders for the authenticated patient or pharmacy staff queue (BRD Section 3.1).
    """
    orders, next_cursor = OrderService.list_orders(
        db=db,
        user=current_user,
        status_filter=status_filter,
        limit=limit,
        cursor=cursor
    )
    return OrderListResponse(data=orders, next_cursor=next_cursor)


@router.post(
    "/orders/{order_id}/cancel",
    response_model=OrderCancelResponse
)
def cancel_order(
    order_id: uuid.UUID,
    req: Optional[OrderCancelRequest] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Cancels an undispatched order and triggers the payment refund flow (BRD FR-18).
    """
    reason = req.reason if req else None
    order = OrderService.cancel_order(db, current_user, order_id, reason)
    return OrderCancelResponse(
        order_id=order.order_id,
        status=order.status,
        refund_id=None
    )


@router.post(
    "/orders/{order_id}/route-override",
    response_model=RouteOverrideResponse
)
def override_route(
    order_id: uuid.UUID,
    req: RouteOverrideRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles("admin", "super_admin"))
):
    """
    Manually overrides fulfillment source decision for an order line item (Admin only, BRD Section 4.1).
    """
    line_item_id, source, audit_id = OrderService.override_route(
        db=db,
        admin_user=current_user,
        order_id=order_id,
        line_item_id=req.line_item_id,
        new_source_type=req.new_source_type,
        new_source_id=req.new_source_id,
        reason=req.reason
    )
    return RouteOverrideResponse(
        line_item_id=line_item_id,
        fulfillment_source=source,
        audit_log_id=audit_id
    )


@router.post(
    "/orders/{order_id}/disputes",
    response_model=DisputeResponse,
    status_code=status.HTTP_201_CREATED
)
def flag_order_dispute(
    order_id: uuid.UUID,
    req: DisputeCreateRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Flags an order for Admin dispute resolution (BRD FR-20).
    """
    return OrderService.flag_dispute(
        db=db,
        user=current_user,
        order_id=order_id,
        dispute_type=req.dispute_type
    )
