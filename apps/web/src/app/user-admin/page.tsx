'use client';

import React, { useState, useEffect } from 'react';
import { ApiClient } from '../../lib/api';
import { PageHeader } from '../../components/PageHeader';
import { Modal } from '../../components/Modal';
import { useToast } from '../../components/Toast';
import { IconCheckCircle, IconXCircle, IconShieldCheck, IconAlertTriangle } from '../../components/Icons';
import { DoctorKYCItem } from '../../lib/types';

export default function UserAdminKYCPage() {
  const { addToast } = useToast();
  const [pendingDoctors, setPendingDoctors] = useState<DoctorKYCItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [verifyModalOpen, setVerifyModalOpen] = useState(false);
  const [selectedDoctor, setSelectedDoctor] = useState<DoctorKYCItem | null>(null);
  const [decision, setDecision] = useState<'approve' | 'reject'>('approve');
  const [reason, setReason] = useState('');
  const [acting, setActing] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  useEffect(() => { loadPending(); }, []);

  async function loadPending() {
    setLoading(true);
    try {
      const res = await ApiClient.listPendingKYC();
      setPendingDoctors(res.data || []);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Failed to load pending verifications';
      setError(msg);
    } finally { setLoading(false); }
  }

  const handleOpenVerify = (doc: DoctorKYCItem, dec: 'approve' | 'reject') => {
    setSelectedDoctor(doc);
    setDecision(dec);
    setReason('');
    setVerifyModalOpen(true);
  };

  const handleConfirmVerification = async () => {
    if (!selectedDoctor) return;
    setActing(true);
    try {
      await ApiClient.verifyDoctorLicense(selectedDoctor.user_id, decision, decision === 'reject' ? reason : undefined);
      setPendingDoctors(prev => prev.filter(d => d.user_id !== selectedDoctor.user_id));
      setVerifyModalOpen(false);
      addToast(decision === 'approve' ? 'success' : 'warning', decision === 'approve' ? 'License Verified' : 'License Rejected',
        decision === 'approve' ? `${selectedDoctor.full_name} account activated.` : `${selectedDoctor.full_name} rejected.`);
    } catch (e: unknown) {
      addToast('error', 'Action Failed', e instanceof Error ? e.message : 'Failed');
    } finally { setActing(false); }
  };

  const detailRow = (label: string, value?: string | null) =>
    value ? (
      <div style={{ display: 'flex', gap: 'var(--sp-2)', fontSize: 'var(--text-sm)' }}>
        <span style={{ color: 'var(--text-muted)', minWidth: '140px' }}>{label}</span>
        <span style={{ color: 'var(--text-primary)', fontWeight: 500 }}>{value}</span>
      </div>
    ) : null;

  return (
    <div className="app-content" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--sp-6)' }}>
      <PageHeader title="Doctor KYC & License Verification" subtitle="Cross-check medical registration numbers before activating doctor accounts." />

      <div className="grid-3" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))' }}>
        <div className="card" style={{ textAlign: 'center', padding: 'var(--sp-5)' }}>
          <IconShieldCheck size={24} style={{ color: 'var(--warning)', margin: '0 auto var(--sp-2)' }} />
          <div className="text-overline" style={{ marginBottom: 'var(--sp-1)' }}>Pending Verification</div>
          <div className="tabular-nums" style={{ fontSize: 'var(--text-3xl)', fontWeight: 700, color: 'var(--warning)' }}>{pendingDoctors.length}</div>
        </div>
      </div>

      {loading ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--sp-3)' }}>
          {[1, 2].map(i => <div key={i} className="skeleton" style={{ height: '120px', borderRadius: 'var(--radius-lg)' }} />)}
        </div>
      ) : error ? (
        <div className="card" style={{ padding: 'var(--sp-6)', textAlign: 'center' }}>
          <IconAlertTriangle size={24} style={{ color: 'var(--danger)', margin: '0 auto var(--sp-3)' }} />
          <p style={{ color: 'var(--danger)' }}>{error}</p>
          <button className="btn btn-secondary btn-sm" style={{ marginTop: 'var(--sp-3)' }} onClick={loadPending}>Retry</button>
        </div>
      ) : pendingDoctors.length === 0 ? (
        <div className="card" style={{ padding: 'var(--sp-10)', textAlign: 'center' }}>
          <IconCheckCircle size={32} style={{ color: 'var(--success)', margin: '0 auto var(--sp-3)' }} />
          <p style={{ color: 'var(--text-secondary)', fontWeight: 500 }}>All pending verifications cleared</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--sp-4)' }}>
          {pendingDoctors.map(doc => {
            const isExpanded = expandedId === doc.user_id;
            const mr = doc.medical_registration;
            const q = doc.qualification;
            const pi = doc.practice_info;

            return (
              <div key={doc.user_id} className="card" style={{ padding: 0, overflow: 'hidden' }}>
                {/* Header row */}
                <div
                  style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: 'var(--sp-4) var(--sp-5)', cursor: 'pointer', background: isExpanded ? 'var(--bg-secondary)' : 'transparent', borderBottom: isExpanded ? '1px solid var(--border-light)' : 'none' }}
                  onClick={() => setExpandedId(isExpanded ? null : doc.user_id)}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--sp-3)' }}>
                    <div style={{ width: 40, height: 40, borderRadius: '50%', background: 'var(--primary-light)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, color: 'var(--primary)', fontSize: 'var(--text-sm)' }}>
                      {doc.full_name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}
                    </div>
                    <div>
                      <div style={{ fontWeight: 700, fontSize: 'var(--text-base)' }}>{doc.full_name}</div>
                      <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>
                        {doc.email || '—'} · {doc.phone || '—'}
                      </div>
                    </div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--sp-3)' }}>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontFamily: 'monospace', fontWeight: 600, color: 'var(--primary)', fontSize: 'var(--text-sm)' }}>{doc.license_number}</div>
                      <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>
                        {mr?.state_medical_council || '—'}
                      </div>
                    </div>
                    <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>
                      {new Date(doc.submitted_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                    </span>
                  </div>
                </div>

                {/* Expanded detail */}
                {isExpanded && (
                  <div style={{ padding: 'var(--sp-4) var(--sp-5)', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--sp-4)' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--sp-2)' }}>
                      <h4 style={{ fontSize: 'var(--text-xs)', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 'var(--sp-1)' }}>Medical Registration</h4>
                      {detailRow('Registration #', mr?.medical_registration_number)}
                      {detailRow('State Council', mr?.state_medical_council)}
                      {detailRow('Authority', mr?.registration_authority)}
                      {detailRow('Reg. Date', mr?.registration_date)}
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--sp-2)' }}>
                      <h4 style={{ fontSize: 'var(--text-xs)', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 'var(--sp-1)' }}>Qualification</h4>
                      {detailRow('Degree', q?.primary_qualification)}
                      {detailRow('University', q?.university)}
                      {detailRow('Specialization', q?.specialization)}
                      {detailRow('Graduation Year', q?.graduation_year)}
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--sp-2)' }}>
                      <h4 style={{ fontSize: 'var(--text-xs)', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 'var(--sp-1)' }}>Practice</h4>
                      {detailRow('Clinic / Hospital', pi?.clinic_hospital)}
                      {detailRow('Consultation', pi?.consultation_type)}
                      {detailRow('Facility', pi?.facility_association)}
                      {detailRow('Address', pi?.practice_address?.full_address)}
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--sp-2)' }}>
                      <h4 style={{ fontSize: 'var(--text-xs)', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 'var(--sp-1)' }}>Contact</h4>
                      {detailRow('Email', doc.email)}
                      {detailRow('Phone', doc.phone)}
                      {detailRow('Residence', doc.address?.full_address)}
                    </div>
                  </div>
                )}

                {/* Actions */}
                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 'var(--sp-2)', padding: 'var(--sp-3) var(--sp-5)', borderTop: '1px solid var(--border-light)', background: 'var(--bg-secondary)' }}>
                  <button className="btn btn-primary btn-sm" onClick={() => handleOpenVerify(doc, 'approve')}>
                    <IconCheckCircle size={14} /><span>Approve</span>
                  </button>
                  <button className="btn btn-secondary btn-sm" onClick={() => handleOpenVerify(doc, 'reject')}>
                    <IconXCircle size={14} /><span>Reject</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <Modal isOpen={verifyModalOpen} onClose={() => setVerifyModalOpen(false)} title={decision === 'approve' ? 'Approve Doctor Medical License' : 'Reject Doctor Medical License'}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--sp-4)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--sp-3)', padding: 'var(--sp-3)', background: 'var(--bg-page)', borderRadius: 'var(--radius-md)' }}>
            <div style={{ width: 44, height: 44, borderRadius: '50%', background: 'var(--primary-light)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, color: 'var(--primary)' }}>
              {selectedDoctor?.full_name?.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}
            </div>
            <div>
              <div style={{ fontWeight: 600 }}>{selectedDoctor?.full_name}</div>
              <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>License: <code>{selectedDoctor?.license_number}</code></div>
            </div>
          </div>
          {decision === 'reject' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--sp-1)' }}>
              <label style={{ fontSize: 'var(--text-sm)', fontWeight: 600 }}>Mandatory Rejection Reason</label>
              <textarea rows={3} required value={reason} onChange={e => setReason(e.target.value)} placeholder="e.g. License not found in registry..." style={{ padding: 'var(--sp-2) var(--sp-3)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)', fontSize: 'var(--text-sm)', resize: 'vertical' }} />
            </div>
          )}
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 'var(--sp-2)' }}>
            <button className="btn btn-ghost" onClick={() => setVerifyModalOpen(false)}>Cancel</button>
            <button className={`btn ${decision === 'approve' ? 'btn-primary' : 'btn-danger'}`} disabled={(decision === 'reject' && !reason.trim()) || acting} onClick={handleConfirmVerification}>
              {acting ? 'Processing...' : decision === 'approve' ? 'Approve & Activate' : 'Confirm Rejection'}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
