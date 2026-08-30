'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useAuth } from '../../lib/auth-context';
import { ApiClient } from '../../lib/api';
import { StatusBadge } from '../../components/Badges';
import { Avatar } from '../../components/Avatar';
import { IconUpload, IconSparkles, IconShoppingCart, IconFileText, IconClock, IconChevronRight, IconHeartbeat, IconActivity, IconPrescription } from '../../components/Icons';
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

  useEffect(() => {
    async function load() {
      try {
        const rxRes = await ApiClient.listPrescriptions({ limit: 5 });
        setPrescriptions(rxRes.data || []);
      } catch {} finally {
        setLoadingRx(false);
      }
      try {
        const ordRes = await ApiClient.listOrders({ limit: 5 });
        setOrders(ordRes.data || []);
      } catch {} finally {
        setLoadingOrders(false);
      }
    }
    load();
  }, []);

  const activeOrders = orders.filter(o => o.status !== 'delivered' && o.status !== 'cancelled');
  const rxCount = prescriptions.length;
  const orderCount = orders.length;

  return (
    <div style={{ maxWidth: '1100px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 'var(--sp-6)' }}>
      {/* Welcome Banner */}
      <div style={{
        background: 'linear-gradient(135deg, #0B6E6B 0%, #095A58 50%, #0F2B3C 100%)',
        borderRadius: 'var(--radius-xl)',
        padding: 'var(--sp-8) var(--sp-10)',
        color: '#fff',
        position: 'relative',
        overflow: 'hidden',
      }}>
        <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(circle at 80% 30%, rgba(20, 163, 199, 0.15) 0%, transparent 50%)' }} />
        <div style={{ position: 'absolute', top: '10%', right: '8%', fontSize: '140px', fontWeight: 200, color: 'rgba(255,255,255,0.04)', lineHeight: 1 }}>+</div>
        <div style={{ position: 'relative', zIndex: 1, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 'var(--sp-4)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--sp-5)' }}>
            <Avatar name={user?.full_name || 'Patient'} size="lg" />
            <div>
              <h1 style={{ fontSize: 'var(--text-2xl)', fontWeight: 800, letterSpacing: '-0.02em', marginBottom: 'var(--sp-1)' }}>
                Welcome back, {firstName}
              </h1>
              <p style={{ fontSize: 'var(--text-sm)', color: 'rgba(255,255,255,0.7)', lineHeight: 1.6 }}>
                Manage your prescriptions, diagnostic reports, and medicine deliveries.
              </p>
            </div>
          </div>
          <div style={{ display: 'flex', gap: 'var(--sp-3)', flexWrap: 'wrap' }}>
            <Link href="/patient/upload" style={{
              padding: 'var(--sp-3) var(--sp-5)',
              borderRadius: 'var(--radius-md)',
              background: 'rgba(255,255,255,0.15)',
              backdropFilter: 'blur(8px)',
              border: '1px solid rgba(255,255,255,0.2)',
              color: '#fff',
              fontWeight: 600,
              fontSize: 'var(--text-sm)',
              textDecoration: 'none',
              display: 'flex', alignItems: 'center', gap: 'var(--sp-2)',
              transition: 'all 200ms',
            }}>
              <IconUpload size={16} /> Upload Prescription
            </Link>
            <Link href="/patient/chat" style={{
              padding: 'var(--sp-3) var(--sp-5)',
              borderRadius: 'var(--radius-md)',
              background: 'var(--primary)',
              color: '#fff',
              fontWeight: 600,
              fontSize: 'var(--text-sm)',
              textDecoration: 'none',
              display: 'flex', alignItems: 'center', gap: 'var(--sp-2)',
              boxShadow: '0 2px 8px rgba(0,0,0,0.2)',
              transition: 'all 200ms',
            }}>
              <IconSparkles size={16} /> AI Assistant
            </Link>
          </div>
        </div>
      </div>

      {/* KPI Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 'var(--sp-4)' }}
        className="kpi-grid"
      >
        {[
          { label: 'Prescriptions', value: rxCount, icon: <IconPrescription size={20} />, color: 'var(--primary)', bg: 'var(--primary-light)' },
          { label: 'Active Orders', value: activeOrders.length, icon: <IconActivity size={20} />, color: 'var(--blue)', bg: 'var(--blue-light)' },
          { label: 'Total Orders', value: orderCount, icon: <IconShoppingCart size={20} />, color: 'var(--navy)', bg: 'var(--navy-light)' },
          { label: 'Health Score', value: '—', icon: <IconHeartbeat size={20} />, color: 'var(--cyan)', bg: 'var(--cyan-light)' },
        ].map((kpi, i) => (
          <div key={i} className="medical-card-glass" style={{
            padding: 'var(--sp-5)',
            borderRadius: 'var(--radius-lg)',
            background: 'var(--bg-surface)',
            border: '1px solid var(--border)',
            display: 'flex', flexDirection: 'column', gap: 'var(--sp-3)',
            position: 'relative', overflow: 'hidden',
          }}>
            <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '3px', background: kpi.color, borderRadius: '3px 3px 0 0' }} />
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div>
                <p style={{ fontSize: 'var(--text-xs)', color: 'var(--text-secondary)', fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{kpi.label}</p>
                <p style={{ fontSize: 'var(--text-2xl)', fontWeight: 800, color: 'var(--text-heading)', letterSpacing: '-0.02em', marginTop: 'var(--sp-1)' }}>{kpi.value}</p>
              </div>
              <div style={{ width: '40px', height: '40px', borderRadius: 'var(--radius-md)', background: kpi.bg, color: kpi.color, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                {kpi.icon}
              </div>
            </div>
          </div>
        ))}
      </div>

      <style>{`
        @media (max-width: 768px) {
          .kpi-grid { grid-template-columns: 1fr 1fr !important; }
        }
      `}</style>

      {/* Action Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--sp-4)' }}>
        <Link href="/patient/upload" style={{ textDecoration: 'none' }}>
          <div className="medical-card-glass" style={{
            padding: 'var(--sp-6)',
            borderRadius: 'var(--radius-lg)',
            border: '1px solid var(--border)',
            background: 'var(--bg-surface)',
            display: 'flex', flexDirection: 'column', gap: 'var(--sp-3)',
            transition: 'all 200ms', cursor: 'pointer',
            position: 'relative', overflow: 'hidden',
          }}
            onMouseEnter={(e) => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = 'var(--shadow-md)'; }}
            onMouseLeave={(e) => { e.currentTarget.style.transform = ''; e.currentTarget.style.boxShadow = ''; }}
          >
            <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '3px', background: 'linear-gradient(90deg, var(--primary), var(--cyan))' }} />
            <div style={{ width: '48px', height: '48px', borderRadius: 'var(--radius-lg)', background: 'var(--primary-light)', color: 'var(--primary)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <IconUpload size={22} />
            </div>
            <h2 style={{ fontSize: 'var(--text-lg)', fontWeight: 700, color: 'var(--text-heading)', lineHeight: 1.3 }}>Upload Prescription</h2>
            <p style={{ fontSize: 'var(--text-sm)', color: 'var(--text-secondary)', lineHeight: 1.5 }}>AI OCR extracts medicine names, dosages, and lab markers in seconds.</p>
            <div style={{ marginTop: 'var(--sp-2)', display: 'flex', alignItems: 'center', gap: 'var(--sp-1)', color: 'var(--primary)', fontWeight: 600, fontSize: 'var(--text-sm)' }}>
              Get Started <IconChevronRight size={14} />
            </div>
          </div>
        </Link>
        <Link href="/patient/chat" style={{ textDecoration: 'none' }}>
          <div className="medical-card-glass" style={{
            padding: 'var(--sp-6)',
            borderRadius: 'var(--radius-lg)',
            border: '1px solid var(--border)',
            background: 'var(--bg-surface)',
            display: 'flex', flexDirection: 'column', gap: 'var(--sp-3)',
            transition: 'all 200ms', cursor: 'pointer',
            position: 'relative', overflow: 'hidden',
          }}
            onMouseEnter={(e) => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = 'var(--shadow-md)'; }}
            onMouseLeave={(e) => { e.currentTarget.style.transform = ''; e.currentTarget.style.boxShadow = ''; }}
          >
            <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '3px', background: 'linear-gradient(90deg, var(--blue), var(--cyan))' }} />
            <div style={{ width: '48px', height: '48px', borderRadius: 'var(--radius-lg)', background: 'var(--blue-light)', color: 'var(--blue)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <IconSparkles size={22} />
            </div>
            <h2 style={{ fontSize: 'var(--text-lg)', fontWeight: 700, color: 'var(--text-heading)', lineHeight: 1.3 }}>AI Health Assistant</h2>
            <p style={{ fontSize: 'var(--text-sm)', color: 'var(--text-secondary)', lineHeight: 1.5 }}>Get plain-language explanations of medications and wellness guidance.</p>
            <div style={{ marginTop: 'var(--sp-2)', display: 'flex', alignItems: 'center', gap: 'var(--sp-1)', color: 'var(--blue)', fontWeight: 600, fontSize: 'var(--text-sm)' }}>
              Start Conversation <IconChevronRight size={14} />
            </div>
          </div>
        </Link>
      </div>

      {/* Quick Nav */}
      <div style={{ display: 'flex', gap: 'var(--sp-3)', flexWrap: 'wrap' }}>
        {[
          { href: '/patient/catalog', label: 'Browse Catalog', icon: <IconShoppingCart size={16} /> },
          { href: '/patient/orders', label: 'My Orders', icon: <IconClock size={16} /> },
          { href: '/patient/cart', label: 'View Cart', icon: <IconShoppingCart size={16} /> },
        ].map((link) => (
          <Link key={link.href} href={link.href} style={{
            display: 'inline-flex', alignItems: 'center', gap: 'var(--sp-2)',
            padding: 'var(--sp-2) var(--sp-4)',
            borderRadius: 'var(--radius-md)',
            border: '1px solid var(--border)',
            background: 'var(--bg-surface)',
            color: 'var(--text-primary)',
            fontSize: 'var(--text-sm)',
            fontWeight: 500,
            textDecoration: 'none',
            transition: 'all 150ms',
          }}
            onMouseEnter={(e) => { e.currentTarget.style.borderColor = 'var(--primary)'; e.currentTarget.style.color = 'var(--primary)'; }}
            onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.color = 'var(--text-primary)'; }}
          >
            {link.icon} {link.label}
          </Link>
        ))}
      </div>

      {/* Active Orders */}
      <section>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--sp-4)' }}>
          <h2 style={{ fontSize: 'var(--text-lg)', fontWeight: 700, color: 'var(--text-heading)', display: 'flex', alignItems: 'center', gap: 'var(--sp-2)' }}>
            <IconActivity size={20} style={{ color: 'var(--primary)' }} /> Active Orders
          </h2>
          <Link href="/patient/orders" style={{ fontSize: 'var(--text-sm)', color: 'var(--primary)', fontWeight: 600, textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 'var(--sp-1)' }}>
            View History <IconChevronRight size={14} />
          </Link>
        </div>
        {loadingOrders ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--sp-3)' }}>
            {[1, 2].map(i => <div key={i} className="skeleton" style={{ height: '100px', borderRadius: 'var(--radius-lg)' }} />)}
          </div>
        ) : activeOrders.length === 0 ? (
          <div className="medical-card-glass" style={{ padding: 'var(--sp-8)', textAlign: 'center', borderRadius: 'var(--radius-lg)' }}>
            <IconClock size={28} style={{ color: 'var(--text-muted)', margin: '0 auto var(--sp-3)' }} />
            <h3 style={{ fontSize: 'var(--text-md)', fontWeight: 600, color: 'var(--text-heading)', marginBottom: 'var(--sp-1)' }}>No active orders</h3>
            <p style={{ fontSize: 'var(--text-sm)', color: 'var(--text-muted)' }}>Your order history will appear here once you place an order.</p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--sp-3)' }}>
            {activeOrders.map((ord) => {
              const stepIdx = getStepIndex(ord.status);
              return (
                <div key={ord.order_id} className="medical-card-glass" style={{
                  padding: 'var(--sp-5)',
                  borderRadius: 'var(--radius-lg)',
                  border: '1px solid var(--border)',
                  background: 'var(--bg-surface)',
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 'var(--sp-4)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--sp-3)' }}>
                      <div style={{ width: '44px', height: '44px', borderRadius: 'var(--radius-md)', background: 'var(--primary-light)', color: 'var(--primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: 'var(--text-sm)', flexShrink: 0 }}>
                        #{ord.order_id.slice(0, 4)}
                      </div>
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--sp-2)', marginBottom: '2px' }}>
                          <span style={{ fontWeight: 600, fontSize: 'var(--text-md)' }}>Order #{ord.order_id.slice(0, 8)}</span>
                          <StatusBadge status={ord.status} />
                        </div>
                        <p style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>{ord.items_count} items · {formatAmount(ord.total_amount)} · Payment: {ord.payment_status}</p>
                      </div>
                    </div>
                    <Link href="/patient/orders" style={{
                      padding: 'var(--sp-2) var(--sp-3)',
                      borderRadius: 'var(--radius-md)',
                      border: '1px solid var(--border)',
                      background: 'var(--bg-surface)',
                      color: 'var(--text-primary)',
                      fontSize: 'var(--text-xs)',
                      fontWeight: 600,
                      textDecoration: 'none',
                    }}>Track</Link>
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

      {/* Recent Prescriptions */}
      <section>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--sp-4)' }}>
          <h2 style={{ fontSize: 'var(--text-lg)', fontWeight: 700, color: 'var(--text-heading)', display: 'flex', alignItems: 'center', gap: 'var(--sp-2)' }}>
            <IconPrescription size={20} style={{ color: 'var(--primary)' }} /> Recent Prescriptions
          </h2>
          <Link href="/patient/upload" style={{ fontSize: 'var(--text-sm)', color: 'var(--primary)', fontWeight: 600, textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 'var(--sp-1)' }}>
            Upload New <IconChevronRight size={14} />
          </Link>
        </div>
        {loadingRx ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--sp-3)' }}>
            {[1, 2].map(i => <div key={i} className="skeleton" style={{ height: '64px', borderRadius: 'var(--radius-lg)' }} />)}
          </div>
        ) : prescriptions.length === 0 ? (
          <div className="medical-card-glass" style={{ padding: 'var(--sp-8)', textAlign: 'center', borderRadius: 'var(--radius-lg)' }}>
            <IconFileText size={28} style={{ color: 'var(--text-muted)', margin: '0 auto var(--sp-3)' }} />
            <h3 style={{ fontSize: 'var(--text-md)', fontWeight: 600, color: 'var(--text-heading)', marginBottom: 'var(--sp-1)' }}>No prescriptions yet</h3>
            <p style={{ fontSize: 'var(--text-sm)', color: 'var(--text-muted)', marginBottom: 'var(--sp-4)' }}>Upload your first prescription to get started.</p>
            <Link href="/patient/upload" style={{
              display: 'inline-flex', alignItems: 'center', gap: 'var(--sp-2)',
              padding: 'var(--sp-3) var(--sp-5)',
              borderRadius: 'var(--radius-md)',
              background: 'var(--primary)',
              color: '#fff',
              fontWeight: 600,
              fontSize: 'var(--text-sm)',
              textDecoration: 'none',
            }}>Upload Prescription</Link>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--sp-3)' }}>
            {prescriptions.map((rx) => (
              <Link key={rx.prescription_id} href={`/patient/prescriptions/${rx.prescription_id}`} style={{ textDecoration: 'none' }}>
                <div className="medical-card-glass" style={{
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                  padding: 'var(--sp-4) var(--sp-5)',
                  borderRadius: 'var(--radius-lg)',
                  border: '1px solid var(--border)',
                  background: 'var(--bg-surface)',
                  transition: 'all 200ms', cursor: 'pointer',
                }}
                  onMouseEnter={(e) => { e.currentTarget.style.borderColor = 'var(--primary)'; e.currentTarget.style.transform = 'translateY(-1px)'; }}
                  onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.transform = ''; }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--sp-4)' }}>
                    <div style={{ width: '44px', height: '44px', borderRadius: 'var(--radius-md)', background: 'var(--primary-light)', color: 'var(--primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      <IconFileText size={20} />
                    </div>
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--sp-2)', marginBottom: '2px' }}>
                        <span style={{ fontWeight: 600, fontSize: 'var(--text-md)', color: 'var(--text-primary)' }}>Prescription #{rx.prescription_id.slice(0, 8)}</span>
                        <StatusBadge status={rx.verification_status} />
                      </div>
                      <p style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>Extraction: {rx.extraction_status} · {timeAgo(rx.created_at)}</p>
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
