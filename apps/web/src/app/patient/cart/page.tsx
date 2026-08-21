'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ApiClient, ApiError } from '../../../lib/api';
import { ScheduleBadge, ComplianceGateBanner } from '../../../components/Badges';
import { IconShieldCheck, IconShoppingCart, IconTrash2, IconMinus, IconPlus, IconLock, IconAlertTriangle } from '../../../components/Icons';
import { PageHeader } from '../../../components/PageHeader';
import { useToast } from '../../../components/Toast';
import { CartDetail, CartItemDetail } from '../../../lib/types';

export default function CartPage() {
  const router = useRouter();
  const { addToast } = useToast();
  const [cart, setCart] = useState<CartDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [checkoutLoading, setCheckoutLoading] = useState(false);

  useEffect(() => {
    loadCart();
  }, []);

  async function loadCart() {
    setLoading(true);
    try {
      // Check if there's an active cart in localStorage
      const cartId = localStorage.getItem('ipmd_cart_id');
      if (cartId) {
        const cartData = await ApiClient.getCart(cartId);
        setCart(cartData);
        return;
      }
    } catch {
      // Cart may not exist yet
    }
    setLoading(false);
  }

  const blockedItems = cart?.items.filter(i => i.checkout_blocked).map(i => i.medicine_name) || [];
  const hasBlocked = blockedItems.length > 0;

  const handleCheckout = async () => {
    if (!cart || hasBlocked) return;
    setCheckoutLoading(true);
    try {
      // Get default address or use placeholder
      const addressId = localStorage.getItem('ipmd_default_address_id') || '00000000-0000-0000-0000-000000000001';
      const orderRes = await ApiClient.createOrder(cart.cart_id, addressId);
      localStorage.removeItem('ipmd_cart_id');
      addToast('success', 'Order Placed', `Order #${orderRes.order_id.slice(0, 8)} created. Payment required.`);
      router.push('/patient/orders');
    } catch (e: unknown) {
      const msg = e instanceof ApiError ? e.message : 'Checkout failed';
      addToast('error', 'Checkout Failed', msg);
    } finally {
      setCheckoutLoading(false);
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
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--sp-4)' }}>
            {cart.items.map((item: CartItemDetail) => (
              <div key={item.line_item_id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', paddingBottom: 'var(--sp-4)', borderBottom: '1px solid var(--border-light)' }}>
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--sp-2)', marginBottom: 'var(--sp-1)' }}>
                    <span style={{ fontWeight: 600, fontSize: 'var(--text-md)', color: 'var(--text-primary)' }}>{item.medicine_name}</span>
                    <ScheduleBadge schedule={item.schedule} />
                  </div>
                  <p className="text-caption">Generic: {item.generic_name || '—'}</p>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--sp-3)', marginTop: 'var(--sp-2)' }}>
                    <span style={{ fontSize: 'var(--text-sm)', color: 'var(--text-secondary)' }}>Qty: {item.quantity}</span>
                    {item.checkout_blocked && (
                      <span style={{ fontSize: 'var(--text-xs)', color: 'var(--danger)', fontWeight: 500, display: 'flex', alignItems: 'center', gap: 'var(--sp-1)' }}>
                        <IconLock size={12} />Rx required
                      </span>
                    )}
                    {item.prescription_id && (
                      <span style={{ fontSize: 'var(--text-xs)', color: 'var(--success)', fontWeight: 500, display: 'flex', alignItems: 'center', gap: 'var(--sp-1)' }}>
                        <IconShieldCheck size={12} />Rx linked
                      </span>
                    )}
                  </div>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 'var(--sp-2)' }}>
                  <span className="tabular-nums" style={{ fontWeight: 600, fontSize: 'var(--text-md)', color: 'var(--text-primary)' }}>
                    ₹{item.price.toFixed(2)}
                  </span>
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
