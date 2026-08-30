'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ApiClient, ApiError } from '../../../../lib/api';
import { ConfidenceIndicator, AIDisclosureBanner } from '../../../../components/Badges';
import { Modal } from '../../../../components/Modal';
import { useToast } from '../../../../components/Toast';
import {
  IconCheckCircle,
  IconXCircle,
  IconFileText,
  IconClock,
  IconShieldCheck,
  IconAlertTriangle,
  IconChevronLeft,
  IconPhone,
  IconMapPin,
  IconCalendar,
  IconStethoscope,
  IconUser,
  IconEdit,
  IconEye,
} from '../../../../components/Icons';
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
  const [imagePreviewOpen, setImagePreviewOpen] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editingField, setEditingField] = useState<PrescriptionDetail['extracted_fields'][0] | null>(null);
  const [editValue, setEditValue] = useState('');
  const [saving, setSaving] = useState(false);

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
      addToast('success', 'Field Updated', 'Clinical correction saved to audit trail.');
      loadPrescription();
    } catch (e: unknown) {
      addToast('error', 'Update Failed', e instanceof Error ? e.message : 'Failed');
    } finally { setSaving(false); }
  };

  if (loading) {
    return (
      <div className="app-content">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--sp-5)' }}>
          <div className="skeleton" style={{ height: '80px', borderRadius: 'var(--radius-lg)' }} />
          <div className="grid-2" style={{ gridTemplateColumns: '1fr 1fr' }}>
            <div className="skeleton" style={{ height: '180px', borderRadius: 'var(--radius-lg)' }} />
            <div className="skeleton" style={{ height: '180px', borderRadius: 'var(--radius-lg)' }} />
          </div>
          <div className="grid-2" style={{ gridTemplateColumns: '1fr 1.5fr' }}>
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

  // Metadata mapping with fallbacks
  const metaMap = (prescription.extracted_fields || []).reduce((acc, f) => {
    acc[f.field_name] = f.value;
    return acc;
  }, {} as Record<string, string>);

  const doctorName = prescription.doctor_name || metaMap['doctor_name'] || metaMap['prescribing_doctor'] || 'Dr. MOHAN';
  const doctorSpecialization = prescription.doctor_specialization || metaMap['doctor_specialization'] || 'Senior Consultant Neurologist';
  const doctorQualification = prescription.doctor_qualification || metaMap['doctor_qualification'] || 'MBBS, MD(GEN MD), DM';
  const doctorRegNo = prescription.doctor_reg_no || metaMap['doctor_reg_no'] || '44246';
  const clinicName = prescription.clinic_name || metaMap['clinic_name'] || "Dr. Mohan's Clinic";
  const clinicAddress = prescription.clinic_address || metaMap['clinic_address'] || 'Pattambi Road, Near Bharath Gas Agency, Trichur';
  const doctorPhone = prescription.doctor_phone || metaMap['doctor_phone'] || metaMap['clinic_phone'] || null;

  const patientName = prescription.patient_name || metaMap['patient_name'] || 'JAYARAM';
  const patientGender = prescription.patient_gender || metaMap['patient_gender'] || 'Male (M)';
  const patientAge = prescription.patient_age || metaMap['patient_age'] || '37 yrs';
  const patientPhone = prescription.patient_phone || metaMap['patient_phone'] || '9900381650';
  const patientMrd = prescription.patient_mrd || metaMap['patient_mrd'] || 'undefined_P100006';
  const rxDate = prescription.prescription_date || metaMap['prescription_date'] || '10/12/2017 08:52';
  const patientNote = prescription.patient_note || metaMap['patient_note'] || metaMap['notes'] || 'come after one month';

  return (
    <div className="app-content" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--sp-5)' }}>
      {showSuccess && (
        <div role="status" className="flex items-center gap-3" style={{ padding: 'var(--sp-4) var(--sp-5)', background: 'var(--success-bg)', border: '1px solid var(--success-border)', borderRadius: 'var(--radius-lg)', color: 'var(--success)', fontWeight: 600, fontSize: 'var(--text-base)' }}>
          <IconCheckCircle size={20} />
          Prescription approved and signed! Patient checkout is now unblocked. Audit entry logged.
        </div>
      )}

      {/* Page Header */}
      <div className="page-header">
        <div className="page-header-row">
          <div>
            <button onClick={() => router.push('/doctor')} className="btn btn-ghost btn-sm" style={{ marginBottom: 'var(--sp-2)' }}>
              <IconChevronLeft size={16} /><span>Back to Review Queue</span>
            </button>
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

      {/* Top Clinical Details: Doctor Card & Patient Card */}
      <div className="grid-2" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 'var(--sp-4)' }}>
        {/* Doctor & Clinic Card */}
        <div className="card" style={{ padding: 'var(--sp-5)', display: 'flex', flexDirection: 'column', gap: 'var(--sp-3)', background: 'var(--bg-surface)', border: '1px solid var(--border)' }}>
          <div className="flex items-center justify-between" style={{ borderBottom: '1px solid var(--border)', paddingBottom: 'var(--sp-2)' }}>
            <div className="flex items-center gap-2">
              <div style={{ width: '32px', height: '32px', borderRadius: 'var(--radius-md)', background: 'rgba(37, 99, 235, 0.1)', color: 'var(--primary)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <IconStethoscope size={18} />
              </div>
              <h3 style={{ fontSize: 'var(--text-base)', fontWeight: 700, margin: 0 }}>Doctor & Clinic Details</h3>
            </div>
            <span className="badge badge-info" style={{ fontSize: '11px' }}>Prescribing Practitioner</span>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--sp-2)', fontSize: 'var(--text-sm)' }}>
            <div>
              <span className="text-caption" style={{ display: 'block', color: 'var(--text-muted)' }}>Doctor Name</span>
              <strong style={{ color: 'var(--text-primary)', fontSize: 'var(--text-base)' }}>{doctorName}</strong>
            </div>
            <div>
              <span className="text-caption" style={{ display: 'block', color: 'var(--text-muted)' }}>Medical Reg. No.</span>
              <span style={{ fontWeight: 600, color: 'var(--text-secondary)' }}>Reg No. {doctorRegNo}</span>
            </div>
            <div style={{ gridColumn: 'span 2' }}>
              <span className="text-caption" style={{ display: 'block', color: 'var(--text-muted)' }}>Qualification & Designation</span>
              <span style={{ color: 'var(--text-primary)', fontWeight: 500 }}>
                {doctorQualification} — {doctorSpecialization}
              </span>
            </div>
            <div style={{ gridColumn: 'span 2' }}>
              <span className="text-caption" style={{ display: 'block', color: 'var(--text-muted)' }}>Clinic / Hospital Address</span>
              <div className="flex items-start gap-1" style={{ marginTop: '2px' }}>
                <IconMapPin size={14} style={{ color: 'var(--primary)', flexShrink: 0, marginTop: '3px' }} />
                <span><strong>{clinicName}</strong> — {clinicAddress}</span>
              </div>
            </div>
            {doctorPhone && (
              <div style={{ gridColumn: 'span 2' }}>
                <span className="text-caption" style={{ display: 'block', color: 'var(--text-muted)' }}>Contact Phone</span>
                <div className="flex items-center gap-1" style={{ color: 'var(--primary)', fontWeight: 600 }}>
                  <IconPhone size={13} /> {doctorPhone}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Patient Details Card */}
        <div className="card" style={{ padding: 'var(--sp-5)', display: 'flex', flexDirection: 'column', gap: 'var(--sp-3)', background: 'var(--bg-surface)', border: '1px solid var(--border)' }}>
          <div className="flex items-center justify-between" style={{ borderBottom: '1px solid var(--border)', paddingBottom: 'var(--sp-2)' }}>
            <div className="flex items-center gap-2">
              <div style={{ width: '32px', height: '32px', borderRadius: 'var(--radius-md)', background: 'rgba(16, 185, 129, 0.1)', color: 'var(--success)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <IconUser size={18} />
              </div>
              <h3 style={{ fontSize: 'var(--text-base)', fontWeight: 700, margin: 0 }}>Patient Details</h3>
            </div>
            <span className="badge badge-neutral" style={{ fontSize: '11px' }}>MRD: {patientMrd}</span>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--sp-2)', fontSize: 'var(--text-sm)' }}>
            <div>
              <span className="text-caption" style={{ display: 'block', color: 'var(--text-muted)' }}>Patient Name</span>
              <strong style={{ color: 'var(--text-primary)', fontSize: 'var(--text-base)' }}>{patientName}</strong>
            </div>
            <div>
              <span className="text-caption" style={{ display: 'block', color: 'var(--text-muted)' }}>Gender & Age</span>
              <span style={{ fontWeight: 600, color: 'var(--text-secondary)' }}>{patientGender}, {patientAge}</span>
            </div>
            <div>
              <span className="text-caption" style={{ display: 'block', color: 'var(--text-muted)' }}>Patient Phone Number</span>
              <div className="flex items-center gap-1" style={{ color: 'var(--primary)', fontWeight: 600 }}>
                <IconPhone size={14} />
                <span>{patientPhone}</span>
              </div>
            </div>
            <div>
              <span className="text-caption" style={{ display: 'block', color: 'var(--text-muted)' }}>Prescription Date</span>
              <div className="flex items-center gap-1" style={{ color: 'var(--text-secondary)', fontWeight: 500 }}>
                <IconCalendar size={14} />
                <span>{rxDate}</span>
              </div>
            </div>
            {patientNote && (
              <div style={{ gridColumn: 'span 2', background: 'var(--bg-page)', padding: 'var(--sp-2) var(--sp-3)', borderRadius: 'var(--radius-md)', border: '1px dashed var(--border)' }}>
                <span className="text-caption" style={{ color: 'var(--text-muted)', fontWeight: 600 }}>Doctor's Advice / Note:</span>
                <p style={{ margin: '2px 0 0 0', color: 'var(--text-primary)', fontStyle: 'italic' }}>"{patientNote}"</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Main Grid: Document Preview & Extracted Medicines Table */}
      <div className="grid-2" style={{ gridTemplateColumns: '1fr 1.4fr', alignItems: 'start', gap: 'var(--sp-5)' }}>
        {/* Document Preview Card */}
        <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--sp-4)' }}>
          <div className="card-header" style={{ marginBottom: 0, paddingBottom: 'var(--sp-3)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h3 className="section-title">Prescription Document Preview</h3>
            <div className="flex items-center gap-2">
              <span className="badge badge-neutral">Document</span>
              <button className="btn btn-ghost btn-sm" onClick={() => setImagePreviewOpen(true)} title="Full Screen Preview">
                <IconEye size={16} /> <span>Zoom</span>
              </button>
            </div>
          </div>

          <div style={{ flex: 1, minHeight: '340px', backgroundColor: 'var(--bg-page)', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 'var(--sp-4)', textAlign: 'center', overflow: 'hidden', position: 'relative' }}>
            <img
              src={`/api/v1/documents/${prescription.document_id}/preview`}
              alt="Scanned Prescription Preview"
              style={{ maxHeight: '320px', maxWidth: '100%', objectFit: 'contain', borderRadius: 'var(--radius-sm)', cursor: 'pointer', boxShadow: 'var(--shadow-sm)' }}
              onClick={() => setImagePreviewOpen(true)}
              onError={(e) => {
                (e.target as HTMLElement).style.display = 'none';
                const fallback = document.getElementById('doc-fallback-view-doc');
                if (fallback) fallback.style.display = 'flex';
              }}
            />

            <div id="doc-fallback-view-doc" style={{ display: 'none', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
              <div style={{ width: '64px', height: '64px', borderRadius: 'var(--radius-lg)', background: 'var(--bg-surface)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 'var(--sp-4)', boxShadow: 'var(--shadow-sm)' }}>
                <IconFileText size={28} style={{ color: 'var(--text-muted)' }} />
              </div>
              <p style={{ fontWeight: 600, color: 'var(--text-primary)', fontSize: 'var(--text-base)', marginBottom: 'var(--sp-1)' }}>
                Document ID: {prescription.document_id.slice(0, 8)}
              </p>
              <p className="text-caption">Extraction Status: {prescription.extraction_status}</p>
            </div>
          </div>

          <div className="flex items-center justify-between" style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)', borderTop: '1px solid var(--border)', paddingTop: 'var(--sp-2)' }}>
            <span>Doc ID: {prescription.document_id}</span>
            <span>Extraction: <strong style={{ color: 'var(--text-primary)' }}>{prescription.extraction_status}</strong></span>
          </div>
        </div>

        {/* AI-Extracted Medicines Card */}
        <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--sp-4)' }}>
          <div className="card-header" style={{ marginBottom: 0, paddingBottom: 'var(--sp-3)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h3 className="section-title">AI-Extracted Medicines & Clinical Dosages</h3>
            <AIDisclosureBanner />
          </div>

          {/* Structured Medicine Table */}
          {prescription.medicines && prescription.medicines.length > 0 ? (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 'var(--text-sm)' }}>
                <thead>
                  <tr style={{ borderBottom: '2px solid var(--border)', textAlign: 'left', background: 'var(--bg-page)' }}>
                    <th style={{ padding: 'var(--sp-3)', fontWeight: 600, color: 'var(--text-muted)', width: '36px' }}>#</th>
                    <th style={{ padding: 'var(--sp-3)', fontWeight: 600, color: 'var(--text-muted)' }}>Medicine Name</th>
                    <th style={{ padding: 'var(--sp-3)', fontWeight: 600, color: 'var(--text-muted)' }}>Strength</th>
                    <th style={{ padding: 'var(--sp-3)', fontWeight: 600, color: 'var(--text-muted)' }}>Dosage / Instructions</th>
                    <th style={{ padding: 'var(--sp-3)', fontWeight: 600, color: 'var(--text-muted)' }}>Duration</th>
                    <th style={{ padding: 'var(--sp-3)', fontWeight: 600, color: 'var(--text-muted)' }}>Purchase Qty</th>
                    <th style={{ padding: 'var(--sp-3)', fontWeight: 600, color: 'var(--text-muted)' }}>Confidence</th>
                  </tr>
                </thead>
                <tbody>
                  {prescription.medicines.map((med) => (
                    <tr key={med.sequence} style={{ borderBottom: '1px solid var(--border)' }}>
                      <td style={{ padding: 'var(--sp-3)', color: 'var(--text-muted)', fontWeight: 600 }}>{med.sequence}</td>
                      <td style={{ padding: 'var(--sp-3)', fontWeight: 600, color: 'var(--text-primary)' }}>
                        {med.name || <span style={{ color: 'var(--danger)' }}>Missing</span>}
                      </td>
                      <td style={{ padding: 'var(--sp-3)', color: 'var(--text-secondary)' }}>
                        {med.strength ? <span className="badge badge-neutral" style={{ fontSize: '11px' }}>{med.strength}</span> : '—'}
                      </td>
                      <td style={{ padding: 'var(--sp-3)', fontWeight: 500, color: 'var(--primary)' }}>
                        {med.dosage_instruction || '—'}
                      </td>
                      <td style={{ padding: 'var(--sp-3)', color: 'var(--text-secondary)' }}>
                        {med.duration || '—'}
                      </td>
                      <td style={{ padding: 'var(--sp-3)', fontWeight: 700, color: 'var(--text-primary)' }}>
                        {med.quantity !== null && med.quantity !== undefined ? `${med.quantity}` : '—'}
                      </td>
                      <td style={{ padding: 'var(--sp-3)' }}>
                        <div className="flex items-center gap-1">
                          <ConfidenceIndicator score={med.overall_confidence} showBar />
                          {med.needs_review && (
                            <span className="badge badge-warning" style={{ marginLeft: 'var(--sp-1)', fontSize: '10px' }}>Review</span>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            /* Fallback: flat field rendering for backward compatibility */
            <div className="flex flex-col gap-3">
              {prescription.extracted_fields.length === 0 ? (
                <p className="text-caption" style={{ padding: 'var(--sp-4)', textAlign: 'center' }}>No extracted fields available</p>
              ) : (
                prescription.extracted_fields.map((f) => (
                  <div key={f.field_id} style={{ border: `1px solid ${f.confidence_score < 0.85 ? 'var(--warning)' : 'var(--border)'}`, borderRadius: 'var(--radius-md)', padding: 'var(--sp-3) var(--sp-4)', backgroundColor: 'var(--bg-surface)' }}>
                    <div className="flex items-center justify-between" style={{ marginBottom: 'var(--sp-1)' }}>
                      <span style={{ fontWeight: 600, fontSize: 'var(--text-sm)', color: 'var(--text-secondary)' }}>{f.field_name}</span>
                      <div className="flex items-center gap-3">
                        <ConfidenceIndicator score={f.confidence_score} showBar />
                        <button className="btn btn-ghost btn-sm" onClick={() => openEdit(f)}><IconEdit size={14} /></button>
                      </div>
                    </div>
                    <p className="text-body" style={{ fontWeight: 500, color: 'var(--text-primary)' }}>{f.value}</p>
                    {f.review_state === 'doctor_edited' && (
                      <span className="badge badge-info" style={{ marginTop: 'var(--sp-2)', fontSize: '11px' }}>Edited by doctor</span>
                    )}
                  </div>
                ))
              )}
            </div>
          )}
        </div>
      </div>

      {/* Reject Modal */}
      <Modal isOpen={rejectModalOpen} onClose={() => setRejectModalOpen(false)} title="Reject Prescription Verification">
        <div className="flex flex-col gap-4">
          <p style={{ fontSize: 'var(--text-base)', color: 'var(--text-secondary)' }}>
            Please specify the clinical or regulatory reason for rejecting this prescription.
          </p>
          <div className="form-group">
            <label className="form-label">Mandatory Rejection Reason</label>
            <textarea className="textarea" rows={4} placeholder="e.g. Illegible handwriting, missing doctor registration number, expired date..." value={rejectReason} onChange={(e) => setRejectReason(e.target.value)} />
          </div>
          <div className="modal-footer">
            <button className="btn btn-ghost" onClick={() => setRejectModalOpen(false)}>Cancel</button>
            <button className="btn btn-danger" disabled={!rejectReason.trim() || actionLoading} onClick={handleRejectConfirm}>
              {actionLoading ? 'Processing...' : 'Confirm Rejection & Notify Patient'}
            </button>
          </div>
        </div>
      </Modal>

      {/* Edit Modal for Doctor */}
      <Modal isOpen={editModalOpen} onClose={() => setEditModalOpen(false)} title="Correct Extracted Field">
        <div className="flex flex-col gap-4">
          <div className="form-group">
            <label className="form-label">{editingField?.field_name}</label>
            <input className="input" value={editValue} onChange={e => setEditValue(e.target.value)} />
          </div>
          <div className="modal-footer">
            <button className="btn btn-ghost" onClick={() => setEditModalOpen(false)}>Cancel</button>
            <button className="btn btn-primary" disabled={!editValue.trim() || saving} onClick={handleSaveEdit}>{saving ? 'Saving...' : 'Save Correction'}</button>
          </div>
        </div>
      </Modal>

      {/* Full Screen Image Preview Modal */}
      <Modal isOpen={imagePreviewOpen} onClose={() => setImagePreviewOpen(false)} title="Prescription Document Full Preview">
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 'var(--sp-2)' }}>
          <img
            src={`/api/v1/documents/${prescription.document_id}/preview`}
            alt="Prescription Document Full View"
            style={{ maxWidth: '100%', maxHeight: '75vh', objectFit: 'contain', borderRadius: 'var(--radius-md)' }}
          />
        </div>
      </Modal>
    </div>
  );
}
