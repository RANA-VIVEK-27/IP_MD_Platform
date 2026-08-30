'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ApiClient } from '../../../lib/api';
import { PageHeader } from '../../../components/PageHeader';
import { LoadingSpinner } from '../../../components/LoadingSpinner';
import { IconClipboardMedical, IconAlertTriangle, IconChevronLeft, IconSend } from '../../../components/Icons';
import { useToast } from '../../../components/Toast';
import type { ReportSummary } from '../../../lib/types';

export default function PatientReportsPage() {
  const router = useRouter();
  const [reports, setReports] = useState<ReportSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [grantModal, setGrantModal] = useState<{ reportId: string; reportName: string } | null>(null);
  const [doctorId, setDoctorId] = useState('');
  const [doctors, setDoctors] = useState<any[]>([]);
  const [granting, setGranting] = useState(false);
  const { addToast } = useToast();

  const loadReports = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await ApiClient.listReports({ limit: 50 });
      setReports(res.data || []);
    } catch (e: any) {
      if (e.status === 401) { router.push('/login'); return; }
      setError(e.message || 'Failed to load reports');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadReports(); }, [loadReports]);

  const loadDoctors = async () => {
    try {
      const res = await ApiClient.listReportDoctors();
      setDoctors(res || []);
    } catch { setDoctors([]); }
  };

  const openGrantModal = (reportId: string, reportName: string) => {
    setGrantModal({ reportId, reportName });
    setDoctorId('');
    loadDoctors();
  };

  const handleGrantAccess = async () => {
    if (!grantModal || !doctorId) return;
    setGranting(true);
    try {
      await ApiClient.grantReportAccess(grantModal.reportId, doctorId);
      addToast('success', 'Access Granted', `Doctor can now view ${grantModal.reportName}`);
      setGrantModal(null);
    } catch (e: any) {
      addToast('error', 'Failed', e.message || 'Could not grant access');
    } finally {
      setGranting(false);
    }
  };

  const statusColor = (s: string) => {
    if (s === 'extracted') return { color: 'var(--success)', bg: 'var(--success-bg)' };
    if (s === 'failed') return { color: 'var(--danger)', bg: 'var(--danger-bg)' };
    return { color: 'var(--text-muted)', bg: 'var(--bg-secondary)' };
  };

  return (
    <div className="app-content" style={{ maxWidth: '800px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 'var(--sp-6)' }}>
      <PageHeader title="My Lab Reports" subtitle="View your uploaded reports and grant doctor access." />

      {loading ? (
        <LoadingSpinner size={36} text="Loading reports..." />
      ) : error ? (
        <div className="card" style={{ padding: 'var(--sp-6)', textAlign: 'center' }}>
          <IconAlertTriangle size={24} style={{ color: 'var(--danger)', margin: '0 auto var(--sp-3)' }} />
          <p style={{ color: 'var(--danger)' }}>{error}</p>
          <button className="btn btn-secondary btn-sm" style={{ marginTop: 'var(--sp-3)' }} onClick={loadReports}>Retry</button>
        </div>
      ) : reports.length === 0 ? (
        <div className="card" style={{ padding: 'var(--sp-10)', textAlign: 'center' }}>
          <IconClipboardMedical size={32} style={{ color: 'var(--text-muted)', margin: '0 auto var(--sp-3)', opacity: 0.4 }} />
          <p style={{ color: 'var(--text-secondary)', fontWeight: 500 }}>No reports uploaded yet.</p>
          <p style={{ fontSize: 'var(--text-sm)', color: 'var(--text-muted)' }}>Upload a lab report to get started.</p>
          <button className="btn btn-primary btn-sm" style={{ marginTop: 'var(--sp-3)' }} onClick={() => router.push('/patient/upload')}>Upload Report</button>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--sp-3)' }}>
          {reports.map(rx => {
            const sc = statusColor(rx.extraction_status);
            return (
              <div key={rx.report_id} style={{ display: 'flex', gap: 'var(--sp-2)' }}>
                <Link
                  href={`/patient/reports/${rx.report_id}`}
                  className="card"
                  style={{ flex: 1, padding: 'var(--sp-3) var(--sp-4)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', textDecoration: 'none', color: 'inherit' }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--sp-3)' }}>
                    <div style={{ width: 36, height: 36, borderRadius: 'var(--radius-md)', background: 'var(--primary-bg)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <IconClipboardMedical size={16} style={{ color: 'var(--primary)' }} />
                    </div>
                    <div>
                      <div style={{ fontWeight: 600, fontSize: 'var(--text-sm)' }}>{rx.report_type || 'Lab Report'}</div>
                      <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>
                        #{rx.report_id.slice(0, 8)} · {rx.created_at ? new Date(rx.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : '—'}
                      </div>
                    </div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--sp-2)' }}>
                    <span style={{ fontSize: 'var(--text-xs)', fontWeight: 600, color: sc.color, background: sc.bg, padding: '2px 8px', borderRadius: 'var(--radius-pill)' }}>
                      {rx.extraction_status}
                    </span>
                    <IconChevronLeft size={14} style={{ color: 'var(--text-muted)', transform: 'rotate(180deg)' }} />
                  </div>
                </Link>
                <button
                  onClick={() => openGrantModal(rx.report_id, rx.report_type || 'Report')}
                  className="btn btn-sm"
                  style={{ background: 'var(--primary-bg)', color: 'var(--primary)', border: '1px solid var(--primary)', fontWeight: 600, fontSize: 'var(--text-xs)', display: 'flex', alignItems: 'center', gap: '4px', alignSelf: 'center', flexShrink: 0 }}
                >
                  <IconSend size={12} /> Grant
                </button>
              </div>
            );
          })}
        </div>
      )}

      {/* Grant Access Modal */}
      {grantModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}
          onClick={() => { if (!granting) setGrantModal(null); }}>
          <div className="card" style={{ width: '420px', padding: 'var(--sp-5)' }} onClick={e => e.stopPropagation()}>
            <h3 style={{ fontSize: 'var(--text-lg)', fontWeight: 600, marginBottom: 'var(--sp-3)' }}>Grant Doctor Access</h3>
            <p style={{ fontSize: 'var(--text-sm)', color: 'var(--text-secondary)', marginBottom: 'var(--sp-3)' }}>
              Select a doctor to grant access to <strong>{grantModal.reportName}</strong>.
            </p>
            <div className="form-group" style={{ marginBottom: 'var(--sp-4)' }}>
              <label className="form-label">Select Doctor *</label>
              <select className="input" style={{ height: '40px', fontSize: 'var(--text-sm)' }} value={doctorId} onChange={e => setDoctorId(e.target.value)}>
                <option value="">Choose a doctor...</option>
                {doctors.map((d: any) => (
                  <option key={d.user_id} value={d.user_id}>{d.full_name || d.email}</option>
                ))}
              </select>
            </div>
            <div style={{ display: 'flex', gap: 'var(--sp-2)' }}>
              <button onClick={handleGrantAccess} disabled={granting || !doctorId} className="btn btn-primary btn-sm">
                {granting ? 'Granting...' : 'Grant Access'}
              </button>
              <button onClick={() => setGrantModal(null)} disabled={granting} className="btn btn-ghost btn-sm">Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
