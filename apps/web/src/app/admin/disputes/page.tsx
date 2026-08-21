'use client';

import React, { useState, useEffect } from 'react';
import { ApiClient, ApiError } from '../../../lib/api';
import { PageHeader } from '../../../components/PageHeader';
import { StatusBadge } from '../../../components/Badges';
import { Modal } from '../../../components/Modal';
import { useToast } from '../../../components/Toast';
import { IconAlertTriangle, IconCheckCircle } from '../../../components/Icons';
import { Dispute } from '../../../lib/types';

export default function AdminDisputesPage() {
  const { addToast } = useToast();
  const [disputes, setDisputes] = useState<Dispute[]>([]);
  const [loading, setLoading] = useState(true);
  const [resolveModalOpen, setResolveModalOpen] = useState(false);
  const [selectedDispute, setSelectedDispute] = useState<Dispute | null>(null);
  const [resolution, setResolution] = useState('');
  const [resolving, setResolving] = useState(false);

  useEffect(() => { loadDisputes(); }, []);

  async function loadDisputes() {
    setLoading(true);
    try {
      const res = await ApiClient.listDisputes({ limit: 50 });
      setDisputes(res.data || []);
    } catch {} finally { setLoading(false); }
  }

  const handleResolve = async () => {
    if (!selectedDispute || !resolution.trim()) return;
    setResolving(true);
    try {
      await ApiClient.resolveDispute(selectedDispute.dispute_id, resolution);
      setResolveModalOpen(false);
      addToast('success', 'Dispute Resolved', `Dispute for order #${selectedDispute.order_id.slice(0, 8)} resolved.`);
      loadDisputes();
    } catch (e: unknown) {
      addToast('error', 'Resolution Failed', e instanceof Error ? e.message : 'Failed');
    } finally { setResolving(false); }
  };

  return (
    <div className="app-content" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--sp-6)' }}>
      <PageHeader title="Order Disputes" subtitle="Resolve order disputes flagged by the system or pharmacy staff." />

      {loading ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--sp-3)' }}>
          {[1, 2].map(i => <div key={i} className="skeleton" style={{ height: '56px', borderRadius: 'var(--radius-lg)' }} />)}
        </div>
      ) : disputes.length === 0 ? (
        <div className="empty-state" style={{ padding: 'var(--sp-8)' }}>
          <div className="empty-state-icon"><IconCheckCircle size={28} /></div>
          <h3>No active disputes</h3>
          <p>All order disputes have been resolved.</p>
        </div>
      ) : (
        <div className="table-wrapper">
          <table className="table">
            <thead><tr><th>Order</th><th>Type</th><th>Flagged</th><th>Status</th><th style={{ textAlign: 'right' }}>Action</th></tr></thead>
            <tbody>
              {disputes.map(d => (
                <tr key={d.dispute_id}>
                  <td style={{ fontWeight: 600 }}>#{d.order_id.slice(0, 8)}</td>
                  <td>{d.dispute_type.replace(/_/g, ' ')}</td>
                  <td className="text-caption">{new Date(d.flagged_at).toLocaleString('en-IN')}</td>
                  <td><StatusBadge status={d.resolved_at ? 'resolved' : 'pending'} /></td>
                  <td style={{ textAlign: 'right' }}>
                    {!d.resolved_at && (
                      <button className="btn btn-primary btn-sm" onClick={() => { setSelectedDispute(d); setResolveModalOpen(true); }}>Resolve</button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Modal isOpen={resolveModalOpen} onClose={() => setResolveModalOpen(false)} title="Resolve Dispute">
        <div className="flex flex-col gap-4">
          <p style={{ fontSize: 'var(--text-sm)', color: 'var(--text-secondary)' }}>Provide resolution notes for order #{selectedDispute?.order_id.slice(0, 8)}</p>
          <div className="form-group"><label className="form-label">Resolution Notes</label><textarea className="textarea" rows={3} required value={resolution} onChange={e => setResolution(e.target.value)} placeholder="Describe how the dispute was resolved..." /></div>
          <div className="modal-footer">
            <button className="btn btn-ghost" onClick={() => setResolveModalOpen(false)}>Cancel</button>
            <button className="btn btn-primary" disabled={!resolution.trim() || resolving} onClick={handleResolve}>{resolving ? 'Resolving...' : 'Confirm Resolution'}</button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
