'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ApiClient } from '../../../lib/api';
import { useAuth } from '../../../lib/auth-context';
import { KPICard } from '../../../components/KPICard';
import { PageHeader } from '../../../components/PageHeader';
import { IconPrescription, IconPackage, IconAlertTriangle, IconClock, IconTruck, IconCheckCircle, IconXCircle, IconActivity, IconPill } from '../../../components/Icons';
import type { PharmacyDashboard } from '../../../lib/types';

export default function PharmacyDashboardPage() {
  const router = useRouter();
  const { user } = useAuth();
  const [data, setData] = useState<PharmacyDashboard | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await ApiClient.getPharmacyDashboard();
      setData(res);
    } catch (e: any) {
      if (e.status === 401) { router.push('/login'); return; }
      if (e.status === 403) { setError('Access denied. Pharmacy staff only.'); return; }
      setError(e.message || 'Failed to load dashboard');
    } finally {
      setLoading(false);
    }
  };

  const getStatusStyle = (status: string) => {
    switch (status) {
      case 'placed': return { bg: 'var(--warning-bg)', color: 'var(--warning)', label: 'PLACED' };
      case 'processing': return { bg: 'var(--info-bg)', color: 'var(--info)', label: 'PROCESSING' };
      case 'dispatched': return { bg: 'var(--primary-light)', color: 'var(--primary)', label: 'DISPATCHED' };
      case 'delivered': return { bg: 'var(--success-bg)', color: 'var(--success)', label: 'DELIVERED' };
      case 'cancelled': return { bg: 'var(--danger-bg)', color: 'var(--danger)', label: 'CANCELLED' };
      default: return { bg: 'var(--bg-muted)', color: 'var(--text-muted)', label: status.toUpperCase() };
    }
  };

  if (loading) {
    return (
      <div style={{ padding: 'var(--sp-6)', maxWidth: '1280px', margin: '0 auto' }}>
        <div style={{ marginBottom: 'var(--sp-6)' }}>
          <div style={{ height: '28px', width: '240px', borderRadius: 'var(--radius-md)', marginBottom: 'var(--sp-2)' }} className="skeleton" />
          <div style={{ height: '16px', width: '380px', borderRadius: 'var(--radius-sm)' }} className="skeleton" />
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 'var(--sp-4)', marginBottom: 'var(--sp-6)' }}>
          {[1,2,3,4].map(i => <div key={i} style={{ height: '120px', borderRadius: 'var(--radius-xl)' }} className="skeleton" />)}
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 'var(--sp-4)', marginBottom: 'var(--sp-6)' }}>
          {[1,2,3,4].map(i => <div key={i} style={{ height: '80px', borderRadius: 'var(--radius-lg)' }} className="skeleton" />)}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ padding: 'var(--sp-6)', maxWidth: '1280px', margin: '0 auto' }}>
        <div style={{ background: 'var(--danger-bg)', border: '1px solid var(--danger-border)', borderRadius: 'var(--radius-lg)', padding: 'var(--sp-5)', textAlign: 'center' }}>
          <IconXCircle size={24} style={{ color: 'var(--danger)', marginBottom: 'var(--sp-2)' }} />
          <p style={{ color: 'var(--danger)', fontWeight: 500 }}>{error}</p>
        </div>
      </div>
    );
  }

  if (!data) return null;

  const orderPipeline = [
    { label: 'Pending', value: data.pending_orders, icon: <IconClock size={16} />, color: 'var(--warning)', bg: 'var(--warning-bg)' },
    { label: 'Dispatched', value: data.dispatched_orders, icon: <IconTruck size={16} />, color: 'var(--info)', bg: 'var(--info-bg)' },
    { label: 'Delivered', value: data.delivered_orders, icon: <IconCheckCircle size={16} />, color: 'var(--success)', bg: 'var(--success-bg)' },
    { label: 'Cancelled', value: data.cancelled_orders, icon: <IconXCircle size={16} />, color: 'var(--danger)', bg: 'var(--danger-bg)' },
  ];

  return (
    <div className="app-content" style={{ maxWidth: '1280px', margin: '0 auto', padding: 'var(--sp-6)' }}>
      {/* Welcome Header */}
      <div style={{
        background: 'linear-gradient(135deg, var(--primary) 0%, #0A8E8A 50%, var(--secondary) 100%)',
        borderRadius: 'var(--radius-xl)',
        padding: 'var(--sp-6) var(--sp-8)',
        marginBottom: 'var(--sp-6)',
        position: 'relative',
        overflow: 'hidden',
      }}>
        <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(circle at 80% 20%, rgba(255,255,255,0.1) 0%, transparent 50%)' }} />
        <div style={{ position: 'absolute', top: '-20px', right: '-10px', fontSize: '120px', fontWeight: 300, color: 'rgba(255,255,255,0.06)', lineHeight: 1 }}>+</div>
        <div style={{ position: 'relative', zIndex: 1 }}>
          <h1 style={{ fontSize: 'var(--text-2xl)', fontWeight: 700, color: '#fff', marginBottom: 'var(--sp-1)' }}>
            {user?.role === 'partner_pharmacy' ? 'Partner Pharmacy Dashboard' : 'Pharmacy Dashboard'}
          </h1>
          <p style={{ fontSize: 'var(--text-sm)', color: 'rgba(255,255,255,0.75)', marginBottom: 'var(--sp-4)' }}>
            {user?.role === 'partner_pharmacy'
              ? 'Manage your partner stock and track orders routed to you.'
              : 'Manage medicines, inventory and fulfillment from your clinical workspace.'}
          </p>
          <div style={{ display: 'flex', gap: 'var(--sp-3)', flexWrap: 'wrap' }}>
            <button
              onClick={() => router.push('/pharmacy/inventory')}
              style={{
                padding: '8px 20px', borderRadius: 'var(--radius-md)',
                background: 'rgba(255,255,255,0.15)', border: '1px solid rgba(255,255,255,0.2)',
                color: '#fff', fontWeight: 600, fontSize: 'var(--text-sm)',
                cursor: 'pointer', transition: 'all 150ms',
                backdropFilter: 'blur(4px)',
              }}
              onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.25)'; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.15)'; }}
            >
              Manage Inventory
            </button>
            <button
              onClick={() => router.push('/pharmacy/orders')}
              style={{
                padding: '8px 20px', borderRadius: 'var(--radius-md)',
                background: 'rgba(255,255,255,0.15)', border: '1px solid rgba(255,255,255,0.2)',
                color: '#fff', fontWeight: 600, fontSize: 'var(--text-sm)',
                cursor: 'pointer', transition: 'all 150ms',
                backdropFilter: 'blur(4px)',
              }}
              onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.25)'; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.15)'; }}
            >
              View Orders
            </button>
          </div>
        </div>
      </div>

      {/* KPI Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 'var(--sp-4)', marginBottom: 'var(--sp-6)' }}>
        <div className="animate-slide-up animate-stagger-1">
          <KPICard
            title="Total Medicines"
            value={data.total_medicines}
            subtitle="Active catalog items"
            icon={<IconPrescription size={18} />}
            onClick={() => router.push('/pharmacy/medicines')}
          />
        </div>
        <div className="animate-slide-up animate-stagger-2">
          <KPICard
            title="Total Stock Units"
            value={data.total_stock_units.toLocaleString()}
            subtitle="Units across all batches"
            icon={<IconPackage size={18} />}
            onClick={() => router.push('/pharmacy/inventory')}
          />
        </div>
        <div className="animate-slide-up animate-stagger-3">
          <KPICard
            title="Low Stock"
            value={data.low_stock_count}
            subtitle={data.low_stock_count > 0 ? 'Items requiring attention' : 'All items well stocked'}
            isWarning={data.low_stock_count > 0}
            icon={<IconAlertTriangle size={18} />}
            onClick={() => router.push('/pharmacy/inventory')}
          />
        </div>
        <div className="animate-slide-up animate-stagger-4">
          <KPICard
            title="Expiring Soon"
            value={data.expiring_soon_count}
            subtitle={data.expiring_soon_count > 0 ? 'Batches require review' : 'No batches expiring'}
            isDanger={data.expiring_soon_count > 0}
            icon={<IconClock size={18} />}
            onClick={() => router.push('/pharmacy/inventory')}
          />
        </div>
      </div>

      {/* Order Pipeline */}
      <div style={{ marginBottom: 'var(--sp-6)' }}>
        <h2 style={{ fontSize: 'var(--text-lg)', fontWeight: 700, color: 'var(--text-heading)', marginBottom: 'var(--sp-4)', display: 'flex', alignItems: 'center', gap: 'var(--sp-2)' }}>
          <IconActivity size={18} style={{ color: 'var(--primary)' }} />
          Order Operations
        </h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 'var(--sp-3)' }}>
          {orderPipeline.map((s, i) => (
            <div
              key={s.label}
              style={{
                background: 'var(--bg-surface)',
                border: '1px solid var(--border-light)',
                borderRadius: 'var(--radius-lg)',
                padding: 'var(--sp-4)',
                display: 'flex',
                alignItems: 'center',
                gap: 'var(--sp-3)',
                cursor: 'pointer',
                transition: 'all 200ms var(--ease)',
              }}
              onClick={() => router.push('/pharmacy/orders')}
              onMouseEnter={(e) => { e.currentTarget.style.boxShadow = 'var(--shadow-md)'; e.currentTarget.style.transform = 'translateY(-1px)'; }}
              onMouseLeave={(e) => { e.currentTarget.style.boxShadow = 'none'; e.currentTarget.style.transform = 'translateY(0)'; }}
            >
              <div style={{
                width: '40px', height: '40px', borderRadius: 'var(--radius-md)',
                background: s.bg, color: s.color,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                flexShrink: 0,
              }}>
                {s.icon}
              </div>
              <div>
                <div style={{ fontSize: 'var(--text-2xl)', fontWeight: 800, color: s.color, lineHeight: 1.1 }}>
                  {s.value}
                </div>
                <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)', fontWeight: 500 }}>
                  {s.label}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Recent Orders + Inventory Summary */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--sp-5)' }}>
        {/* Recent Orders */}
        <div style={{
          background: 'var(--bg-surface)',
          border: '1px solid var(--border-light)',
          borderRadius: 'var(--radius-xl)',
          overflow: 'hidden',
        }}>
          <div style={{
            padding: 'var(--sp-4) var(--sp-5)',
            borderBottom: '1px solid var(--border-light)',
            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          }}>
            <h3 style={{ fontSize: 'var(--text-base)', fontWeight: 600, color: 'var(--text-heading)' }}>Recent Orders</h3>
            <button
              onClick={() => router.push('/pharmacy/orders')}
              style={{
                fontSize: 'var(--text-xs)', fontWeight: 600, color: 'var(--primary)',
                background: 'none', border: 'none', cursor: 'pointer',
              }}
            >
              View All
            </button>
          </div>
          {data.recent_orders.length === 0 ? (
            <div style={{ padding: 'var(--sp-8)', textAlign: 'center' }}>
              <IconPackage size={32} style={{ color: 'var(--text-muted)', marginBottom: 'var(--sp-2)', opacity: 0.4 }} />
              <p style={{ color: 'var(--text-muted)', fontSize: 'var(--text-sm)' }}>No orders yet.</p>
            </div>
          ) : (
            <div>
              {data.recent_orders.map((o, idx) => {
                const ss = getStatusStyle(o.status);
                return (
                  <div
                    key={o.order_id}
                    style={{
                      padding: 'var(--sp-3) var(--sp-5)',
                      borderBottom: idx < data.recent_orders.length - 1 ? '1px solid var(--border-light)' : 'none',
                      cursor: 'pointer',
                      transition: 'background 150ms',
                      display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                    }}
                    onClick={() => router.push('/pharmacy/orders')}
                    onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--primary-50)'; }}
                    onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--sp-3)', minWidth: 0 }}>
                      <div style={{
                        width: '32px', height: '32px', borderRadius: '50%',
                        background: 'var(--primary-light)', color: 'var(--primary)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: 'var(--text-xs)', fontWeight: 700, flexShrink: 0,
                      }}>
                        {o.patient_name?.charAt(0) || '?'}
                      </div>
                      <div style={{ minWidth: 0 }}>
                        <div style={{ fontSize: 'var(--text-sm)', fontWeight: 600, color: 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {o.patient_name}
                        </div>
                        <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
                          #{o.order_id.slice(0, 8)}
                        </div>
                      </div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--sp-3)', flexShrink: 0 }}>
                      <span style={{
                        padding: '2px 8px', borderRadius: 'var(--radius-pill)',
                        fontSize: '10px', fontWeight: 600,
                        background: ss.bg, color: ss.color,
                        letterSpacing: '0.04em',
                      }}>
                        {ss.label}
                      </span>
                      <span style={{ fontSize: 'var(--text-sm)', fontWeight: 600, color: 'var(--text-primary)' }}>
                        ₹{o.total_amount.toFixed(0)}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Inventory Summary */}
        <div style={{
          background: 'var(--bg-surface)',
          border: '1px solid var(--border-light)',
          borderRadius: 'var(--radius-xl)',
          overflow: 'hidden',
        }}>
          <div style={{
            padding: 'var(--sp-4) var(--sp-5)',
            borderBottom: '1px solid var(--border-light)',
            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          }}>
            <h3 style={{ fontSize: 'var(--text-base)', fontWeight: 600, color: 'var(--text-heading)' }}>Inventory Summary</h3>
            <button
              onClick={() => router.push('/pharmacy/inventory')}
              style={{
                fontSize: 'var(--text-xs)', fontWeight: 600, color: 'var(--primary)',
                background: 'none', border: 'none', cursor: 'pointer',
              }}
            >
              View All
            </button>
          </div>
          {data.inventory_summary.length === 0 ? (
            <div style={{ padding: 'var(--sp-8)', textAlign: 'center' }}>
              <IconPill size={32} style={{ color: 'var(--text-muted)', marginBottom: 'var(--sp-2)', opacity: 0.4 }} />
              <p style={{ color: 'var(--text-muted)', fontSize: 'var(--text-sm)' }}>No inventory data.</p>
            </div>
          ) : (
            <div>
              {data.inventory_summary.map((item, idx) => {
                const maxQty = Math.max(...data.inventory_summary.map(i => i.total_quantity));
                const pct = maxQty > 0 ? (item.total_quantity / maxQty) * 100 : 0;
                const isLow = item.is_low;
                const isOut = item.total_quantity === 0;
                return (
                  <div
                    key={item.medicine_id}
                    style={{
                      padding: 'var(--sp-3) var(--sp-5)',
                      borderBottom: idx < data.inventory_summary.length - 1 ? '1px solid var(--border-light)' : 'none',
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--sp-1)' }}>
                      <span style={{ fontSize: 'var(--text-sm)', fontWeight: 500, color: 'var(--text-primary)' }}>{item.name}</span>
                      <span style={{
                        fontSize: 'var(--text-xs)', fontWeight: 600,
                        color: isOut ? 'var(--danger)' : isLow ? 'var(--warning)' : 'var(--success)',
                      }}>
                        {isOut ? 'OUT OF STOCK' : isLow ? 'LOW STOCK' : 'OK'}
                      </span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--sp-3)' }}>
                      <div style={{ flex: 1, height: '4px', background: 'var(--bg-muted)', borderRadius: 'var(--radius-pill)', overflow: 'hidden' }}>
                        <div style={{
                          width: `${pct}%`, height: '100%',
                          background: isOut ? 'var(--danger)' : isLow ? 'var(--warning)' : 'var(--success)',
                          borderRadius: 'var(--radius-pill)',
                          animation: 'progressGrow 600ms var(--ease) both',
                          transformOrigin: 'left',
                        }} />
                      </div>
                      <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)', flexShrink: 0 }}>
                        {item.total_quantity} units
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
