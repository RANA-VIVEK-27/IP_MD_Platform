'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ApiClient, ApiError } from '../../../../lib/api';
import { PageHeader } from '../../../../components/PageHeader';
import { Avatar } from '../../../../components/Avatar';
import { ScheduleBadge, ConfidenceIndicator, AIDisclosureBanner } from '../../../../components/Badges';
import { Modal } from '../../../../components/Modal';
import { useToast } from '../../../../components/Toast';
import { IconCheckCircle, IconXCircle, IconFileText, IconClock, IconShieldCheck, IconAlertTriangle } from '../../../../components/Icons';
import { PrescriptionDetail } from '../../../../lib/types';

export default function DoctorReviewPage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const { addToast } = useToast();
  const [prescription, setPrescription] = useState<PrescriptionDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [rejectModalOpen, setRejectModalOpen] = useState(false);
  const [rejectReason, setRejectReason] = useState('');
  const [showSuccess, setShowSuccess] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);

  useEffect(() => {
    loadPrescription();
  }, [params.id]);

  async function loadPrescription() {
    setLoading(true);
    try {
      const data = await ApiClient.getPrescriptionDetail(params.id);
      setPrescription(data);
    } catch (e: unknown) {
      const msg = e instanceof ApiError ? e.message : 'Failed to load prescription';
      setError(msg);
    } finally {
      setLoading(false);
    }
  }

  const handleApprove = async () => {
    if (!prescription) return;
    setActionLoading(true);
    try {
      await ApiClient.approvePrescription(prescription.prescription_id);
      setShowSuccess(true);
      addToast('success', 'Prescription Approved', 'Patient checkout is now unblocked. Audit entry logged.');
      setTimeout(() => router.push('/doctor'), 1500);
    } catch (e: unknown) {
      const msg = e instanceof ApiError ? e.message : 'Approval failed';
      addToast('error', 'Approval Failed', msg);
    } finally {
      setActionLoading(false);
    }
  };

  const handleRejectConfirm = async () => {
    if (!prescription || !rejectReason.trim()) return;
    setActionLoading(true);
    try {
      await ApiClient.rejectPrescription(prescription.prescription_id, rejectReason);
      setRejectModalOpen(false);
      addToast('warning', 'Prescription Rejected', `Patient notified. Reason: "${rejectReason}"`);
      router.push('/doctor');
    } catch (e: unknown) {
      const msg = e instanceof ApiError ? e.message : 'Rejection failed';
      addToast('error', 'Rejection Failed', msg);
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="app-content">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--sp-5)' }}>
          <div className="skeleton" style={{ height: '80px', borderRadius: 'var(--radius-lg)' }} />
          <div className="grid-2" style={{ gridTemplateColumns: '1fr 1.2fr' }}>
            <div className="skeleton" style={{ height: '400px', borderRadius: 'var(--radius-lg)' }} />
            <div className="skeleton" style={{ height: '400px', borderRadius: 'var(--radius-lg)' }} />
          </div>
        </div>
      </div>
    );
  }

  if (error || !prescription) {
    return (
      <div className="app-content">
        <div className="card" style={{ padding: 'var(--sp-6)', textAlign: 'center' }}>
          <IconAlertTriangle size={24} style={{ color: 'var(--danger)', margin: '0 auto var(--sp-3)' }} />
          <p style={{ color: 'var(--danger)' }}>{error || 'Prescription not found'}</p>
          <button className="btn btn-secondary btn-sm" style={{ marginTop: 'var(--sp-3)' }} onClick={() => router.push('/doctor')}>Back to Queue</button>
        </div>
      </div>
    );
  }

  return (
    <div className="app-content" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--sp-5)' }}>
      {showSuccess && (
        <div role="status" className="flex items-center gap-3" style={{ padding: 'var(--sp-4) var(--sp-5)', background: 'var(--success-bg)', border: '1px solid var(--success-border)', borderRadius: 'var(--radius-lg)', color: 'var(--success)', fontWeight: 600, fontSize: 'var(--text-base)' }}>
          <IconCheckCircle size={20} />
          Prescription approved and signed! Patient checkout is now unblocked. Audit entry logged.
        </div>
      )}

      <div className="page-header">
        <div className="page-header-row">
          <div>
            <h1 className="text-h1">Clinical Review: #{prescription.prescription_id.slice(0, 8)}</h1>
            <div className="flex items-center gap-3 mt-2">
              <span className="flex items-center gap-1 text-caption">
                <IconClock size={12} />
                Created {new Date(prescription.created_at).toLocaleString('en-IN')}
              </span>
              <span className="text-muted">·</span>
              <span className={`badge ${prescription.verification_status === 'doctor_verified' ? 'badge-success' : prescription.verification_status === 'rejected' ? 'badge-danger' : 'badge-warning'}`}>
                {prescription.verification_status.replace(/_/g, ' ')}
              </span>
            </div>
          </div>
          {prescription.verification_status === 'pending_review' && (
            <div className="flex gap-3">
              <button className="btn btn-secondary" onClick={() => setRejectModalOpen(true)} disabled={actionLoading}>
                <IconXCircle size={16} /><span>Reject</span>
              </button>
              <button className="btn btn-primary" onClick={handleApprove} disabled={actionLoading}>
                <IconCheckCircle size={16} /><span>{actionLoading ? 'Processing...' : 'Approve & Verify'}</span>
              </button>
            </div>
          )}
        </div>
      </div>

      <div className="grid-2" style={{ gridTemplateColumns: '1fr 1.2fr', alignItems: 'start' }}>
        <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--sp-4)' }}>
          <div className="card-header" style={{ marginBottom: 0, paddingBottom: 'var(--sp-3)' }}>
            <h3 className="section-title">Prescription Details</h3>
            <span className="badge badge-neutral">Document</span>
          </div>
          <div style={{ flex: 1, minHeight: '300px', backgroundColor: 'var(--bg-page)', border: '1px dashed var(--border)', borderRadius: 'var(--radius-md)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 'var(--sp-8)', textAlign: 'center' }}>
            <div style={{ width: '64px', height: '64px', borderRadius: 'var(--radius-lg)', background: 'var(--bg-surface)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 'var(--sp-4)', boxShadow: 'var(--shadow-sm)' }}>
              <IconFileText size={28} style={{ color: 'var(--text-muted)' }} />
            </div>
            <p style={{ fontWeight: 600, color: 'var(--text-primary)', fontSize: 'var(--text-base)', marginBottom: 'var(--sp-1)' }}>
              Document ID: {prescription.document_id.slice(0, 8)}
            </p>
            <p className="text-caption">Extraction: {prescription.extraction_status}</p>
          </div>
        </div>

        <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--sp-4)' }}>
          <div className="card-header" style={{ marginBottom: 0, paddingBottom: 'var(--sp-3)' }}>
            <h3 className="section-title">AI Structured Extractions</h3>
            <AIDisclosureBanner />
          </div>
          <div className="flex flex-col gap-4">
            {prescription.extracted_fields.length === 0 ? (
              <p className="text-caption" style={{ padding: 'var(--sp-4)', textAlign: 'center' }}>No extracted fields available</p>
            ) : (
              prescription.extracted_fields.map((f) => (
                <div key={f.field_id} style={{ border: `1px solid ${f.confidence_score < 0.85 ? 'var(--warning)' : 'var(--border)'}`, borderRadius: 'var(--radius-md)', padding: 'var(--sp-4)', backgroundColor: 'var(--bg-surface)' }}>
                  <div className="flex items-center justify-between" style={{ marginBottom: 'var(--sp-3)' }}>
                    <span style={{ fontWeight: 600, fontSize: 'var(--text-md)' }}>{f.field_name}</span>
                    <ConfidenceIndicator score={f.confidence_score} showBar />
                  </div>
                  <p className="text-body">{f.value}</p>
                  {f.review_state === 'doctor_edited' && (
                    <span className="badge badge-info" style={{ marginTop: 'var(--sp-2)' }}>Edited by doctor</span>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      <Modal isOpen={rejectModalOpen} onClose={() => setRejectModalOpen(false)} title="Reject Prescription Verification">
        <div className="flex flex-col gap-4">
          <p style={{ fontSize: 'var(--text-base)', color: 'var(--text-secondary)' }}>
            Please specify the clinical or regulatory reason for rejecting this prescription.
          </p>
          <div className="form-group">
            <label className="form-label">Mandatory Rejection Reason</label>
            <textarea className="textarea" rows={4} placeholder="e.g. Ineligible handwriting, missing registration number..." value={rejectReason} onChange={(e) => setRejectReason(e.target.value)} />
          </div>
          <div className="modal-footer">
            <button className="btn btn-ghost" onClick={() => setRejectModalOpen(false)}>Cancel</button>
            <button className="btn btn-danger" disabled={!rejectReason.trim() || actionLoading} onClick={handleRejectConfirm}>
              {actionLoading ? 'Processing...' : 'Confirm Rejection & Notify Patient'}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
