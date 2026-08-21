'use client';

import React, { useState, useEffect } from 'react';
import { ApiClient, ApiError } from '../../lib/api';
import { PageHeader } from '../../components/PageHeader';
import { Avatar } from '../../components/Avatar';
import { StatusBadge } from '../../components/Badges';
import { Modal } from '../../components/Modal';
import { useToast } from '../../components/Toast';
import { IconCheckCircle, IconXCircle, IconShieldCheck, IconAlertTriangle } from '../../components/Icons';
import { DoctorKYCItem } from '../../lib/types';

export default function UserAdminKYCPage() {
  const { addToast } = useToast();
  const [pendingDoctors, setPendingDoctors] = useState<DoctorKYCItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [verifyModalOpen, setVerifyModalOpen] = useState(false);
  const [selectedDoctor, setSelectedDoctor] = useState<DoctorKYCItem | null>(null);
  const [decision, setDecision] = useState<'approve' | 'reject'>('approve');
  const [reason, setReason] = useState('');
  const [acting, setActing] = useState(false);

  useEffect(() => { loadPending(); }, []);

  async function loadPending() {
    setLoading(true);
    try {
      const res = await ApiClient.listPendingKYC();
      setPendingDoctors(res.data || []);
    } catch {} finally { setLoading(false); }
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
          {[1, 2].map(i => <div key={i} className="skeleton" style={{ height: '56px', borderRadius: 'var(--radius-lg)' }} />)}
        </div>
      ) : (
        <div className="table-wrapper">
          <table className="table">
            <thead><tr><th>Doctor</th><th>License #</th><th>Submitted</th><th style={{ textAlign: 'right' }}>Actions</th></tr></thead>
            <tbody>
              {pendingDoctors.length === 0 ? (
                <tr><td colSpan={4} style={{ textAlign: 'center', padding: 'var(--sp-8)' }}><IconCheckCircle size={28} style={{ color: 'var(--success)', margin: '0 auto var(--sp-2)' }} /><p>All pending verifications cleared</p></td></tr>
              ) : pendingDoctors.map(doc => (
                <tr key={doc.user_id}>
                  <td><div className="flex items-center gap-3"><Avatar name={doc.full_name} size="md" /><div><div style={{ fontWeight: 600 }}>{doc.full_name}</div><div className="text-caption">{doc.user_id.slice(0, 8)}</div></div></div></td>
                  <td><span style={{ fontFamily: 'monospace', fontWeight: 600, color: 'var(--primary)' }}>{doc.license_number}</span></td>
                  <td className="text-caption">{doc.submitted_at}</td>
                  <td style={{ textAlign: 'right' }}>
                    <div className="flex items-center justify-end gap-2">
                      <button className="btn btn-primary btn-sm" onClick={() => handleOpenVerify(doc, 'approve')}><IconCheckCircle size={14} /><span>Approve</span></button>
                      <button className="btn btn-secondary btn-sm" onClick={() => handleOpenVerify(doc, 'reject')}><IconXCircle size={14} /><span>Reject</span></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Modal isOpen={verifyModalOpen} onClose={() => setVerifyModalOpen(false)} title={decision === 'approve' ? 'Approve Doctor Medical License' : 'Reject Doctor Medical License'}>
        <div className="flex flex-col gap-4">
          <div className="flex items-center gap-3" style={{ padding: 'var(--sp-3)', background: 'var(--bg-page)', borderRadius: 'var(--radius-md)' }}>
            <Avatar name={selectedDoctor?.full_name || ''} size="lg" />
            <div><div style={{ fontWeight: 600 }}>{selectedDoctor?.full_name}</div><div className="text-caption">License: <code>{selectedDoctor?.license_number}</code></div></div>
          </div>
          {decision === 'reject' && (
            <div className="form-group"><label className="form-label">Mandatory Rejection Reason</label><textarea className="textarea" rows={3} required value={reason} onChange={e => setReason(e.target.value)} placeholder="e.g. License not found in registry..." /></div>
          )}
          <div className="modal-footer">
            <button className="btn btn-ghost" onClick={() => setVerifyModalOpen(false)}>Cancel</button>
            <button className={`btn ${decision === 'approve' ? 'btn-primary' : 'btn-danger'}`} disabled={(decision === 'reject' && !reason.trim()) || acting} onClick={handleConfirmVerification}>{acting ? 'Processing...' : decision === 'approve' ? 'Approve & Activate' : 'Confirm Rejection'}</button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
