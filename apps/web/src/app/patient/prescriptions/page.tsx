'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ApiClient } from '../../../lib/api';
import { PageHeader } from '../../../components/PageHeader';
import { LoadingSpinner } from '../../../components/LoadingSpinner';
import { StatusBadge } from '../../../components/Badges';
import { IconFileText, IconAlertTriangle, IconChevronLeft } from '../../../components/Icons';
import type { PrescriptionSummary } from '../../../lib/types';

export default function PatientPrescriptionsPage() {
  const router = useRouter();
  const [prescriptions, setPrescriptions] = useState<PrescriptionSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadPrescriptions = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await ApiClient.listPrescriptions({ limit: 50 });
      setPrescriptions(res.data || []);
    } catch (e: any) {
      if (e.status === 401) { router.push('/login'); return; }
      setError(e.message || 'Failed to load prescriptions');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadPrescriptions(); }, [loadPrescriptions]);

  const statusLabel = (s: string) => {
    const map: Record<string, string> = {
      queued: 'Queued',
      processing: 'Processing',
      extracted: 'Extracted',
      needs_review: 'Needs Review',
      failed: 'Failed',
      pending_review: 'Pending Review',
      doctor_verified: 'Verified',
      rejected: 'Rejected',
    };
    return map[s] || s;
  };

  return (
    <div className="app-content" style={{ maxWidth: '800px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 'var(--sp-6)' }}>
      <PageHeader title="My Prescriptions" subtitle="View all your uploaded prescriptions." />

      {loading ? (
        <LoadingSpinner size={36} text="Loading prescriptions..." />
      ) : error ? (
        <div className="card" style={{ padding: 'var(--sp-6)', textAlign: 'center' }}>
          <IconAlertTriangle size={24} style={{ color: 'var(--danger)', margin: '0 auto var(--sp-3)' }} />
          <p style={{ color: 'var(--danger)' }}>{error}</p>
          <button className="btn btn-secondary btn-sm" style={{ marginTop: 'var(--sp-3)' }} onClick={loadPrescriptions}>Retry</button>
        </div>
      ) : prescriptions.length === 0 ? (
        <div className="card" style={{ padding: 'var(--sp-10)', textAlign: 'center' }}>
          <IconFileText size={32} style={{ color: 'var(--text-muted)', margin: '0 auto var(--sp-3)', opacity: 0.4 }} />
          <p style={{ color: 'var(--text-secondary)', fontWeight: 500 }}>No prescriptions uploaded yet.</p>
          <p style={{ fontSize: 'var(--text-sm)', color: 'var(--text-muted)' }}>Upload a prescription to get started.</p>
          <button className="btn btn-primary btn-sm" style={{ marginTop: 'var(--sp-3)' }} onClick={() => router.push('/patient/upload')}>Upload Prescription</button>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--sp-3)' }}>
          {prescriptions.map(rx => (
            <Link
              key={rx.prescription_id}
              href={`/patient/prescriptions/${rx.prescription_id}`}
              className="card"
              style={{ padding: 'var(--sp-3) var(--sp-4)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', textDecoration: 'none', color: 'inherit', transition: 'border-color 0.15s' }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--sp-3)' }}>
                <div style={{ width: 36, height: 36, borderRadius: 'var(--radius-md)', background: 'var(--primary-bg)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <IconFileText size={16} style={{ color: 'var(--primary)' }} />
                </div>
                <div>
                  <div style={{ fontWeight: 600, fontSize: 'var(--text-sm)' }}>Prescription #{rx.prescription_id.slice(0, 8)}</div>
                  <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>
                    {rx.created_at ? new Date(rx.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : '—'}
                    {rx.doctor_name && <span> · Dr. {rx.doctor_name}</span>}
                  </div>
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--sp-2)' }}>
                <StatusBadge status={rx.extraction_status} />
                <StatusBadge status={rx.verification_status} />
                <IconChevronLeft size={14} style={{ color: 'var(--text-muted)', transform: 'rotate(180deg)' }} />
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
