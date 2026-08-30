'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { ApiClient } from '../../../../lib/api';
import { PageHeader } from '../../../../components/PageHeader';
import { LoadingSpinner } from '../../../../components/LoadingSpinner';
import { IconPrescription, IconAlertTriangle, IconCheckCircle, IconXCircle, IconClock } from '../../../../components/Icons';
import { useToast } from '../../../../components/Toast';

interface Prescription {
  prescription_id: string;
  patient_name: string;
  doctor_name: string;
  extraction_status: string;
  verification_status: string;
  created_at: string | null;
}

export default function PharmacistPrescriptionsPage() {
  const router = useRouter();
  const [prescriptions, setPrescriptions] = useState<Prescription[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [filterStatus, setFilterStatus] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reviewingId, setReviewingId] = useState<string | null>(null);
  const [rejectModal, setRejectModal] = useState<{ id: string; name: string } | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const { addToast } = useToast();

  const loadPrescriptions = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const params: Record<string, string | number> = { page, page_size: 20 };
      if (filterStatus) params.status = filterStatus;
      const res = await ApiClient.listPharmacistPrescriptions(params);
      setPrescriptions(res.data);
      setTotal(res.total);
    } catch (e: any) {
      if (e.status === 401) { router.push('/login'); return; }
      setError(e.message || 'Failed to load');
    } finally { setLoading(false); }
  }, [page, filterStatus]);

  useEffect(() => { loadPrescriptions(); }, [loadPrescriptions]);

  const handleApprove = async (rx: Prescription) => {
    setReviewingId(rx.prescription_id);
    try {
      await ApiClient.reviewPharmacistPrescription(rx.prescription_id, { action: 'approve' });
      addToast('success', 'Approved', `Prescription for ${rx.patient_name} has been verified.`);
      loadPrescriptions();
    } catch (e: any) {
      addToast('error', 'Failed', e.message || 'Could not approve prescription');
    } finally {
      setReviewingId(null);
    }
  };

  const handleReject = async () => {
    if (!rejectModal || !rejectReason.trim()) return;
    setSubmitting(true);
    try {
      await ApiClient.reviewPharmacistPrescription(rejectModal.id, { action: 'reject', notes: rejectReason.trim() });
      addToast('success', 'Rejected', `Prescription for ${rejectModal.name} has been rejected.`);
      setRejectModal(null);
      setRejectReason('');
      loadPrescriptions();
    } catch (e: any) {
      addToast('error', 'Failed', e.message || 'Could not reject prescription');
    } finally {
      setSubmitting(false);
    }
  };

  const statusBadge = (s: string) => {
    const map: Record<string, { bg: string; color: string; label: string }> = {
      pending_review: { bg: '#FFF3CD', color: '#856404', label: 'Pending Review' },
      doctor_verified: { bg: '#CCE5FF', color: '#004085', label: 'Doctor Verified' },
      verified: { bg: '#D4EDDA', color: '#155724', label: 'Verified' },
      rejected: { bg: '#F8D7DA', color: '#721C24', label: 'Rejected' },
      needs_review: { bg: '#FFF3CD', color: '#856404', label: 'Needs Review' },
    };
    const b = map[s] || { bg: '#E2E3E5', color: '#383D41', label: s };
    return (
      <span style={{ display: 'inline-block', padding: '2px 10px', borderRadius: 'var(--radius-full)', fontSize: 'var(--text-xs)', fontWeight: 600, background: b.bg, color: b.color }}>
        {b.label}
      </span>
    );
  };

  return (
    <div className="app-content" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--sp-6)' }}>
      <PageHeader title="Prescription Queue" subtitle={`${total} prescriptions awaiting review`} />

      {/* Filters */}
      <div className="card" style={{ padding: 'var(--sp-3) var(--sp-4)', display: 'flex', gap: 'var(--sp-4)', alignItems: 'center', flexWrap: 'wrap' }}>
        <span style={{ fontSize: 'var(--text-sm)', fontWeight: 600, color: 'var(--text-secondary)' }}>Filter:</span>
        {[
          { value: '', label: 'All' },
          { value: 'pending_review', label: 'Pending Review' },
          { value: 'doctor_verified', label: 'Doctor Verified' },
          { value: 'verified', label: 'Verified' },
          { value: 'rejected', label: 'Rejected' },
        ].map(opt => (
          <label key={opt.value} style={{ display: 'flex', alignItems: 'center', gap: 'var(--sp-1)', cursor: 'pointer', fontSize: 'var(--text-sm)' }}>
            <input type="radio" name="status" value={opt.value} checked={filterStatus === opt.value}
              onChange={e => { setFilterStatus(e.target.value); setPage(1); }}
              style={{ accentColor: 'var(--primary)' }} />
            {opt.label}
          </label>
        ))}
      </div>

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
          <IconCheckCircle size={32} style={{ color: 'var(--success)', margin: '0 auto var(--sp-3)', opacity: 0.5 }} />
          <p style={{ color: 'var(--text-secondary)', fontWeight: 500 }}>No prescriptions found.</p>
          <p style={{ fontSize: 'var(--text-sm)', color: 'var(--text-muted)' }}>All caught up! Check back later.</p>
        </div>
      ) : (
        <>
          <div className="table-wrapper">
            <table className="table" role="table" aria-label="Prescription queue">
              <thead>
                <tr>
                  <th scope="col">Patient</th>
                  <th scope="col">Doctor</th>
                  <th scope="col">Extraction</th>
                  <th scope="col">Verification</th>
                  <th scope="col">Date</th>
                  <th scope="col" style={{ textAlign: 'center' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {prescriptions.map(rx => {
                  const canReview = rx.verification_status === 'pending_review' || rx.verification_status === 'doctor_verified';
                  const isReviewing = reviewingId === rx.prescription_id;
                  return (
                    <tr key={rx.prescription_id}>
                      <td style={{ fontWeight: 600 }}>{rx.patient_name}</td>
                      <td style={{ color: 'var(--text-secondary)' }}>{rx.doctor_name}</td>
                      <td>
                        <span style={{ fontSize: 'var(--text-xs)', fontWeight: 500, color: rx.extraction_status === 'completed' ? 'var(--success)' : 'var(--text-muted)' }}>
                          {rx.extraction_status}
                        </span>
                      </td>
                      <td>{statusBadge(rx.verification_status)}</td>
                      <td style={{ fontSize: 'var(--text-sm)', color: 'var(--text-muted)' }}>
                        {rx.created_at ? new Date(rx.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : '—'}
                      </td>
                      <td style={{ textAlign: 'center' }}>
                        {canReview ? (
                          <div style={{ display: 'flex', gap: 'var(--sp-1)', justifyContent: 'center' }}>
                            <button
                              onClick={() => handleApprove(rx)}
                              disabled={isReviewing}
                              className="btn btn-sm"
                              style={{ background: 'var(--success-bg)', color: 'var(--success)', border: '1px solid var(--success)', fontWeight: 600, fontSize: 'var(--text-xs)' }}
                            >
                              {isReviewing ? '...' : '✓ Approve'}
                            </button>
                            <button
                              onClick={() => { setRejectModal({ id: rx.prescription_id, name: rx.patient_name }); setRejectReason(''); }}
                              disabled={isReviewing}
                              className="btn btn-sm"
                              style={{ background: 'var(--danger-bg)', color: 'var(--danger)', border: '1px solid var(--danger)', fontWeight: 600, fontSize: 'var(--text-xs)' }}
                            >
                              ✕ Reject
                            </button>
                          </div>
                        ) : (
                          <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>—</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <div style={{ display: 'flex', justifyContent: 'center', gap: 'var(--sp-2)', marginTop: 'var(--sp-2)' }}>
            <button className="btn btn-ghost btn-sm" disabled={page <= 1} onClick={() => setPage(p => p - 1)}>Previous</button>
            <span style={{ padding: 'var(--sp-2) var(--sp-3)', fontSize: 'var(--text-sm)', color: 'var(--text-secondary)' }}>Page {page}</span>
            <button className="btn btn-ghost btn-sm" disabled={prescriptions.length < 20} onClick={() => setPage(p => p + 1)}>Next</button>
          </div>
        </>
      )}

      {/* Reject Modal */}
      {rejectModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}
          onClick={() => { if (!submitting) setRejectModal(null); }}>
          <div className="card" style={{ width: '420px', padding: 'var(--sp-5)' }} onClick={e => e.stopPropagation()}>
            <h3 style={{ fontSize: 'var(--text-lg)', fontWeight: 600, marginBottom: 'var(--sp-3)' }}>Reject Prescription</h3>
            <p style={{ fontSize: 'var(--text-sm)', color: 'var(--text-secondary)', marginBottom: 'var(--sp-3)' }}>
              Rejecting prescription for <strong>{rejectModal.name}</strong>. Please provide a reason:
            </p>
            <textarea
              className="input"
              style={{ minHeight: '80px', fontSize: 'var(--text-sm)', resize: 'vertical' }}
              placeholder="Reason for rejection (required)..."
              value={rejectReason}
              onChange={e => setRejectReason(e.target.value)}
              disabled={submitting}
            />
            <div style={{ display: 'flex', gap: 'var(--sp-2)', marginTop: 'var(--sp-4)' }}>
              <button onClick={handleReject} disabled={submitting || !rejectReason.trim()} className="btn btn-sm" style={{ background: 'var(--danger)', color: 'white', fontWeight: 600 }}>
                {submitting ? 'Rejecting...' : 'Confirm Reject'}
              </button>
              <button onClick={() => setRejectModal(null)} disabled={submitting} className="btn btn-ghost btn-sm">Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
