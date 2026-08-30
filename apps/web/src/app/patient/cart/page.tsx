'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ApiClient, ApiError } from '../../../lib/api';
import { ScheduleBadge, ComplianceGateBanner } from '../../../components/Badges';
import { IconShieldCheck, IconShoppingCart, IconTrash2, IconMinus, IconPlus, IconLock, IconAlertTriangle, IconCreditCard } from '../../../components/Icons';
import { PageHeader } from '../../../components/PageHeader';
import { useToast } from '../../../components/Toast';
import { CartDetail, CartItemDetail } from '../../../lib/types';

declare global {
  interface Window {
    Razorpay: any;
  }
}

export default function CartPage() {
  const router = useRouter();
  const { addToast } = useToast();
  const [cart, setCart] = useState<CartDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [checkoutLoading, setCheckoutLoading] = useState(false);

  useEffect(() => { loadCart(); }, []);

  async function loadCart() {
    setLoading(true);
    setError('');
    try {
      const cartId = localStorage.getItem('ipmd_cart_id');
      if (cartId) {
        const cartData = await ApiClient.getCart(cartId);
        setCart(cartData);
        setLoading(false);
        return;
      }
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Failed to load cart';
      setError(msg);
    }
    setLoading(false);
  }

  const blockedItems = cart?.items.filter(i => i.checkout_blocked).map(i => i.medicine_name) || [];
  const hasBlocked = blockedItems.length > 0;

  const handleCheckout = async () => {
    if (!cart || hasBlocked) return;
    setCheckoutLoading(true);
    try {
      // 1. Ensure delivery address
      let addressId = localStorage.getItem('ipmd_default_address_id');
      if (!addressId) {
        const addresses = await ApiClient.listAddresses();
        const defaultAddr = addresses.find(a => a.is_default) || addresses[0];
        if (defaultAddr) {
          addressId = defaultAddr.address_id;
          localStorage.setItem('ipmd_default_address_id', addressId);
        } else {
          const newAddr = await ApiClient.createAddress({
            label: 'Home', line1: '123 MG Road', city: 'Mumbai',
            state: 'Maharashtra', pincode: '400001', is_default: true,
          });
          addressId = newAddr.address_id;
          localStorage.setItem('ipmd_default_address_id', addressId);
        }
      }

      // 2. Create order
      const orderRes = await ApiClient.createOrder(cart.cart_id, addressId);
      const amountPaise = Math.round(orderRes.payment_required_amount * 100);

      // 3. Create Razorpay payment order
      const paymentRes = await ApiClient.createPaymentOrder(orderRes.order_id, amountPaise);

      // 4. Open Razorpay checkout
      const razorpayKey = process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID || 'rzp_test_placeholder';

      const options = {
        key: razorpayKey,
        amount: paymentRes.amount,
        currency: paymentRes.currency,
        name: 'I.P. & M.D Platform',
        description: `Order #${orderRes.order_id.slice(0, 8)}`,
        order_id: paymentRes.razorpay_order_id,
        handler: async (response: any) => {
          // Payment successful — capture on backend
          try {
            await ApiClient.capturePayment(
              paymentRes.payment_intent_id,
              response.razorpay_payment_id,
              response.razorpay_signature
            );
            localStorage.removeItem('ipmd_cart_id');
            addToast('success', 'Payment Successful', `Order #${orderRes.order_id.slice(0, 8)} confirmed!`);
            router.push('/patient/orders');
          } catch (captureErr: any) {
            addToast('error', 'Payment Capture Failed', captureErr.message || 'Payment was made but confirmation failed. Contact support.');
            router.push('/patient/orders');
          }
        },
        prefill: {
          name: '',
          email: '',
          contact: '',
        },
        theme: {
          color: '#0D7377',
        },
        modal: {
          ondismiss: () => {
            addToast('warning', 'Payment Cancelled', 'You can retry payment from your orders page.');
            setCheckoutLoading(false);
          },
        },
      };

      const rzp = new window.Razorpay(options);
      rzp.on('payment.failed', (response: any) => {
        addToast('error', 'Payment Failed', response.error?.description || 'Payment failed. Please try again.');
        setCheckoutLoading(false);
      });
      rzp.open();
    } catch (e: unknown) {
      const msg = e instanceof ApiError ? e.message : 'Checkout failed';
      addToast('error', 'Checkout Failed', msg);
      setCheckoutLoading(false);
    }
  };

  const handleQuantityChange = async (itemId: string, newQty: number) => {
    if (!cart || newQty < 1) return;
    try {
      await ApiClient.updateCartItem(cart.cart_id, itemId, newQty);
      setCart(prev => {
        if (!prev) return prev;
        const items = prev.items.map(i => i.line_item_id === itemId ? { ...i, quantity: newQty } : i);
        const subtotal = items.reduce((sum, i) => sum + i.price * i.quantity, 0);
        return { ...prev, items, subtotal };
      });
    } catch (e: any) {
      addToast('error', 'Failed', e.message || 'Could not update quantity');
    }
  };

  const handleRemove = async (itemId: string) => {
    if (!cart) return;
    try {
      await ApiClient.removeCartItem(cart.cart_id, itemId);
      setCart(prev => {
        if (!prev) return prev;
        const items = prev.items.filter(i => i.line_item_id !== itemId);
        const subtotal = items.reduce((sum, i) => sum + i.price * i.quantity, 0);
        return { ...prev, items, subtotal };
      });
      addToast('success', 'Removed', 'Item removed from cart');
    } catch (e: any) {
      addToast('error', 'Failed', e.message || 'Could not remove item');
    }
  };

  if (loading) {
    return (
      <div style={{ maxWidth: '900px', margin: '0 auto' }}>
        <PageHeader title="Review Cart & Checkout" subtitle="Loading cart..." />
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--sp-3)' }}>
          {[1, 2].map(i => <div key={i} className="skeleton" style={{ height: '80px', borderRadius: 'var(--radius-lg)' }} />)}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ maxWidth: '900px', margin: '0 auto' }}>
        <PageHeader title="Review Cart & Checkout" />
        <div className="card" style={{ padding: 'var(--sp-6)', textAlign: 'center' }}>
          <IconAlertTriangle size={24} style={{ color: 'var(--danger)', margin: '0 auto var(--sp-3)' }} />
          <p style={{ color: 'var(--danger)' }}>{error}</p>
        </div>
      </div>
    );
  }

  if (!cart || cart.items.length === 0) {
    return (
      <div style={{ maxWidth: '900px', margin: '0 auto' }}>
        <PageHeader title="Review Cart & Checkout" subtitle="Your cart is empty" />
        <div className="empty-state" style={{ padding: 'var(--sp-12)' }}>
          <div className="empty-state-icon"><IconShoppingCart size={28} /></div>
          <h3>Your cart is empty</h3>
          <p>Browse the medicine catalog to add items.</p>
          <button className="btn btn-primary" onClick={() => router.push('/patient/catalog')}>Browse Catalog</button>
        </div>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: '900px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 'var(--sp-6)' }}>
      <PageHeader title="Review Cart & Checkout" subtitle={`${cart.items.length} items in your cart`} />

      {hasBlocked && <ComplianceGateBanner itemNames={blockedItems} />}

      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 'var(--sp-6)', alignItems: 'start' }}>
        <div className="card" style={{ padding: 'var(--sp-5)' }}>
          <h2 className="text-h2" style={{ marginBottom: 'var(--sp-4)' }}>Selected Items</h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
            {cart.items.map((item: CartItemDetail) => (
              <div key={item.line_item_id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: 'var(--sp-4) 0', borderBottom: '1px solid var(--border-light)' }}>
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--sp-2)', marginBottom: 'var(--sp-1)' }}>
                    <span style={{ fontWeight: 600, fontSize: 'var(--text-md)', color: 'var(--text-primary)' }}>{item.medicine_name}</span>
                    <ScheduleBadge schedule={item.schedule} />
                  </div>
                  <p className="text-caption">Generic: {item.generic_name || '—'}</p>
                  {item.checkout_blocked && (
                    <span style={{ fontSize: 'var(--text-xs)', color: 'var(--danger)', fontWeight: 500, display: 'inline-flex', alignItems: 'center', gap: 'var(--sp-1)', marginTop: 'var(--sp-1)' }}>
                      <IconLock size={12} />Rx required
                    </span>
                  )}
                  {item.prescription_id && (
                    <span style={{ fontSize: 'var(--text-xs)', color: 'var(--success)', fontWeight: 500, display: 'inline-flex', alignItems: 'center', gap: 'var(--sp-1)', marginTop: 'var(--sp-1)' }}>
                      <IconShieldCheck size={12} />Rx linked
                    </span>
                  )}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--sp-4)' }}>
                  {/* Quantity controls */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--sp-1)', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', overflow: 'hidden' }}>
                    <button
                      onClick={() => handleQuantityChange(item.line_item_id, item.quantity - 1)}
                      disabled={item.quantity <= 1}
                      style={{ width: '32px', height: '32px', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg-page)', border: 'none', cursor: item.quantity <= 1 ? 'not-allowed' : 'pointer', opacity: item.quantity <= 1 ? 0.4 : 1, fontSize: '16px', fontWeight: 600, color: 'var(--text-secondary)' }}
                    >
                      −
                    </button>
                    <span style={{ minWidth: '28px', textAlign: 'center', fontWeight: 600, fontSize: 'var(--text-sm)', fontVariantNumeric: 'tabular-nums' }}>{item.quantity}</span>
                    <button
                      onClick={() => handleQuantityChange(item.line_item_id, item.quantity + 1)}
                      style={{ width: '32px', height: '32px', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg-page)', border: 'none', cursor: 'pointer', fontSize: '16px', fontWeight: 600, color: 'var(--text-secondary)' }}
                    >
                      +
                    </button>
                  </div>
                  {/* Price */}
                  <span className="tabular-nums" style={{ fontWeight: 700, fontSize: 'var(--text-md)', color: 'var(--primary-dark)', minWidth: '70px', textAlign: 'right' }}>
                    ₹{(item.price * item.quantity).toFixed(2)}
                  </span>
                  {/* Remove */}
                  <button
                    onClick={() => handleRemove(item.line_item_id)}
                    title="Remove item"
                    style={{ width: '32px', height: '32px', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'transparent', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', cursor: 'pointer', color: 'var(--text-muted)', transition: 'all 150ms' }}
                    onMouseEnter={e => { e.currentTarget.style.color = 'var(--danger)'; e.currentTarget.style.borderColor = 'var(--danger)'; }}
                    onMouseLeave={e => { e.currentTarget.style.color = 'var(--text-muted)'; e.currentTarget.style.borderColor = 'var(--border)'; }}
                  >
                    <IconTrash2 size={14} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="card" style={{ padding: 'var(--sp-5)', position: 'sticky', top: 'var(--sp-6)' }}>
          <h2 className="text-h2" style={{ marginBottom: 'var(--sp-4)' }}>Order Summary</h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--sp-3)', fontSize: 'var(--text-sm)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: 'var(--text-secondary)' }}>Subtotal ({cart.items.length} items)</span>
              <span className="tabular-nums" style={{ fontWeight: 500 }}>₹{cart.subtotal.toFixed(2)}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', paddingTop: 'var(--sp-3)', borderTop: '1px solid var(--border-light)', fontWeight: 700, fontSize: 'var(--text-lg)' }}>
              <span>Total</span>
              <span className="tabular-nums" style={{ color: 'var(--primary-dark)' }}>₹{cart.subtotal.toFixed(2)}</span>
            </div>
          </div>

          <button
            type="button"
            className="btn btn-primary btn-lg"
            disabled={hasBlocked || checkoutLoading}
            style={{ width: '100%', marginTop: 'var(--sp-5)' }}
            onClick={handleCheckout}
          >
            {checkoutLoading ? 'Processing...' : hasBlocked ? <><IconLock size={16} />Checkout Locked</> : <><IconShoppingCart size={16} />Place Order</>}
          </button>

          {hasBlocked && (
            <p style={{ fontSize: 'var(--text-xs)', color: 'var(--danger)', textAlign: 'center', marginTop: 'var(--sp-3)' }}>
              Prescription verification required for regulated items
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
