'use client';

import React, { useState, useEffect } from 'react';
import { ApiClient } from '../../../lib/api';
import { PageHeader } from '../../../components/PageHeader';
import { Avatar } from '../../../components/Avatar';
import { useToast } from '../../../components/Toast';
import { IconAlertTriangle, IconRefreshCw } from '../../../components/Icons';
import { OverdueVerificationItem } from '../../../lib/types';

export default function AdminOverdueVerificationPage() {
  const { addToast } = useToast();
  const [overdueItems, setOverdueItems] = useState<OverdueVerificationItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => { loadOverdue(); }, []);

  async function loadOverdue() {
    setLoading(true);
    setError('');
    try {
      const res = await ApiClient.listOverdueVerifications();
      setOverdueItems(res.data || []);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to load overdue verifications');
    } finally { setLoading(false); }
  }

  const handleReassign = (prescriptionId: string) => {
    setOverdueItems((prev) => prev.filter((item) => item.prescription_id !== prescriptionId));
    addToast('success', 'Reassigned', `Prescription ${prescriptionId.slice(0, 8)} has been flagged for reassignment to the on-call doctor pool.`);
  };

  return (
    <div className="app-content" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--sp-6)' }}>
      <PageHeader
        title="Overdue Verification Queue"
        subtitle="Prescriptions that have exceeded the platform 12-hour turnaround SLA for urgent reassignment."
        action={
          overdueItems.length > 0 && (
            <span className="badge badge-danger" style={{ gap: 'var(--sp-1)' }}>
              <IconAlertTriangle size={12} />
              {overdueItems.length} Breached
            </span>
          )
        }
      />

      {overdueItems.length > 0 && (
        <div role="alert" className="flex items-start gap-3" style={{ padding: 'var(--sp-4)', background: 'var(--warning-bg)', border: '1px solid rgba(184, 121, 10, 0.2)', borderRadius: 'var(--radius-lg)' }}>
          <IconAlertTriangle size={20} style={{ color: 'var(--warning)', flexShrink: 0, marginTop: '2px' }} />
          <div>
            <strong style={{ fontSize: 'var(--text-sm)', color: 'var(--warning-dark)' }}>SLA Escalation Required</strong>
            <p style={{ fontSize: 'var(--text-sm)', color: 'var(--text-secondary)', marginTop: 'var(--sp-1)' }}>
              These prescriptions have exceeded the 12-hour SLA window. Reassign immediately to maintain patient experience.
            </p>
          </div>
        </div>
      )}

      {loading ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--sp-3)' }}>
          {[1, 2].map(i => <div key={i} className="skeleton" style={{ height: '56px', borderRadius: 'var(--radius-lg)' }} />)}
        </div>
      ) : error ? (
        <div className="card" style={{ padding: 'var(--sp-6)', textAlign: 'center' }}>
          <IconAlertTriangle size={24} style={{ color: 'var(--danger)', margin: '0 auto var(--sp-3)' }} />
          <p style={{ color: 'var(--danger)' }}>{error}</p>
        </div>
      ) : (
        <div className="table-wrapper">
          <table className="table" role="table" aria-label="Overdue verification queue">
            <thead>
              <tr>
                <th scope="col">Prescription ID</th>
                <th scope="col">Queued At</th>
                <th scope="col">SLA Overdue By</th>
                <th scope="col">Assigned Doctor</th>
                <th scope="col" style={{ textAlign: 'right' }}>Action</th>
              </tr>
            </thead>
            <tbody>
              {overdueItems.map((item) => (
                <tr key={item.prescription_id} style={{ backgroundColor: 'rgba(196, 61, 61, 0.02)' }}>
                  <td>
                    <span style={{ fontWeight: 600, color: 'var(--primary)', fontFamily: 'monospace', fontSize: 'var(--text-sm)' }}>
                      {item.prescription_id.slice(0, 8)}
                    </span>
                  </td>
                  <td><span className="text-caption">{new Date(item.queued_at).toLocaleString('en-IN')}</span></td>
                  <td>
                    <span className="badge badge-danger" style={{ gap: 'var(--sp-1)' }}>
                      <IconAlertTriangle size={12} />
                      +{item.hours_overdue}h Breached
                    </span>
                  </td>
                  <td>
                    <div className="flex items-center gap-2">
                      {item.assigned_doctor && <Avatar name={item.assigned_doctor} size="sm" />}
                      <span style={{ fontSize: 'var(--text-base)' }}>{item.assigned_doctor || 'Unassigned (Pool)'}</span>
                    </div>
                  </td>
                  <td style={{ textAlign: 'right' }}>
                    <button className="btn btn-danger btn-sm" onClick={() => handleReassign(item.prescription_id)}>
                      <IconRefreshCw size={14} /><span>Reassign to On-Call</span>
                    </button>
                  </td>
                </tr>
              ))}
              {overdueItems.length === 0 && (
                <tr>
                  <td colSpan={5} style={{ textAlign: 'center', padding: 'var(--sp-10)' }}>
                    <div className="flex flex-col items-center gap-3" style={{ color: 'var(--success)' }}>
                      <span style={{ fontSize: 'var(--text-base)', fontWeight: 500 }}>All clear — no overdue prescriptions</span>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
