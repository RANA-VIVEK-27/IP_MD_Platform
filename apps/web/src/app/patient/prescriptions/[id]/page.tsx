'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ApiClient, ApiError } from '../../../../lib/api';
import { PageHeader } from '../../../../components/PageHeader';
import { StatusBadge, AIDisclosureBanner, ConfidenceIndicator } from '../../../../components/Badges';
import { Modal } from '../../../../components/Modal';
import { useToast } from '../../../../components/Toast';
import { IconChevronLeft, IconPackage, IconAlertTriangle, IconCheckCircle, IconClock, IconFileText } from '../../../../components/Icons';
import { PrescriptionDetail } from '../../../../lib/types';

export default function PrescriptionDetailPage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const { addToast } = useToast();
  const [prescription, setPrescription] = useState<PrescriptionDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editingField, setEditingField] = useState<PrescriptionDetail['extracted_fields'][0] | null>(null);
  const [editValue, setEditValue] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => { loadPrescription(); }, [params.id]);

  async function loadPrescription() {
    setLoading(true);
    try {
      const data = await ApiClient.getPrescriptionDetail(params.id);
      setPrescription(data);
    } catch (e: unknown) {
      setError(e instanceof ApiError ? e.message : 'Failed to load prescription');
    } finally { setLoading(false); }
  }

  const handleCheckout = () => {
    if (!prescription) return;
    router.push(`/patient/catalog?prescription_id=${prescription.prescription_id}`);
  };

  const openEdit = (field: PrescriptionDetail['extracted_fields'][0]) => {
    setEditingField(field);
    setEditValue(field.value);
    setEditModalOpen(true);
  };

  const handleSaveEdit = async () => {
    if (!prescription || !editingField || !editValue.trim()) return;
    setSaving(true);
    try {
      await ApiClient.editExtractedField(prescription.prescription_id, editingField.field_id, editValue);
      setEditModalOpen(false);
      addToast('success', 'Field Updated', 'AI extraction has been updated.');
      loadPrescription();
    } catch (e: unknown) {
      addToast('error', 'Update Failed', e instanceof Error ? e.message : 'Failed');
    } finally { setSaving(false); }
  };

  if (loading) {
    return (
      <div className="app-content" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--sp-5)' }}>
        <div className="skeleton" style={{ height: '60px', borderRadius: 'var(--radius-lg)' }} />
        <div className="grid-2" style={{ gridTemplateColumns: '1fr 1.2fr' }}>
          <div className="skeleton" style={{ height: '400px', borderRadius: 'var(--radius-lg)' }} />
          <div className="skeleton" style={{ height: '400px', borderRadius: 'var(--radius-lg)' }} />
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
          <Link href="/patient/prescriptions" className="btn btn-secondary btn-sm" style={{ marginTop: 'var(--sp-3)' }}>Back to Prescriptions</Link>
        </div>
      </div>
    );
  }

  const canCheckout = prescription.verification_status === 'doctor_verified' && prescription.extraction_status === 'extracted';

  return (
    <div className="app-content" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--sp-5)' }}>
      <div className="page-header">
        <div className="page-header-row">
          <div>
            <button onClick={() => router.back()} className="btn btn-ghost btn-sm" style={{ marginBottom: 'var(--sp-2)' }}>
              <IconChevronLeft size={16} /><span>Back</span>
            </button>
            <h1 className="text-h1">Prescription #{prescription.prescription_id.slice(0, 8)}</h1>
            <div className="flex items-center gap-3 mt-2">
              <StatusBadge status={prescription.verification_status} />
              <span className="text-caption flex items-center gap-1">
                <IconClock size={12} />
                Uploaded {new Date(prescription.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
              </span>
            </div>
          </div>
          <div className="flex gap-3">
            <Link href="/patient/prescriptions" className="btn btn-secondary">My Prescriptions</Link>
            {canCheckout && (
              <button className="btn btn-primary" onClick={handleCheckout}>
                <IconPackage size={16} /><span>Order Medicines</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {prescription.verification_status === 'pending_review' && (
        <div role="status" className="flex items-center gap-3" style={{ padding: 'var(--sp-4) var(--sp-5)', background: 'var(--warning-bg)', border: '1px solid var(--warning-border)', borderRadius: 'var(--radius-lg)', color: 'var(--warning)', fontWeight: 600 }}>
          <IconClock size={20} /> Waiting for a doctor to verify this prescription. Checkout is blocked until verification.
        </div>
      )}
      {prescription.verification_status === 'rejected' && (
        <div role="status" className="flex items-center gap-3" style={{ padding: 'var(--sp-4) var(--sp-5)', background: 'var(--danger-bg)', border: '1px solid var(--danger-border)', borderRadius: 'var(--radius-lg)', color: 'var(--danger)', fontWeight: 600 }}>
          <IconAlertTriangle size={20} /> This prescription was rejected by a doctor. Please upload a new, valid prescription.
        </div>
      )}

      <div className="grid-2" style={{ gridTemplateColumns: '1fr 1.2fr', alignItems: 'start' }}>
        <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--sp-4)' }}>
          <div className="card-header" style={{ marginBottom: 0, paddingBottom: 'var(--sp-3)' }}>
            <h3 className="section-title">Document Preview</h3>
            <span className="badge badge-neutral">{prescription.is_ai_generated ? 'AI Generated' : 'Manual'}</span>
          </div>
          <div style={{ flex: 1, minHeight: '300px', backgroundColor: 'var(--bg-page)', border: '1px dashed var(--border)', borderRadius: 'var(--radius-md)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 'var(--sp-8)', textAlign: 'center' }}>
            <div style={{ width: '64px', height: '64px', borderRadius: 'var(--radius-lg)', background: 'var(--bg-surface)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 'var(--sp-4)', boxShadow: 'var(--shadow-sm)' }}>
              <IconFileText size={28} style={{ color: 'var(--text-muted)' }} />
            </div>
            <p style={{ fontWeight: 600, color: 'var(--text-primary)', fontSize: 'var(--text-base)', marginBottom: 'var(--sp-1)' }}>
              Document ID: {prescription.document_id.slice(0, 8)}
            </p>
            <p className="text-caption">Extraction Status: {prescription.extraction_status}</p>
          </div>
        </div>

        <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--sp-4)' }}>
          <div className="card-header" style={{ marginBottom: 0, paddingBottom: 'var(--sp-3)' }}>
            <h3 className="section-title">AI-Extracted Data</h3>
            <AIDisclosureBanner />
          </div>
          <div className="flex flex-col gap-4">
            {prescription.extracted_fields.map((f) => (
              <div key={f.field_id} style={{ border: `1px solid ${f.confidence_score < 0.85 ? 'var(--warning)' : 'var(--border)'}`, borderRadius: 'var(--radius-md)', padding: 'var(--sp-4)', backgroundColor: 'var(--bg-surface)' }}>
                <div className="flex items-center justify-between" style={{ marginBottom: 'var(--sp-3)' }}>
                  <span style={{ fontWeight: 600, fontSize: 'var(--text-md)' }}>{f.field_name}</span>
                  <div className="flex items-center gap-3">
                    <ConfidenceIndicator score={f.confidence_score} showBar />
                    <button className="btn btn-ghost btn-sm" onClick={() => openEdit(f)}>Edit</button>
                  </div>
                </div>
                <p className="text-body">{f.value}</p>
                {f.review_state === 'doctor_edited' && (
                  <span className="badge badge-info" style={{ marginTop: 'var(--sp-2)' }}>Edited by doctor</span>
                )}
              </div>
            ))}
            {prescription.extracted_fields.length === 0 && (
              <p className="text-caption" style={{ padding: 'var(--sp-4)', textAlign: 'center' }}>No fields extracted yet</p>
            )}
          </div>
        </div>
      </div>

      <Modal isOpen={editModalOpen} onClose={() => setEditModalOpen(false)} title="Edit AI Extraction">
        <div className="flex flex-col gap-4">
          <div className="form-group">
            <label className="form-label">{editingField?.field_name}</label>
            <input className="input" value={editValue} onChange={e => setEditValue(e.target.value)} />
          </div>
          <div className="modal-footer">
            <button className="btn btn-ghost" onClick={() => setEditModalOpen(false)}>Cancel</button>
            <button className="btn btn-primary" disabled={!editValue.trim() || saving} onClick={handleSaveEdit}>{saving ? 'Saving...' : 'Save Edit'}</button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
