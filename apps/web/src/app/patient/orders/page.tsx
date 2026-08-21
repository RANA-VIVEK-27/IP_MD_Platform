'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { ApiClient } from '../../../lib/api';
import { StatusBadge } from '../../../components/Badges';
import { LifecycleStepper } from '../../../components/LifecycleStepper';
import { PageHeader } from '../../../components/PageHeader';
import { IconPackage, IconClock, IconAlertTriangle } from '../../../components/Icons';
import { OrderSummary } from '../../../lib/types';

const ORDER_STEPS = [
  { id: 'placed', label: 'Placed' },
  { id: 'processing', label: 'Processing' },
  { id: 'dispatched', label: 'Dispatched' },
  { id: 'delivered', label: 'Delivered' },
];

export default function OrdersPage() {
  const [orders, setOrders] = useState<OrderSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    loadOrders();
  }, []);

  async function loadOrders() {
    setLoading(true);
    try {
      const res = await ApiClient.listOrders({ limit: 20 });
      setOrders(res.data || []);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Failed to load orders';
      setError(msg);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{ maxWidth: '900px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 'var(--sp-6)' }}>
      <PageHeader title="My Orders" subtitle="Track your medicine delivery status and view order history." />

      {loading ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--sp-5)' }}>
          {[1, 2].map(i => <div key={i} className="skeleton" style={{ height: '180px', borderRadius: 'var(--radius-lg)' }} />)}
        </div>
      ) : error ? (
        <div className="card" style={{ padding: 'var(--sp-6)', textAlign: 'center' }}>
          <IconAlertTriangle size={24} style={{ color: 'var(--danger)', margin: '0 auto var(--sp-3)' }} />
          <p style={{ color: 'var(--danger)' }}>{error}</p>
          <button className="btn btn-secondary btn-sm" style={{ marginTop: 'var(--sp-3)' }} onClick={loadOrders}>Retry</button>
        </div>
      ) : orders.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state-icon"><IconPackage size={28} /></div>
          <h3>No orders yet</h3>
          <p>Your order history will appear here once you place your first order.</p>
          <Link href="/patient/catalog" className="btn btn-primary">Browse Catalog</Link>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--sp-5)' }}>
          {orders.map((ord) => (
            <div key={ord.order_id} className="card" style={{ padding: 'var(--sp-5)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 'var(--sp-4)', paddingBottom: 'var(--sp-4)', borderBottom: '1px solid var(--border-light)' }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--sp-2)', marginBottom: 'var(--sp-1)' }}>
                    <span style={{ fontWeight: 700, fontSize: 'var(--text-lg)', color: 'var(--text-primary)' }}>Order #{ord.order_id.slice(0, 8)}</span>
                    <StatusBadge status={ord.status} />
                  </div>
                  <p className="text-caption">Placed on {new Date(ord.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</p>
                  <p className="text-caption" style={{ marginTop: 'var(--sp-1)' }}>Payment: {ord.payment_status} · {ord.items_count} items</p>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <span className="tabular-nums" style={{ fontSize: 'var(--text-xl)', fontWeight: 700, color: 'var(--primary-dark)', display: 'block' }}>
                    ₹{ord.total_amount.toFixed(2)}
                  </span>
                </div>
              </div>
              <div style={{ marginBottom: 'var(--sp-4)' }}>
                <LifecycleStepper steps={ORDER_STEPS} currentStepId={ord.status} />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
