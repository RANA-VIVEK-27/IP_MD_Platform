'use client';

import React, { useState, useEffect } from 'react';
import { ApiClient, ApiError } from '../../../lib/api';
import { PageHeader } from '../../../components/PageHeader';
import { IconCheckCircle, IconXCircle, IconAlertTriangle } from '../../../components/Icons';
import { AuditLogEntry } from '../../../lib/types';

export default function DoctorAuditPage() {
  const [entries, setEntries] = useState<AuditLogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    loadAuditLog();
  }, []);

  async function loadAuditLog() {
    setLoading(true);
    setError('');
    try {
      const res = await ApiClient.listDoctorAuditLogs({ limit: 50 });
      setEntries(res.data || []);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Failed to load audit log';
      setError(msg);
    } finally {
      setLoading(false);
    }
  }

  const getActionLabel = (actionType: string) => {
    switch (actionType) {
      case 'PRESCRIPTION_APPROVED': return 'APPROVE PRESCRIPTION';
      case 'PRESCRIPTION_REJECTED': return 'REJECT PRESCRIPTION';
      case 'VERIFY_DOCTOR_LICENSE': return 'VERIFY LICENSE';
      case 'SUSPEND_ACCOUNT': return 'SUSPEND ACCOUNT';
      case 'REINSTATE_ACCOUNT': return 'REINSTATE ACCOUNT';
      default: return actionType.replace(/_/g, ' ');
    }
  };

  const getActionIcon = (actionType: string) => {
    if (actionType.includes('APPROVED') || actionType.includes('REINSTATE') || actionType.includes('VERIFY')) {
      return <IconCheckCircle size={14} style={{ color: 'var(--success)' }} />;
    }
    return <IconXCircle size={14} style={{ color: 'var(--danger)' }} />;
  };

  return (
    <div className="app-content" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--sp-6)' }}>
      <PageHeader
        title="Doctor Verification Audit Log"
        subtitle="Immutable record of all clinical prescription reviews, endorsements, and rejections."
      />

      {loading ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--sp-3)' }}>
          {[1, 2].map(i => <div key={i} className="skeleton" style={{ height: '56px', borderRadius: 'var(--radius-lg)' }} />)}
        </div>
      ) : error ? (
        <div className="card" style={{ padding: 'var(--sp-6)', textAlign: 'center' }}>
          <IconAlertTriangle size={24} style={{ color: 'var(--danger)', margin: '0 auto var(--sp-3)' }} />
          <p style={{ color: 'var(--danger)' }}>{error}</p>
          <button className="btn btn-secondary btn-sm" style={{ marginTop: 'var(--sp-3)' }} onClick={loadAuditLog}>Retry</button>
        </div>
      ) : entries.length === 0 ? (
        <div className="empty-state" style={{ padding: 'var(--sp-12)' }}>
          <div className="empty-state-icon"><IconCheckCircle size={28} /></div>
          <h3>No audit entries yet</h3>
          <p>Your verification actions will appear here once you review prescriptions.</p>
        </div>
      ) : (
        <div className="table-wrapper">
          <table className="table" role="table" aria-label="Doctor verification audit log">
            <thead>
              <tr>
                <th scope="col">Audit Log ID</th>
                <th scope="col">Action</th>
                <th scope="col">Target Entity</th>
                <th scope="col">Timestamp (UTC)</th>
                <th scope="col">Justification</th>
              </tr>
            </thead>
            <tbody>
              {entries.map((entry) => (
                <tr key={entry.audit_log_id}>
                  <td>
                    <span style={{ fontFamily: 'monospace', fontSize: 'var(--text-sm)', color: 'var(--text-secondary)' }}>
                      {entry.audit_log_id.slice(0, 12)}
                    </span>
                  </td>
                  <td>
                    <div className="flex items-center gap-2">
                      {getActionIcon(entry.action_type)}
                      <span style={{ fontSize: 'var(--text-sm)', fontWeight: 600 }}>
                        {getActionLabel(entry.action_type)}
                      </span>
                    </div>
                  </td>
                  <td>
                    <span style={{ fontFamily: 'monospace', fontSize: 'var(--text-sm)', color: 'var(--primary)' }}>
                      {entry.target_entity_type}: {entry.target_entity_id.slice(0, 8)}
                    </span>
                  </td>
                  <td>
                    <span className="text-caption">
                      {new Date(entry.timestamp).toLocaleString('en-IN', { timeZone: 'UTC' })}
                    </span>
                  </td>
                  <td>
                    <span style={{ fontSize: 'var(--text-sm)', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                      {entry.justification || '—'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
