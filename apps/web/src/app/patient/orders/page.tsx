'use client';

import React, { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { ApiClient } from '../../../lib/api';
import { StatusBadge } from '../../../components/Badges';
import { LifecycleStepper, Step } from '../../../components/LifecycleStepper';
import { PageHeader } from '../../../components/PageHeader';
import { useToast } from '../../../components/Toast';
import {
  IconPackage,
  IconClock,
  IconAlertTriangle,
  IconCheckCircle,
  IconSearch,
  IconTruck,
  IconCapsule,
  IconChevronDown,
  IconCopy,
  IconShieldCheck,
  IconMapPin,
  IconRefreshCw,
} from '../../../components/Icons';
import { OrderSummary, OrderDetail, OrderLineItem } from '../../../lib/types';

const ORDER_STEPS: Step[] = [
  { id: 'placed', label: 'Order Placed', sublabel: 'Confirmed' },
  { id: 'processing', label: 'Processing', sublabel: 'Pharmacy Pack' },
  { id: 'dispatched', label: 'Dispatched', sublabel: 'On the way' },
  { id: 'delivered', label: 'Delivered', sublabel: 'Completed' },
];

type FilterTab = 'all' | 'active' | 'delivered' | 'cancelled';

export default function OrdersPage() {
  const { addToast } = useToast();
  const [orders, setOrders] = useState<OrderSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState<FilterTab>('all');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [detail, setDetail] = useState<OrderDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  useEffect(() => { loadOrders(); }, []);

  async function loadOrders() {
    setLoading(true);
    setError('');
    try {
      const res = await ApiClient.listOrders({ limit: 50 });
      setOrders(res.data || []);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Failed to load orders';
      setError(msg);
    } finally { setLoading(false); }
  }

  const toggleExpand = async (orderId: string) => {
    if (expandedId === orderId) {
      setExpandedId(null);
      setDetail(null);
      return;
    }
    setExpandedId(orderId);
    setDetailLoading(true);
    try {
      const res = await ApiClient.getOrder(orderId);
      setDetail(res);
    } catch {
      setDetail(null);
    } finally {
      setDetailLoading(false);
    }
  };

  const copyOrderId = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    navigator.clipboard.writeText(id);
    setCopiedId(id);
    addToast('info', 'Copied to Clipboard', `Order ID #${id.slice(0, 8)} copied.`);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const activeOrdersCount = useMemo(
    () => orders.filter((o) => ['placed', 'processing', 'dispatched'].includes(o.status)).length,
    [orders]
  );

  const deliveredOrdersCount = useMemo(
    () => orders.filter((o) => o.status === 'delivered').length,
    [orders]
  );

  const totalSpent = useMemo(
    () => orders.reduce((acc, o) => acc + (o.status !== 'cancelled' ? o.total_amount : 0), 0),
    [orders]
  );

  const filteredOrders = useMemo(() => {
    return orders.filter((ord) => {
      // Tab filter
      if (activeTab === 'active' && !['placed', 'processing', 'dispatched'].includes(ord.status)) return false;
      if (activeTab === 'delivered' && ord.status !== 'delivered') return false;
      if (activeTab === 'cancelled' && ord.status !== 'cancelled') return false;

      // Search filter
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const idMatch = ord.order_id.toLowerCase().includes(q);
        const dateMatch = new Date(ord.created_at).toLocaleDateString().toLowerCase().includes(q);
        return idMatch || dateMatch;
      }
      return true;
    });
  }, [orders, activeTab, searchQuery]);

  const paymentBadge = (s: string) => {
    const configs: Record<string, { label: string; bg: string; color: string; border: string }> = {
      captured: { label: 'Paid Online', bg: 'var(--success-bg)', color: 'var(--success)', border: 'var(--success-border)' },
      pending: { label: 'Payment Pending', bg: 'var(--warning-bg)', color: 'var(--warning)', border: 'var(--warning-border)' },
      refunded: { label: 'Refunded', bg: 'var(--info-bg)', color: 'var(--info)', border: 'var(--info-border)' },
      failed: { label: 'Payment Failed', bg: 'var(--danger-bg)', color: 'var(--danger)', border: 'var(--danger-border)' },
    };
    const c = configs[s] || { label: s, bg: 'var(--bg-muted)', color: 'var(--text-secondary)', border: 'var(--border)' };

    return (
      <span
        style={{
          fontSize: '11px',
          fontWeight: 650,
          padding: '2px 8px',
          borderRadius: 'var(--radius-pill)',
          backgroundColor: c.bg,
          color: c.color,
          border: `1px solid ${c.border}`,
          display: 'inline-flex',
          alignItems: 'center',
          gap: '4px',
        }}
      >
        {s === 'captured' ? <IconCheckCircle size={12} /> : <IconClock size={12} />}
        {c.label}
      </span>
    );
  };

  return (
    <div style={{ maxWidth: '960px', margin: '0 auto', padding: '0 var(--sp-4) var(--sp-12)', display: 'flex', flexDirection: 'column', gap: 'var(--sp-6)' }}>
      {/* Page Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 'var(--sp-4)' }}>
        <div>
          <h1 style={{ fontSize: 'var(--text-2xl)', fontWeight: 800, color: 'var(--text-heading)', letterSpacing: '-0.02em', marginBottom: 'var(--sp-1)' }}>
            My Orders
          </h1>
          <p style={{ fontSize: 'var(--text-sm)', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
            Track medicine delivery progress, review item invoices, and manage past orders.
          </p>
        </div>
        <div style={{ display: 'flex', gap: 'var(--sp-2)' }}>
          <button
            onClick={loadOrders}
            className="btn btn-secondary btn-sm"
            style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
            title="Refresh Orders"
          >
            <IconRefreshCw size={14} />
            <span>Refresh</span>
          </button>
          <Link
            href="/patient/catalog"
            className="btn btn-primary btn-sm"
            style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', textDecoration: 'none' }}
          >
            <IconCapsule size={14} />
            <span>Order Medicines</span>
          </Link>
        </div>
      </div>

      {/* KPI Stats Bar */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: 'var(--sp-4)',
        }}
      >
        <div
          className="card"
          style={{
            padding: 'var(--sp-4) var(--sp-5)',
            display: 'flex',
            alignItems: 'center',
            gap: 'var(--sp-4)',
            background: '#ffffff',
            border: '1px solid var(--border-light)',
          }}
        >
          <div
            style={{
              width: '42px',
              height: '42px',
              borderRadius: 'var(--radius-lg)',
              backgroundColor: 'var(--primary-light)',
              color: 'var(--primary)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
            }}
          >
            <IconPackage size={22} />
          </div>
          <div>
            <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              Total Orders
            </span>
            <div style={{ fontSize: 'var(--text-xl)', fontWeight: 800, color: 'var(--text-heading)' }}>
              {orders.length}
            </div>
          </div>
        </div>

        <div
          className="card"
          style={{
            padding: 'var(--sp-4) var(--sp-5)',
            display: 'flex',
            alignItems: 'center',
            gap: 'var(--sp-4)',
            background: '#ffffff',
            border: '1px solid var(--border-light)',
          }}
        >
          <div
            style={{
              width: '42px',
              height: '42px',
              borderRadius: 'var(--radius-lg)',
              backgroundColor: 'var(--warning-bg)',
              color: 'var(--warning)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
            }}
          >
            <IconTruck size={22} />
          </div>
          <div>
            <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              In Transit / Active
            </span>
            <div style={{ fontSize: 'var(--text-xl)', fontWeight: 800, color: 'var(--warning)' }}>
              {activeOrdersCount}
            </div>
          </div>
        </div>

        <div
          className="card"
          style={{
            padding: 'var(--sp-4) var(--sp-5)',
            display: 'flex',
            alignItems: 'center',
            gap: 'var(--sp-4)',
            background: '#ffffff',
            border: '1px solid var(--border-light)',
          }}
        >
          <div
            style={{
              width: '42px',
              height: '42px',
              borderRadius: 'var(--radius-lg)',
              backgroundColor: 'var(--success-bg)',
              color: 'var(--success)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
            }}
          >
            <IconCheckCircle size={22} />
          </div>
          <div>
            <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              Delivered
            </span>
            <div style={{ fontSize: 'var(--text-xl)', fontWeight: 800, color: 'var(--success)' }}>
              {deliveredOrdersCount}
            </div>
          </div>
        </div>

        <div
          className="card"
          style={{
            padding: 'var(--sp-4) var(--sp-5)',
            display: 'flex',
            alignItems: 'center',
            gap: 'var(--sp-4)',
            background: '#ffffff',
            border: '1px solid var(--border-light)',
          }}
        >
          <div
            style={{
              width: '42px',
              height: '42px',
              borderRadius: 'var(--radius-lg)',
              backgroundColor: 'rgba(11, 110, 107, 0.08)',
              color: 'var(--primary-dark)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
            }}
          >
            <span style={{ fontSize: '20px', fontWeight: 800 }}>₹</span>
          </div>
          <div>
            <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              Total Ordered
            </span>
            <div style={{ fontSize: 'var(--text-xl)', fontWeight: 800, color: 'var(--primary-dark)' }}>
              ₹{totalSpent.toFixed(2)}
            </div>
          </div>
        </div>
      </div>

      {/* Filter Tabs & Search Bar */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: 'var(--sp-3)',
          backgroundColor: '#ffffff',
          padding: 'var(--sp-3)',
          borderRadius: 'var(--radius-lg)',
          border: '1px solid var(--border-light)',
          boxShadow: '0 1px 3px rgba(15, 43, 60, 0.03)',
        }}
      >
        {/* Filter Pills */}
        <div style={{ display: 'flex', gap: 'var(--sp-1)', flexWrap: 'wrap' }}>
          {(
            [
              { id: 'all', label: 'All Orders', count: orders.length },
              { id: 'active', label: 'Active', count: activeOrdersCount },
              { id: 'delivered', label: 'Delivered', count: deliveredOrdersCount },
              { id: 'cancelled', label: 'Cancelled', count: orders.filter((o) => o.status === 'cancelled').length },
            ] as const
          ).map((tab) => {
            const isSelected = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                style={{
                  padding: '6px 12px',
                  borderRadius: 'var(--radius-pill)',
                  border: isSelected ? '1px solid var(--primary)' : '1px solid transparent',
                  background: isSelected ? 'var(--primary-light)' : 'transparent',
                  color: isSelected ? 'var(--primary)' : 'var(--text-secondary)',
                  fontSize: 'var(--text-xs)',
                  fontWeight: isSelected ? 700 : 500,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  transition: 'all 140ms ease',
                }}
              >
                <span>{tab.label}</span>
                <span
                  style={{
                    fontSize: '10px',
                    fontWeight: 700,
                    padding: '1px 6px',
                    borderRadius: 'var(--radius-pill)',
                    background: isSelected ? 'var(--primary)' : 'var(--bg-muted)',
                    color: isSelected ? '#ffffff' : 'var(--text-muted)',
                  }}
                >
                  {tab.count}
                </span>
              </button>
            );
          })}
        </div>

        {/* Search Box */}
        <div
          style={{
            position: 'relative',
            minWidth: '220px',
            flex: '1 1 200px',
            maxWidth: '300px',
          }}
        >
          <div
            style={{
              position: 'absolute',
              left: '10px',
              top: '50%',
              transform: 'translateY(-50%)',
              color: 'var(--text-muted)',
              display: 'flex',
              alignItems: 'center',
            }}
          >
            <IconSearch size={15} />
          </div>
          <input
            type="text"
            placeholder="Search by Order ID..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{
              width: '100%',
              padding: '6px 12px 6px 32px',
              fontSize: 'var(--text-xs)',
              borderRadius: 'var(--radius-md)',
              border: '1px solid var(--border)',
              backgroundColor: 'var(--bg-page)',
              color: 'var(--text-primary)',
              outline: 'none',
              transition: 'border-color 140ms ease',
            }}
          />
        </div>
      </div>

      {/* Orders List */}
      {loading ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--sp-4)' }}>
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="card"
              style={{
                padding: 'var(--sp-5)',
                display: 'flex',
                flexDirection: 'column',
                gap: 'var(--sp-4)',
                background: '#ffffff',
                border: '1px solid var(--border-light)',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <div className="skeleton" style={{ height: '24px', width: '220px', borderRadius: '4px' }} />
                <div className="skeleton" style={{ height: '24px', width: '80px', borderRadius: '4px' }} />
              </div>
              <div className="skeleton" style={{ height: '40px', width: '100%', borderRadius: '6px' }} />
            </div>
          ))}
        </div>
      ) : error ? (
        <div className="card" style={{ padding: 'var(--sp-8)', textAlign: 'center', backgroundColor: '#ffffff' }}>
          <IconAlertTriangle size={32} style={{ color: 'var(--danger)', margin: '0 auto var(--sp-3)' }} />
          <h3 style={{ fontSize: 'var(--text-base)', fontWeight: 700, color: 'var(--danger)', marginBottom: 'var(--sp-1)' }}>
            Error Loading Orders
          </h3>
          <p style={{ color: 'var(--text-secondary)', fontSize: 'var(--text-sm)', marginBottom: 'var(--sp-4)' }}>{error}</p>
          <button className="btn btn-secondary btn-sm" onClick={loadOrders}>
            Try Again
          </button>
        </div>
      ) : filteredOrders.length === 0 ? (
        <div
          className="card empty-state"
          style={{
            padding: 'var(--sp-12) var(--sp-6)',
            textAlign: 'center',
            backgroundColor: '#ffffff',
            border: '1px dashed var(--border)',
          }}
        >
          <div
            className="empty-state-icon"
            style={{
              width: '64px',
              height: '64px',
              borderRadius: '50%',
              backgroundColor: 'var(--primary-light)',
              color: 'var(--primary)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto var(--sp-4)',
            }}
          >
            <IconPackage size={32} />
          </div>
          <h3 style={{ fontSize: 'var(--text-lg)', fontWeight: 700, color: 'var(--text-heading)', marginBottom: 'var(--sp-1)' }}>
            {searchQuery || activeTab !== 'all' ? 'No matching orders found' : 'No orders yet'}
          </h3>
          <p style={{ fontSize: 'var(--text-sm)', color: 'var(--text-muted)', maxWidth: '420px', margin: '0 auto var(--sp-5)' }}>
            {searchQuery || activeTab !== 'all'
              ? 'Try adjusting your search query or switching filter tabs to see more orders.'
              : 'Browse our extensive catalog of verified prescription and OTC healthcare medicines.'}
          </p>
          {searchQuery || activeTab !== 'all' ? (
            <button
              className="btn btn-secondary btn-sm"
              onClick={() => {
                setSearchQuery('');
                setActiveTab('all');
              }}
            >
              Reset Filters
            </button>
          ) : (
            <Link href="/patient/catalog" className="btn btn-primary btn-sm" style={{ textDecoration: 'none' }}>
              Explore Medicine Catalog
            </Link>
          )}
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--sp-4)' }}>
          {filteredOrders.map((ord) => {
            const isExpanded = expandedId === ord.order_id;
            const isDelivered = ord.status === 'delivered';
            const isCancelled = ord.status === 'cancelled';

            return (
              <div
                key={ord.order_id}
                className="card"
                style={{
                  padding: 0,
                  overflow: 'hidden',
                  backgroundColor: '#ffffff',
                  border: isExpanded ? '1px solid var(--primary)' : '1px solid var(--border-light)',
                  boxShadow: isExpanded
                    ? '0 8px 24px rgba(11, 110, 107, 0.08)'
                    : '0 2px 8px rgba(15, 43, 60, 0.03)',
                  transition: 'all 180ms ease',
                  borderRadius: 'var(--radius-lg)',
                }}
              >
                {/* Card Top Banner: ID, Date, Status, Price */}
                <div
                  style={{
                    padding: 'var(--sp-4) var(--sp-6)',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    flexWrap: 'wrap',
                    gap: 'var(--sp-3)',
                    borderBottom: '1px solid var(--border-light)',
                    backgroundColor: isExpanded ? 'var(--primary-50)' : 'transparent',
                    transition: 'background-color 150ms ease',
                  }}
                >
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--sp-2)', flexWrap: 'wrap' }}>
                      <span style={{ fontWeight: 800, fontSize: 'var(--text-md)', color: 'var(--text-heading)' }}>
                        Order #{ord.order_id.slice(0, 8)}
                      </span>
                      <button
                        type="button"
                        onClick={(e) => copyOrderId(ord.order_id, e)}
                        style={{
                          background: 'none',
                          border: 'none',
                          cursor: 'pointer',
                          color: copiedId === ord.order_id ? 'var(--success)' : 'var(--text-muted)',
                          padding: '2px 4px',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '3px',
                          fontSize: '11px',
                          borderRadius: '4px',
                        }}
                        title="Copy full Order ID"
                      >
                        <IconCopy size={13} />
                        {copiedId === ord.order_id && <span style={{ fontWeight: 600 }}>Copied!</span>}
                      </button>
                      <StatusBadge status={ord.status} />
                      {paymentBadge(ord.payment_status)}
                    </div>
                    <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 'var(--sp-2)' }}>
                      <span>Placed on {new Date(ord.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
                      <span>·</span>
                      <span>{new Date(ord.created_at).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}</span>
                      <span>·</span>
                      <span style={{ fontWeight: 600, color: 'var(--text-secondary)' }}>{ord.items_count} item{ord.items_count !== 1 ? 's' : ''}</span>
                    </div>
                  </div>

                  {/* Price Tag */}
                  <div style={{ textAlign: 'right' }}>
                    <span style={{ fontSize: '11px', color: 'var(--text-muted)', display: 'block', textTransform: 'uppercase', letterSpacing: '0.04em', fontWeight: 600 }}>
                      Grand Total
                    </span>
                    <span className="tabular-nums" style={{ fontSize: 'var(--text-xl)', fontWeight: 850, color: 'var(--primary)' }}>
                      ₹{ord.total_amount.toFixed(2)}
                    </span>
                  </div>
                </div>

                {/* Delivery Lifecycle Stepper (Unless cancelled) */}
                {!isCancelled ? (
                  <div
                    style={{
                      padding: 'var(--sp-5) var(--sp-6) var(--sp-4)',
                      backgroundColor: '#FFFFFF',
                    }}
                  >
                    <LifecycleStepper steps={ORDER_STEPS} currentStepId={ord.status} isFailed={ord.status === 'cancelled'} />
                  </div>
                ) : (
                  <div
                    style={{
                      padding: 'var(--sp-4) var(--sp-6)',
                      backgroundColor: 'var(--danger-bg)',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 'var(--sp-3)',
                      color: 'var(--danger)',
                    }}
                  >
                    <IconAlertTriangle size={18} />
                    <span style={{ fontSize: 'var(--text-sm)', fontWeight: 600 }}>
                      This order has been cancelled and refunded to the original payment source.
                    </span>
                  </div>
                )}

                {/* Action Bar Footer */}
                <div
                  style={{
                    padding: 'var(--sp-3) var(--sp-6)',
                    backgroundColor: 'var(--bg-clinical)',
                    borderTop: '1px solid var(--border-light)',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    flexWrap: 'wrap',
                    gap: 'var(--sp-3)',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--sp-2)' }}>
                    <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-secondary)' }}>
                      {isDelivered
                        ? '✅ Order delivered successfully'
                        : isCancelled
                        ? '❌ Order cancelled'
                        : '🚚 Delivery estimated in 1-2 business days'}
                    </span>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--sp-2)' }}>
                    <button
                      type="button"
                      onClick={() => toggleExpand(ord.order_id)}
                      className="btn btn-secondary btn-sm"
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '6px',
                        fontWeight: 600,
                        backgroundColor: '#ffffff',
                      }}
                    >
                      <span>{isExpanded ? 'Hide Order Details' : 'View Order Receipt'}</span>
                      <IconChevronDown
                        size={14}
                        style={{
                          transform: isExpanded ? 'rotate(180deg)' : 'rotate(0deg)',
                          transition: 'transform 180ms ease',
                        }}
                      />
                    </button>
                  </div>
                </div>

                {/* Expanded Detailed Breakdown */}
                {isExpanded && (
                  <div
                    style={{
                      borderTop: '1px solid var(--border-light)',
                      padding: 'var(--sp-6)',
                      backgroundColor: '#FAFCFD',
                      animation: 'fadeIn 180ms ease',
                    }}
                  >
                    {detailLoading ? (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--sp-3)' }}>
                        <div className="skeleton" style={{ height: '36px', width: '100%', borderRadius: 'var(--radius-sm)' }} />
                        <div className="skeleton" style={{ height: '36px', width: '100%', borderRadius: 'var(--radius-sm)' }} />
                        <div className="skeleton" style={{ height: '80px', width: '100%', borderRadius: 'var(--radius-md)' }} />
                      </div>
                    ) : detail ? (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--sp-5)' }}>
                        {/* Ordered Items Table */}
                        <div>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--sp-3)' }}>
                            <h4 style={{ fontSize: 'var(--text-xs)', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', display: 'flex', alignItems: 'center', gap: '6px' }}>
                              <IconCapsule size={14} style={{ color: 'var(--primary)' }} />
                              Prescribed Items ({detail.line_items?.length || 0})
                            </h4>
                            <span style={{ fontSize: '11px', color: 'var(--success)', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '4px' }}>
                              <IconShieldCheck size={13} /> Verified Pharmacy Stock
                            </span>
                          </div>

                          <div
                            style={{
                              border: '1px solid var(--border-light)',
                              borderRadius: 'var(--radius-md)',
                              backgroundColor: '#ffffff',
                              overflow: 'hidden',
                            }}
                          >
                            {detail.line_items?.map((item: OrderLineItem, idx: number) => (
                              <div
                                key={item.line_item_id || idx}
                                style={{
                                  display: 'flex',
                                  justifyContent: 'space-between',
                                  alignItems: 'center',
                                  padding: 'var(--sp-3) var(--sp-4)',
                                  borderBottom: idx < detail.line_items.length - 1 ? '1px solid var(--border-light)' : 'none',
                                }}
                              >
                                <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--sp-3)' }}>
                                  <div
                                    style={{
                                      width: '32px',
                                      height: '32px',
                                      borderRadius: 'var(--radius-md)',
                                      backgroundColor: 'var(--primary-light)',
                                      color: 'var(--primary)',
                                      display: 'flex',
                                      alignItems: 'center',
                                      justifyContent: 'center',
                                    }}
                                  >
                                    <IconCapsule size={16} />
                                  </div>
                                  <div>
                                    <span style={{ fontWeight: 650, fontSize: 'var(--text-sm)', color: 'var(--text-primary)', display: 'block' }}>
                                      {item.medicine_name}
                                    </span>
                                    <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                                      ₹{item.unit_price.toFixed(2)} × {item.quantity} units
                                    </span>
                                  </div>
                                </div>
                                <div style={{ textAlign: 'right' }}>
                                  <span className="tabular-nums" style={{ fontWeight: 700, fontSize: 'var(--text-sm)', color: 'var(--text-heading)' }}>
                                    ₹{item.total_price.toFixed(2)}
                                  </span>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>

                        {/* Summary Details Grid: Address + Cost Breakdown */}
                        <div
                          style={{
                            display: 'grid',
                            gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
                            gap: 'var(--sp-4)',
                          }}
                        >
                          {/* Delivery Address & Details */}
                          <div
                            style={{
                              backgroundColor: '#ffffff',
                              borderRadius: 'var(--radius-md)',
                              padding: 'var(--sp-4)',
                              border: '1px solid var(--border-light)',
                            }}
                          >
                            <h4 style={{ fontSize: 'var(--text-xs)', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 'var(--sp-3)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                              <IconMapPin size={14} style={{ color: 'var(--primary)' }} />
                              Shipping &amp; Delivery Address
                            </h4>
                            <div style={{ fontSize: 'var(--text-sm)', color: 'var(--text-primary)', lineHeight: 1.6 }}>
                              <p style={{ fontWeight: 650, color: 'var(--text-heading)', marginBottom: '2px' }}>Home Delivery</p>
                              <p style={{ color: 'var(--text-secondary)', fontSize: 'var(--text-xs)' }}>
                                Standard Contactless Delivery to registered address on file.
                              </p>
                            </div>
                            <div style={{ marginTop: 'var(--sp-3)', paddingTop: 'var(--sp-3)', borderTop: '1px solid var(--border-light)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                              <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>Courier Partner</span>
                              <span style={{ fontSize: 'var(--text-xs)', fontWeight: 650, color: 'var(--primary)' }}>IPMD Express Healthcare Logistics</span>
                            </div>
                          </div>

                          {/* Price & Billing Summary */}
                          <div
                            style={{
                              backgroundColor: '#ffffff',
                              borderRadius: 'var(--radius-md)',
                              padding: 'var(--sp-4)',
                              border: '1px solid var(--border-light)',
                            }}
                          >
                            <h4 style={{ fontSize: 'var(--text-xs)', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 'var(--sp-3)' }}>
                              Payment Breakdown
                            </h4>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 'var(--text-xs)', color: 'var(--text-secondary)' }}>
                                <span>Items Subtotal</span>
                                <span className="tabular-nums">₹{detail.total_amount.toFixed(2)}</span>
                              </div>
                              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 'var(--text-xs)', color: 'var(--text-secondary)' }}>
                                <span>Packaging &amp; Handling</span>
                                <span style={{ color: 'var(--success)', fontWeight: 600 }}>Free</span>
                              </div>
                              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 'var(--text-xs)', color: 'var(--text-secondary)' }}>
                                <span>Delivery Charges</span>
                                <span style={{ color: 'var(--success)', fontWeight: 600 }}>Free</span>
                              </div>
                              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 'var(--text-xs)', color: 'var(--text-secondary)' }}>
                                <span>Taxes &amp; GST</span>
                                <span className="tabular-nums">₹0.00</span>
                              </div>
                              <div
                                style={{
                                  display: 'flex',
                                  justifyContent: 'space-between',
                                  alignItems: 'center',
                                  fontWeight: 800,
                                  fontSize: 'var(--text-md)',
                                  paddingTop: 'var(--sp-2)',
                                  marginTop: 'var(--sp-1)',
                                  borderTop: '1px solid var(--border-light)',
                                  color: 'var(--text-heading)',
                                }}
                              >
                                <span>Total Paid</span>
                                <span className="tabular-nums" style={{ color: 'var(--primary)' }}>₹{detail.total_amount.toFixed(2)}</span>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <p style={{ fontSize: 'var(--text-sm)', color: 'var(--text-muted)', textAlign: 'center', padding: 'var(--sp-4)' }}>
                        Could not load order details at this moment.
                      </p>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

