'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { ApiClient, ApiError } from '../../lib/api';
import { PageHeader } from '../../components/PageHeader';
import { Avatar } from '../../components/Avatar';
import { IconShieldCheck, IconAlertTriangle, IconSearch, IconClock, IconActivity, IconFileText, IconPrescription } from '../../components/Icons';
import { VerificationQueueItem } from '../../lib/types';

export default function DoctorQueuePage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('pending_review');
  const [queueItems, setQueueItems] = useState<VerificationQueueItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => { loadQueue(); }, [statusFilter]);

  async function loadQueue() {
    setLoading(true);
    setError('');
    try {
      const params: Record<string, string | number> = { limit: 50 };
      if (statusFilter !== 'all') params.status = statusFilter;
      const res = await ApiClient.getVerificationQueue(params);
      setQueueItems(res.data || []);
    } catch (e: unknown) {
      const msg = e instanceof ApiError ? e.message : 'Failed to load queue';
      setError(msg);
    } finally {
      setLoading(false);
    }
  }

  const filtered = queueItems.filter((item) => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return item.prescription_id.toLowerCase().includes(q) || item.patient_ref.toLowerCase().includes(q);
  });

  const slaUrgent = queueItems.filter(i => i.sla_breach).length;
  const pendingCount = queueItems.filter(i => i.verification_status === 'pending_review').length;
  const verifiedCount = queueItems.filter(i => i.verification_status === 'doctor_verified').length;

  return (
    <div style={{ maxWidth: '1100px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 'var(--sp-6)' }}>
      {/* Header Banner */}
      <div style={{
        background: 'linear-gradient(135deg, #0F2B3C 0%, #0B6E6B 60%, #14A3C7 100%)',
        borderRadius: 'var(--radius-xl)',
        padding: 'var(--sp-8) var(--sp-10)',
        color: '#fff',
        position: 'relative',
        overflow: 'hidden',
      }}>
        <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(circle at 70% 40%, rgba(20, 163, 199, 0.2) 0%, transparent 50%)' }} />
        <div style={{ position: 'absolute', top: '8%', right: '6%', fontSize: '120px', fontWeight: 200, color: 'rgba(255,255,255,0.04)', lineHeight: 1 }}>+</div>
        <div style={{ position: 'relative', zIndex: 1, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 'var(--sp-4)' }}>
          <div>
            <h1 style={{ fontSize: 'var(--text-2xl)', fontWeight: 800, letterSpacing: '-0.02em', marginBottom: 'var(--sp-1)' }}>
              Verification Queue
            </h1>
            <p style={{ fontSize: 'var(--text-sm)', color: 'rgba(255,255,255,0.7)', lineHeight: 1.6 }}>
              Review and clinically verify AI-extracted prescriptions within the 12-hour SLA.
            </p>
          </div>
          <div style={{ display: 'flex', gap: 'var(--sp-3)', flexWrap: 'wrap' }}>
            {slaUrgent > 0 && (
              <div style={{
                display: 'flex', alignItems: 'center', gap: 'var(--sp-2)',
                padding: 'var(--sp-2) var(--sp-4)',
                borderRadius: 'var(--radius-md)',
                background: 'rgba(196, 61, 61, 0.2)',
                border: '1px solid rgba(196, 61, 61, 0.3)',
                color: '#FFB4B4',
                fontSize: 'var(--text-sm)', fontWeight: 600,
              }}>
                <IconAlertTriangle size={14} /> {slaUrgent} SLA Urgent
              </div>
            )}
            <div style={{
              display: 'flex', alignItems: 'center', gap: 'var(--sp-2)',
              padding: 'var(--sp-2) var(--sp-4)',
              borderRadius: 'var(--radius-md)',
              background: 'rgba(255,255,255,0.1)',
              color: '#fff',
              fontSize: 'var(--text-sm)', fontWeight: 600,
            }}>
              <IconFileText size={14} /> {queueItems.length} Total
            </div>
          </div>
        </div>
      </div>

      {/* Stats Row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 'var(--sp-4)' }}>
        {[
          { label: 'Pending Review', value: pendingCount, icon: <IconClock size={20} />, color: 'var(--primary)', bg: 'var(--primary-light)' },
          { label: 'Verified', value: verifiedCount, icon: <IconShieldCheck size={20} />, color: '#189B6A', bg: '#E8F8F0' },
          { label: 'SLA Urgent', value: slaUrgent, icon: <IconAlertTriangle size={20} />, color: '#C43D3D', bg: '#FDECEC' },
        ].map((stat, i) => (
          <div key={i} style={{
            padding: 'var(--sp-5)',
            borderRadius: 'var(--radius-lg)',
            background: 'var(--bg-surface)',
            border: '1px solid var(--border)',
            display: 'flex', flexDirection: 'column', gap: 'var(--sp-3)',
            position: 'relative', overflow: 'hidden',
          }}>
            <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '3px', background: stat.color }} />
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div>
                <p style={{ fontSize: 'var(--text-xs)', color: 'var(--text-secondary)', fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{stat.label}</p>
                <p style={{ fontSize: 'var(--text-2xl)', fontWeight: 800, color: 'var(--text-heading)', marginTop: 'var(--sp-1)' }}>{stat.value}</p>
              </div>
              <div style={{ width: '40px', height: '40px', borderRadius: 'var(--radius-md)', background: stat.bg, color: stat.color, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                {stat.icon}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Search & Filter */}
      <div style={{
        padding: 'var(--sp-4)',
        borderRadius: 'var(--radius-lg)',
        background: 'var(--bg-surface)',
        border: '1px solid var(--border)',
        display: 'flex', alignItems: 'center', gap: 'var(--sp-4)', flexWrap: 'wrap',
      }}>
        <div style={{ flex: 1, minWidth: '240px', position: 'relative' }}>
          <IconSearch size={16} style={{ position: 'absolute', left: 'var(--sp-3)', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
          <input
            type="text" className="input"
            placeholder="Search by patient name or prescription ID..."
            value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}
            aria-label="Search prescriptions"
            style={{ paddingLeft: '36px' }}
          />
        </div>
        <select
          className="select"
          style={{ width: 'auto', minWidth: '160px' }}
          value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}
          aria-label="Filter by status"
        >
          <option value="pending_review">Pending Review</option>
          <option value="doctor_verified">Verified</option>
          <option value="rejected">Rejected</option>
          <option value="all">All</option>
        </select>
      </div>

      {/* Queue Table */}
      {loading ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--sp-3)' }}>
          {[1, 2, 3].map(i => <div key={i} className="skeleton" style={{ height: '64px', borderRadius: 'var(--radius-lg)' }} />)}
        </div>
      ) : error ? (
        <div style={{
          padding: 'var(--sp-6)',
          borderRadius: 'var(--radius-lg)',
          background: 'var(--bg-surface)',
          border: '1px solid var(--border)',
          textAlign: 'center',
        }}>
          <IconAlertTriangle size={24} style={{ color: 'var(--danger)', margin: '0 auto var(--sp-3)' }} />
          <p style={{ color: 'var(--danger)', marginBottom: 'var(--sp-3)' }}>{error}</p>
          <button className="btn btn-secondary btn-sm" onClick={loadQueue}>Retry</button>
        </div>
      ) : filtered.length === 0 ? (
        <div style={{
          padding: 'var(--sp-10)',
          borderRadius: 'var(--radius-lg)',
          background: 'var(--bg-surface)',
          border: '1px solid var(--border)',
          textAlign: 'center',
        }}>
          <IconSearch size={32} style={{ color: 'var(--text-muted)', margin: '0 auto var(--sp-3)', opacity: 0.4 }} />
          <p style={{ fontSize: 'var(--text-md)', color: 'var(--text-secondary)' }}>No prescriptions match your filters</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--sp-3)' }}>
          {filtered.map((item) => (
            <div key={item.prescription_id} className="medical-card-glass" style={{
              padding: 'var(--sp-5)',
              borderRadius: 'var(--radius-lg)',
              border: '1px solid var(--border)',
              background: 'var(--bg-surface)',
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              transition: 'all 200ms',
            }}
              onMouseEnter={(e) => { e.currentTarget.style.borderColor = 'var(--primary)'; e.currentTarget.style.transform = 'translateY(-1px)'; }}
              onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.transform = ''; }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--sp-4)', flex: 1, minWidth: 0 }}>
                <div style={{ width: '44px', height: '44px', borderRadius: 'var(--radius-md)', background: 'var(--primary-light)', color: 'var(--primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, fontWeight: 800, fontSize: 'var(--text-xs)' }}>
                  #{item.prescription_id.slice(0, 4)}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--sp-2)', marginBottom: '2px' }}>
                    <span style={{ fontFamily: 'monospace', fontWeight: 600, color: 'var(--primary)', fontSize: 'var(--text-sm)' }}>
                      {item.prescription_id.slice(0, 8)}
                    </span>
                    <span style={{
                      display: 'inline-flex', alignItems: 'center', padding: '2px 8px',
                      borderRadius: 'var(--radius-pill)',
                      fontSize: 'var(--text-xs)', fontWeight: 500,
                      background: 'var(--primary-light)',
                      color: 'var(--primary)',
                    }}>
                      {item.extraction_status}
                    </span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--sp-2)' }}>
                    <Avatar name={item.patient_ref} size="sm" />
                    <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>Patient: {item.patient_ref.slice(0, 8)}</span>
                  </div>
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--sp-4)', flexShrink: 0 }}>
                <div style={{ textAlign: 'center' }}>
                  <span style={{
                    display: 'inline-flex', alignItems: 'center', padding: '4px 10px',
                    borderRadius: 'var(--radius-pill)',
                    fontSize: 'var(--text-xs)', fontWeight: 600,
                    background: item.verification_status === 'doctor_verified' ? '#E8F8F0' : item.verification_status === 'rejected' ? '#FDECEC' : 'var(--warning-bg)',
                    color: item.verification_status === 'doctor_verified' ? '#189B6A' : item.verification_status === 'rejected' ? '#C43D3D' : 'var(--warning)',
                  }}>
                    {item.verification_status.replace(/_/g, ' ')}
                  </span>
                </div>

                {item.sla_breach ? (
                  <span style={{
                    display: 'inline-flex', alignItems: 'center', gap: '4px',
                    padding: '4px 10px', borderRadius: 'var(--radius-pill)',
                    background: '#FDECEC', color: '#C43D3D',
                    fontSize: 'var(--text-xs)', fontWeight: 600,
                  }}>
                    <IconAlertTriangle size={12} /> Overdue
                  </span>
                ) : (
                  <span style={{
                    display: 'inline-flex', alignItems: 'center', gap: '4px',
                    padding: '4px 10px', borderRadius: 'var(--radius-pill)',
                    background: 'var(--bg-soft)', color: 'var(--text-muted)',
                    fontSize: 'var(--text-xs)', fontWeight: 500,
                  }}>
                    <IconClock size={12} /> OK
                  </span>
                )}

                {item.verification_status === 'pending_review' && (
                  <Link href={`/doctor/prescriptions/${item.prescription_id}`} style={{
                    display: 'inline-flex', alignItems: 'center', gap: 'var(--sp-2)',
                    padding: 'var(--sp-2) var(--sp-4)',
                    borderRadius: 'var(--radius-md)',
                    background: 'var(--primary)',
                    color: '#fff',
                    fontWeight: 600,
                    fontSize: 'var(--text-sm)',
                    textDecoration: 'none',
                    boxShadow: '0 2px 8px rgba(11, 110, 107, 0.25)',
                  }}>
                    <IconShieldCheck size={14} /> Review
                  </Link>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
