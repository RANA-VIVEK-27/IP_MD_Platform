'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { ApiClient } from '../../../lib/api';
import { PageHeader } from '../../../components/PageHeader';
import { StatusBadge } from '../../../components/Badges';
import { IconPackage, IconAlertTriangle, IconSearch } from '../../../components/Icons';
import type { PharmacyOrderItem, PharmacyOrderDetail } from '../../../lib/types';

const statusColor = (s: string) => {
  const colors: Record<string, string> = { placed: 'var(--warning)', processing: 'var(--primary)', dispatched: '#7c3aed', delivered: 'var(--success)', cancelled: 'var(--error)' };
  return colors[s] || 'var(--text-secondary)';
};

export default function PharmacyOrdersPage() {
  const router = useRouter();
  const [orders, setOrders] = useState<PharmacyOrderItem[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [filterStatus, setFilterStatus] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedOrder, setSelectedOrder] = useState<PharmacyOrderDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);

  const loadOrders = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const params: Record<string, string | number> = { page, page_size: 20 };
      if (filterStatus) params.status = filterStatus;
      const res = await ApiClient.listPharmacyOrders(params);
      setOrders(res.data);
      setTotal(res.total);
    } catch (e: any) {
      if (e.status === 401) { router.push('/login'); return; }
      setError(e.message || 'Failed to load orders');
    } finally {
      setLoading(false);
    }
  }, [page, filterStatus]);

  useEffect(() => { loadOrders(); }, [loadOrders]);

  const viewOrder = async (orderId: string) => {
    try {
      setDetailLoading(true);
      const res = await ApiClient.getPharmacyOrderDetail(orderId);
      setSelectedOrder(res);
    } catch (e: any) {
      alert(e.message || 'Failed to load order detail');
    } finally {
      setDetailLoading(false);
    }
  };

  const handleAccept = async (orderId: string) => {
    try {
      await ApiClient.acceptPharmacyOrder(orderId);
      loadOrders();
      if (selectedOrder?.order_id === orderId) viewOrder(orderId);
    } catch (e: any) {
      alert(e.message || 'Failed to accept order');
    }
  };

  const handleDispatch = async (orderId: string) => {
    if (!confirm('Dispatch this order? Stock will be deducted.')) return;
    try {
      await ApiClient.dispatchPharmacyOrder(orderId);
      loadOrders();
      if (selectedOrder?.order_id === orderId) viewOrder(orderId);
    } catch (e: any) {
      alert(e.message || 'Failed to dispatch order');
    }
  };

  const handleCollectPayment = async (orderId: string) => {
    if (!confirm('Mark this payment as collected (COD / offline)?')) return;
    try {
      await ApiClient.collectPharmacyPayment(orderId);
      loadOrders();
      if (selectedOrder?.order_id === orderId) viewOrder(orderId);
    } catch (e: any) {
      alert(e.message || 'Failed to collect payment');
    }
  };

  return (
    <div className="app-content" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--sp-6)' }}>
      <PageHeader title="Orders" subtitle={`Manage incoming customer orders (${total} total)`} />

      {/* Filters */}
      <div className="card" style={{ padding: 'var(--sp-3) var(--sp-4)', display: 'flex', gap: 'var(--sp-3)', alignItems: 'center' }}>
        <span style={{ fontSize: 'var(--text-sm)', fontWeight: 600, color: 'var(--text-secondary)' }}>Filter:</span>
        <select
          value={filterStatus}
          onChange={e => { setFilterStatus(e.target.value); setPage(1); }}
          className="input"
          style={{ height: '36px', width: '180px', fontSize: 'var(--text-sm)' }}
        >
          <option value="">All Statuses</option>
          <option value="placed">Placed</option>
          <option value="processing">Processing</option>
          <option value="dispatched">Dispatched</option>
          <option value="delivered">Delivered</option>
          <option value="cancelled">Cancelled</option>
        </select>
      </div>

      {loading ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--sp-3)' }}>
          {[1, 2, 3].map(i => <div key={i} className="skeleton" style={{ height: '100px', borderRadius: 'var(--radius-lg)' }} />)}
        </div>
      ) : error ? (
        <div className="card" style={{ padding: 'var(--sp-6)', textAlign: 'center' }}>
          <IconAlertTriangle size={24} style={{ color: 'var(--danger)', margin: '0 auto var(--sp-3)' }} />
          <p style={{ color: 'var(--danger)' }}>{error}</p>
          <button className="btn btn-secondary btn-sm" style={{ marginTop: 'var(--sp-3)' }} onClick={loadOrders}>Retry</button>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: selectedOrder ? '1fr 1fr' : '1fr', gap: 'var(--sp-4)' }}>
          {/* Order List */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--sp-3)' }}>
            {orders.length === 0 ? (
              <div className="card" style={{ padding: 'var(--sp-10)', textAlign: 'center' }}>
                <IconPackage size={32} style={{ color: 'var(--text-muted)', margin: '0 auto var(--sp-3)', opacity: 0.4 }} />
                <p style={{ color: 'var(--text-secondary)' }}>No orders found.</p>
              </div>
            ) : (
              orders.map(o => (
                <div
                  key={o.order_id}
                  onClick={() => viewOrder(o.order_id)}
                  className="card"
                  style={{
                    padding: 'var(--sp-4)',
                    cursor: 'pointer',
                    borderColor: selectedOrder?.order_id === o.order_id ? 'var(--primary)' : undefined,
                    transition: 'border-color 150ms',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--sp-2)' }}>
                    <span style={{ fontFamily: 'monospace', fontSize: 'var(--text-sm)', color: 'var(--text-secondary)' }}>#{o.order_id.slice(0, 8)}</span>
                    <StatusBadge status={o.status} />
                  </div>
                  <div style={{ fontSize: 'var(--text-sm)', color: 'var(--text-secondary)', marginBottom: 'var(--sp-2)' }}>
                    {o.patient_name} · {o.items_count} items
                  </div>
                  {o.delivery_address && (
                    <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)', marginBottom: 'var(--sp-2)', display: 'flex', alignItems: 'center', gap: 'var(--sp-1)' }}>
                      📍 {o.delivery_address.full}
                    </div>
                  )}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontWeight: 700, fontSize: 'var(--text-base)', color: 'var(--text-primary)' }}>₹{o.total_amount.toFixed(2)}</span>
                    <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>{new Date(o.created_at).toLocaleDateString()}</span>
                  </div>
                </div>
              ))
            )}

            {/* Pagination */}
            {orders.length > 0 && (
              <div style={{ display: 'flex', justifyContent: 'center', gap: 'var(--sp-2)', marginTop: 'var(--sp-2)' }}>
                <button className="btn btn-ghost btn-sm" disabled={page <= 1} onClick={() => setPage(p => p - 1)}>Previous</button>
                <span style={{ padding: 'var(--sp-2) var(--sp-3)', fontSize: 'var(--text-sm)', color: 'var(--text-secondary)' }}>Page {page}</span>
                <button className="btn btn-ghost btn-sm" disabled={orders.length < 20} onClick={() => setPage(p => p + 1)}>Next</button>
              </div>
            )}
          </div>

          {/* Order Detail */}
          {selectedOrder && (
            <div className="card" style={{ padding: 'var(--sp-5)', position: 'sticky', top: '70px', alignSelf: 'start' }}>
              {detailLoading ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--sp-3)' }}>
                  <div className="skeleton" style={{ height: '24px', width: '60%' }} />
                  <div className="skeleton" style={{ height: '16px', width: '40%' }} />
                  <div className="skeleton" style={{ height: '80px' }} />
                </div>
              ) : (
                <>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--sp-4)' }}>
                    <h2 style={{ fontSize: 'var(--text-lg)', fontWeight: 700 }}>Order #{selectedOrder.order_id.slice(0, 8)}</h2>
                    <button onClick={() => setSelectedOrder(null)} className="btn btn-ghost btn-sm" style={{ padding: '4px 8px' }}>✕</button>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--sp-2)', marginBottom: 'var(--sp-4)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 'var(--text-sm)' }}>
                      <span style={{ color: 'var(--text-secondary)' }}>Patient</span>
                      <span style={{ fontWeight: 500 }}>{selectedOrder.patient_name}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 'var(--text-sm)' }}>
                      <span style={{ color: 'var(--text-secondary)' }}>Payment</span>
                      <StatusBadge status={selectedOrder.payment_status} />
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 'var(--text-sm)' }}>
                      <span style={{ color: 'var(--text-secondary)' }}>Total</span>
                      <span style={{ fontWeight: 700 }}>₹{selectedOrder.total_amount.toFixed(2)}</span>
                    </div>
                  </div>

                  <h3 style={{ fontSize: 'var(--text-sm)', fontWeight: 600, marginBottom: 'var(--sp-2)', color: 'var(--text-secondary)' }}>Items</h3>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--sp-2)', marginBottom: 'var(--sp-4)' }}>
                    {selectedOrder.items.map(item => (
                      <div key={item.line_item_id} style={{ padding: 'var(--sp-3)', background: 'var(--bg-page)', borderRadius: 'var(--radius-sm)' }}>
                        <div style={{ fontWeight: 600, fontSize: 'var(--text-sm)', marginBottom: '2px' }}>{item.medicine_name}</div>
                        <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-secondary)' }}>
                          Qty: {item.quantity} × ₹{item.unit_price.toFixed(2)} = ₹{item.total_price.toFixed(2)}
                        </div>
                        {item.fulfillment && (
                          <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)', marginTop: '2px' }}>
                            Fulfillment: {item.fulfillment.status} ({item.fulfillment.source_type})
                          </div>
                        )}
                      </div>
                    ))}
                  </div>

                  <div style={{ display: 'flex', gap: 'var(--sp-2)', flexWrap: 'wrap' }}>
                    {selectedOrder.status === 'placed' && (
                      <button onClick={() => handleAccept(selectedOrder.order_id)} className="btn btn-primary" style={{ flex: 1 }}>
                        Accept Order
                      </button>
                    )}
                    {(selectedOrder.status === 'placed' || selectedOrder.status === 'processing') && (
                      <button onClick={() => handleDispatch(selectedOrder.order_id)} className="btn btn-primary" style={{ flex: 1, background: '#7c3aed', borderColor: '#7c3aed' }}>
                        Dispatch
                      </button>
                    )}
                    {selectedOrder.payment_status === 'pending' && selectedOrder.status !== 'cancelled' && (
                      <button onClick={() => handleCollectPayment(selectedOrder.order_id)} className="btn" style={{ flex: 1, background: 'var(--success)', color: '#fff', borderColor: 'var(--success)' }}>
                        💳 Collect Payment
                      </button>
                    )}
                    {selectedOrder.payment_status === 'captured' && (
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 'var(--sp-1)', fontSize: 'var(--text-sm)', color: 'var(--success)', fontWeight: 600 }}>
                        ✅ Payment Collected
                      </span>
                    )}
                  </div>
                </>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
