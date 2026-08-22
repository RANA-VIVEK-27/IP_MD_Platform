'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useAuth } from '../../lib/auth-context';
import { ApiClient } from '../../lib/api';
import { StatusBadge } from '../../components/Badges';
import { Avatar } from '../../components/Avatar';
import { IconUpload, IconSparkles, IconShoppingCart, IconFileText, IconClock, IconChevronRight } from '../../components/Icons';
import { PrescriptionSummary, OrderSummary } from '../../lib/types';

const ORDER_STEPS = ['placed', 'processing', 'dispatched', 'delivered'];

function getStepIndex(status: string): number {
  const idx = ORDER_STEPS.indexOf(status);
  return idx >= 0 ? idx : 0;
}

function formatAmount(paise: number): string {
  return `₹${(paise / 100).toFixed(2)}`;
}

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
}

export default function PatientHomePage() {
  const { user } = useAuth();
  const firstName = user?.full_name?.split(' ')[0] || 'Patient';

  const [prescriptions, setPrescriptions] = useState<PrescriptionSummary[]>([]);
  const [orders, setOrders] = useState<OrderSummary[]>([]);
  const [loadingRx, setLoadingRx] = useState(true);
  const [loadingOrders, setLoadingOrders] = useState(true);
  const [errorRx, setErrorRx] = useState('');
  const [errorOrders, setErrorOrders] = useState('');

  useEffect(() => {
    async function load() {
      try {
        const rxRes = await ApiClient.listPrescriptions({ limit: 5 });
        setPrescriptions(rxRes.data || []);
      } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : 'Failed to load prescriptions';
        setErrorRx(msg);
      } finally {
        setLoadingRx(false);
      }

      try {
        const ordRes = await ApiClient.listOrders({ limit: 5 });
        setOrders(ordRes.data || []);
      } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : 'Failed to load orders';
        setErrorOrders(msg);
      } finally {
        setLoadingOrders(false);
      }
    }
    load();
  }, []);

  const activeOrders = orders.filter(o => o.status !== 'delivered' && o.status !== 'cancelled');

  return (
    <div style={{ maxWidth: '1000px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 'var(--sp-6)' }}>
      <div className="page-header">
        <div className="page-header-row">
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--sp-4)' }}>
            <Avatar name={user?.full_name || 'Patient'} size="lg" />
            <div>
              <h1>Welcome back, {firstName}</h1>
              <p className="page-subtitle">Manage your prescriptions, diagnostic reports, and medicine deliveries.</p>
            </div>
          </div>
        </div>
      </div>

      <div className="grid-2 animate-fade-in-up delay-1">
        <Link href="/patient/upload" style={{ textDecoration: 'none' }}>
          <div className="card card-interactive" style={{ background: 'linear-gradient(135deg, var(--primary-light) 0%, var(--bg-soft) 100%)', color: 'var(--text-primary)', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', minHeight: '180px', padding: 'var(--sp-6)', border: '1px solid var(--border)' }}>
            <div>
              <div style={{ display: 'inline-flex', padding: 'var(--sp-3)', background: 'var(--bg-surface)', borderRadius: 'var(--radius-lg)', marginBottom: 'var(--sp-3)', color: 'var(--primary)', boxShadow: 'var(--shadow-xs)' }}>
                <IconUpload size={22} />
              </div>
              <h2 style={{ fontSize: 'var(--text-lg)', fontWeight: 600, color: 'var(--text-heading)', marginBottom: 'var(--sp-1)', lineHeight: 1.4 }}>Upload Prescription</h2>
              <p style={{ fontSize: 'var(--text-sm)', color: 'var(--text-secondary)', lineHeight: 1.5 }}>AI OCR extracts medicine names, dosages, and lab markers in seconds.</p>
            </div>
            <div className="btn btn-primary btn-sm" style={{ alignSelf: 'flex-start', marginTop: 'var(--sp-4)' }}>Upload Document<IconChevronRight size={14} /></div>
          </div>
        </Link>
        <Link href="/patient/chat" style={{ textDecoration: 'none' }}>
          <div className="card card-interactive" style={{ background: 'linear-gradient(135deg, var(--blue-light) 0%, var(--bg-page) 100%)', color: 'var(--text-primary)', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', minHeight: '180px', padding: 'var(--sp-6)', border: '1px solid var(--border)' }}>
            <div>
              <div style={{ display: 'inline-flex', padding: 'var(--sp-3)', background: 'var(--bg-surface)', borderRadius: 'var(--radius-lg)', marginBottom: 'var(--sp-3)', color: 'var(--blue)', boxShadow: 'var(--shadow-xs)' }}>
                <IconSparkles size={22} />
              </div>
              <h2 style={{ fontSize: 'var(--text-lg)', fontWeight: 600, color: 'var(--text-heading)', marginBottom: 'var(--sp-1)', lineHeight: 1.4 }}>AI Health Assistant</h2>
              <p style={{ fontSize: 'var(--text-sm)', color: 'var(--text-secondary)', lineHeight: 1.5 }}>Get plain-language explanations of medications and wellness guidance.</p>
            </div>
            <div className="btn btn-secondary btn-sm" style={{ alignSelf: 'flex-start', marginTop: 'var(--sp-4)' }}>Start Conversation<IconChevronRight size={14} /></div>
          </div>
        </Link>
      </div>

      <div style={{ display: 'flex', gap: 'var(--sp-3)', flexWrap: 'wrap' }}>
        <Link href="/patient/catalog" className="btn btn-secondary"><IconShoppingCart size={16} />Browse Catalog</Link>
        <Link href="/patient/orders" className="btn btn-secondary"><IconClock size={16} />My Orders</Link>
        <Link href="/patient/cart" className="btn btn-secondary"><IconShoppingCart size={16} />View Cart</Link>
      </div>

      <section>
        <div className="card-header" style={{ marginBottom: 'var(--sp-4)' }}>
          <h2 className="text-h2">Active Orders</h2>
          <Link href="/patient/orders" className="btn btn-ghost btn-sm">View History<IconChevronRight size={14} /></Link>
        </div>
        {loadingOrders ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--sp-3)' }}>
            {[1, 2].map(i => <div key={i} className="skeleton" style={{ height: '100px', borderRadius: 'var(--radius-lg)' }} />)}
          </div>
        ) : errorOrders ? (
          <div className="card" style={{ padding: 'var(--sp-5)', textAlign: 'center', color: 'var(--text-muted)' }}>{errorOrders}</div>
        ) : activeOrders.length === 0 ? (
          <div className="empty-state" style={{ padding: 'var(--sp-8)' }}>
            <div className="empty-state-icon"><IconClock size={28} /></div>
            <h3>No active orders</h3>
            <p>Your order history will appear here once you place an order.</p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--sp-3)' }}>
            {activeOrders.map((ord) => {
              const stepIdx = getStepIndex(ord.status);
              return (
                <div key={ord.order_id} className="card" style={{ padding: 'var(--sp-5)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 'var(--sp-4)' }}>
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--sp-2)', marginBottom: 'var(--sp-1)' }}>
                        <span style={{ fontWeight: 600, fontSize: 'var(--text-md)' }}>Order #{ord.order_id.slice(0, 8)}</span>
                        <StatusBadge status={ord.status} />
                      </div>
                      <p className="text-caption">{ord.items_count} items · {formatAmount(ord.total_amount)}</p>
                      <p className="text-caption" style={{ marginTop: 'var(--sp-1)' }}>Payment: {ord.payment_status}</p>
                    </div>
                    <Link href="/patient/orders" className="btn btn-secondary btn-sm">Track</Link>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--sp-2)' }}>
                    {ORDER_STEPS.map((step, idx) => (
                      <React.Fragment key={step}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--sp-1)' }}>
                          <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: idx <= stepIdx ? 'var(--primary)' : 'var(--border)' }} />
                          <span style={{ fontSize: 'var(--text-xs)', fontWeight: idx <= stepIdx ? 600 : 400, color: idx <= stepIdx ? 'var(--primary)' : 'var(--text-muted)' }}>
                            {step.charAt(0).toUpperCase() + step.slice(1)}
                          </span>
                        </div>
                        {idx < ORDER_STEPS.length - 1 && (
                          <div style={{ flex: 1, height: '2px', background: idx < stepIdx ? 'var(--primary)' : 'var(--border)', borderRadius: 'var(--radius-pill)', minWidth: '16px' }} />
                        )}
                      </React.Fragment>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      <section>
        <div className="card-header" style={{ marginBottom: 'var(--sp-4)' }}>
          <h2 className="text-h2">Recent Prescriptions</h2>
          <Link href="/patient/upload" className="btn btn-ghost btn-sm">Upload New<IconChevronRight size={14} /></Link>
        </div>
        {loadingRx ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--sp-3)' }}>
            {[1, 2].map(i => <div key={i} className="skeleton" style={{ height: '64px', borderRadius: 'var(--radius-lg)' }} />)}
          </div>
        ) : errorRx ? (
          <div className="card" style={{ padding: 'var(--sp-5)', textAlign: 'center', color: 'var(--text-muted)' }}>{errorRx}</div>
        ) : prescriptions.length === 0 ? (
          <div className="empty-state" style={{ padding: 'var(--sp-8)' }}>
            <div className="empty-state-icon"><IconFileText size={28} /></div>
            <h3>No prescriptions yet</h3>
            <p>Upload your first prescription to get started.</p>
            <Link href="/patient/upload" className="btn btn-primary">Upload Prescription</Link>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--sp-3)' }}>
            {prescriptions.map((rx) => (
              <Link key={rx.prescription_id} href={`/patient/prescriptions/${rx.prescription_id}`} style={{ textDecoration: 'none' }}>
                <div className="card card-interactive" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: 'var(--sp-4) var(--sp-5)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--sp-4)' }}>
                    <div style={{ width: '44px', height: '44px', borderRadius: 'var(--radius-md)', background: 'var(--primary-light)', color: 'var(--primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      <IconFileText size={20} />
                    </div>
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--sp-2)', marginBottom: 'var(--sp-1)' }}>
                        <span style={{ fontWeight: 600, fontSize: 'var(--text-md)', color: 'var(--text-primary)' }}>Prescription #{rx.prescription_id.slice(0, 8)}</span>
                        <StatusBadge status={rx.verification_status} />
                      </div>
                      <p className="text-caption">Extraction: {rx.extraction_status} · {timeAgo(rx.created_at)}</p>
                    </div>
                  </div>
                  <IconChevronRight size={16} style={{ color: 'var(--text-muted)', flexShrink: 0 }} />
                </div>
              </Link>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
