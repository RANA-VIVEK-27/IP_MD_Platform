'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ApiClient } from '../../../../lib/api';
import { LoadingSpinner } from '../../../../components/LoadingSpinner';
import {
  IconPrescription,
  IconCheckCircle,
  IconXCircle,
  IconClock,
  IconAlertTriangle,
  IconShieldCheck,
  IconSend,
  IconClipboardMedical,
} from '../../../../components/Icons';

interface DashboardData {
  total_prescriptions: number;
  pending_review: number;
  doctor_verified: number;
  verified: number;
  rejected: number;
  recent_prescriptions: Array<{
    prescription_id: string;
    patient_name: string;
    extraction_status: string;
    verification_status: string;
    created_at: string | null;
  }>;
}

export default function PharmacistDashboardPage() {
  const router = useRouter();
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const res = await ApiClient.getPharmacistDashboard();
      setData(res);
    } catch (e: any) {
      if (e.status === 401) { router.push('/login'); return; }
      setError(e.message || 'Failed to load');
    } finally { setLoading(false); }
  };

  if (loading) return (
    <div className="app-content">
      <LoadingSpinner size={36} text="Loading dashboard..." />
    </div>
  );

  if (error) return (
    <div className="app-content">
      <div className="card" style={{ padding: 'var(--sp-6)', textAlign: 'center' }}>
        <IconAlertTriangle size={24} style={{ color: 'var(--danger)', margin: '0 auto var(--sp-3)' }} />
        <p style={{ color: 'var(--danger)' }}>{error}</p>
        <button className="btn btn-secondary btn-sm" style={{ marginTop: 'var(--sp-3)' }} onClick={loadData}>Retry</button>
      </div>
    </div>
  );

  if (!data) return null;

  const stats = [
    { label: 'Total', value: data.total_prescriptions, icon: <IconPrescription size={20} />, color: '#6C63FF', bg: 'rgba(108,99,255,0.08)' },
    { label: 'Pending Review', value: data.pending_review, icon: <IconClock size={20} />, color: '#F59E0B', bg: 'rgba(245,158,11,0.08)' },
    { label: 'Doctor Verified', value: data.doctor_verified, icon: <IconShieldCheck size={20} />, color: '#3B82F6', bg: 'rgba(59,130,246,0.08)' },
    { label: 'Verified', value: data.verified, icon: <IconCheckCircle size={20} />, color: '#10B981', bg: 'rgba(16,185,129,0.08)' },
    { label: 'Rejected', value: data.rejected, icon: <IconXCircle size={20} />, color: '#EF4444', bg: 'rgba(239,68,68,0.08)' },
  ];

  const statusConfig: Record<string, { bg: string; color: string; label: string }> = {
    pending_review: { bg: 'rgba(245,158,11,0.1)', color: '#D97706', label: 'Pending Review' },
    doctor_verified: { bg: 'rgba(59,130,246,0.1)', color: '#2563EB', label: 'Doctor Verified' },
    verified: { bg: 'rgba(16,185,129,0.1)', color: '#059669', label: 'Verified' },
    rejected: { bg: 'rgba(239,68,68,0.1)', color: '#DC2626', label: 'Rejected' },
    needs_review: { bg: 'rgba(245,158,11,0.1)', color: '#D97706', label: 'Needs Review' },
  };

  return (
    <div className="app-content" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--sp-6)' }}>
      {/* Hero Banner */}
      <div style={{
        background: 'linear-gradient(135deg, #0B6E6B 0%, #0EA5E9 50%, #6C63FF 100%)',
        borderRadius: 'var(--radius-xl)',
        padding: 'var(--sp-8)',
        position: 'relative',
        overflow: 'hidden',
      }}>
        <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(circle at 80% 20%, rgba(255,255,255,0.12) 0%, transparent 50%)' }} />
        <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(circle at 20% 80%, rgba(255,255,255,0.08) 0%, transparent 50%)' }} />
        <div style={{ position: 'relative', zIndex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--sp-3)', marginBottom: 'var(--sp-2)' }}>
            <div style={{ width: 40, height: 40, borderRadius: 'var(--radius-lg)', background: 'rgba(255,255,255,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <IconClipboardMedical size={20} style={{ color: '#fff' }} />
            </div>
            <h1 style={{ fontSize: 'var(--text-2xl)', fontWeight: 700, color: '#fff', margin: 0 }}>
              Pharmacist Dashboard
            </h1>
          </div>
          <p style={{ fontSize: 'var(--text-sm)', color: 'rgba(255,255,255,0.8)', marginBottom: 'var(--sp-5)', maxWidth: '500px' }}>
            Review prescriptions, verify medications, and ensure patient safety before dispensing.
          </p>
          <div style={{ display: 'flex', gap: 'var(--sp-3)', flexWrap: 'wrap' }}>
            <Link
              href="/pharmacy/pharmacist/prescriptions"
              style={{
                display: 'inline-flex', alignItems: 'center', gap: 'var(--sp-2)',
                padding: '10px 20px', borderRadius: 'var(--radius-md)',
                background: 'rgba(255,255,255,0.15)', border: '1px solid rgba(255,255,255,0.2)',
                color: '#fff', fontWeight: 600, fontSize: 'var(--text-sm)',
                textDecoration: 'none', backdropFilter: 'blur(4px)',
                transition: 'background 150ms',
              }}
            >
              <IconSend size={14} />
              Review Queue {data.pending_review > 0 && `(${data.pending_review})`}
            </Link>
            <Link
              href="/pharmacy/pharmacist/prescriptions?status=doctor_verified"
              style={{
                display: 'inline-flex', alignItems: 'center', gap: 'var(--sp-2)',
                padding: '10px 20px', borderRadius: 'var(--radius-md)',
                background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.15)',
                color: 'rgba(255,255,255,0.9)', fontWeight: 600, fontSize: 'var(--text-sm)',
                textDecoration: 'none', backdropFilter: 'blur(4px)',
                transition: 'background 150ms',
              }}
            >
              <IconShieldCheck size={14} />
              Doctor Verified ({data.doctor_verified})
            </Link>
          </div>
        </div>
      </div>

      {/* Stats Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 'var(--sp-3)' }}>
        {stats.map(s => (
          <div key={s.label} className="card" style={{ padding: 'var(--sp-4)', textAlign: 'center' }}>
            <div style={{ width: 40, height: 40, borderRadius: 'var(--radius-lg)', background: s.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto var(--sp-2)', color: s.color }}>
              {s.icon}
            </div>
            <div style={{ fontSize: 'var(--text-2xl)', fontWeight: 700, color: 'var(--text-primary)' }}>{s.value}</div>
            <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* Recent Prescriptions */}
      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        <div style={{ padding: 'var(--sp-4) var(--sp-5)', borderBottom: '1px solid var(--border-light)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h3 style={{ fontSize: 'var(--text-base)', fontWeight: 700, margin: 0 }}>Recent Prescriptions</h3>
          <Link href="/pharmacy/pharmacist/prescriptions" style={{ fontSize: 'var(--text-sm)', color: 'var(--primary)', textDecoration: 'none', fontWeight: 600 }}>
            View All
          </Link>
        </div>
        {data.recent_prescriptions.length === 0 ? (
          <div style={{ padding: 'var(--sp-8)', textAlign: 'center' }}>
            <IconClipboardMedical size={28} style={{ color: 'var(--text-muted)', margin: '0 auto var(--sp-2)', opacity: 0.4 }} />
            <p style={{ color: 'var(--text-muted)', fontSize: 'var(--text-sm)' }}>No prescriptions yet.</p>
          </div>
        ) : (
          <div>
            {data.recent_prescriptions.map((rx, i) => {
              const sc = statusConfig[rx.verification_status] || { bg: 'var(--bg-secondary)', color: 'var(--text-muted)', label: rx.verification_status };
              return (
                <div
                  key={rx.prescription_id}
                  onClick={() => router.push(`/pharmacy/pharmacist/prescriptions`)}
                  style={{
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                    padding: 'var(--sp-3) var(--sp-5)',
                    borderTop: i > 0 ? '1px solid var(--border-light)' : 'none',
                    cursor: 'pointer', transition: 'background 100ms',
                  }}
                  onMouseEnter={e => (e.currentTarget.style.background = 'var(--bg-secondary)')}
                  onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--sp-3)' }}>
                    <div style={{ width: 36, height: 36, borderRadius: 'var(--radius-md)', background: 'var(--primary-bg)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <IconPrescription size={16} style={{ color: 'var(--primary)' }} />
                    </div>
                    <div>
                      <div style={{ fontWeight: 600, fontSize: 'var(--text-sm)' }}>{rx.patient_name}</div>
                      <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>
                        #{rx.prescription_id.slice(0, 8)}
                        {rx.created_at && <> · {new Date(rx.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}</>}
                      </div>
                    </div>
                  </div>
                  <span style={{ fontSize: 'var(--text-xs)', fontWeight: 600, color: sc.color, background: sc.bg, padding: '3px 10px', borderRadius: 'var(--radius-pill)' }}>
                    {sc.label}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
