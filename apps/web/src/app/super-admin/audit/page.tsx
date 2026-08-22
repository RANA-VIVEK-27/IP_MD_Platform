'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { ApiClient } from '../../../lib/api';
import { PageHeader } from '../../../components/PageHeader';
import { IconClock, IconAlertTriangle } from '../../../components/Icons';
import { AuditLogEntry } from '../../../lib/types';

const ACTION_TYPES = [
  { value: '', label: 'All Actions' },
  { value: 'CREATE_ADMIN_ACCOUNT', label: 'Create Admin' },
  { value: 'UPDATE_ADMIN_PERMISSIONS', label: 'Update Permissions' },
  { value: 'REVOKE_ADMIN_ACCOUNT', label: 'Revoke Admin' },
  { value: 'UPDATE_SETTINGS', label: 'Update Settings' },
  { value: 'COMPLIANCE_OVERRIDE', label: 'Compliance Override' },
  { value: 'DOCTOR_LICENSE_APPROVED', label: 'License Approved' },
  { value: 'DOCTOR_LICENSE_REJECTED', label: 'License Rejected' },
  { value: 'ACCOUNT_SUSPENDED', label: 'Account Suspended' },
  { value: 'ACCOUNT_REINSTATE', label: 'Account Reinstated' },
];

const ACTOR_ROLES = [
  { value: '', label: 'All Actors' },
  { value: 'super_admin', label: 'Super Admin' },
  { value: 'admin', label: 'Admin' },
  { value: 'user_admin', label: 'User Admin' },
  { value: 'doctor', label: 'Doctor' },
];

export default function SuperAdminAuditPage() {
  const [entries, setEntries] = useState<AuditLogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [actorFilter, setActorFilter] = useState('');
  const [actionFilter, setActionFilter] = useState('');

  const loadAuditLogs = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const params: Record<string, string | number> = { limit: 100 };
      if (actorFilter) params.actor_role = actorFilter;
      if (actionFilter) params.action_type = actionFilter;
      const res = await ApiClient.queryAuditLogs(params);
      setEntries(res.data || []);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to load audit logs');
    } finally { setLoading(false); }
  }, [actorFilter, actionFilter]);

  useEffect(() => { loadAuditLogs(); }, [loadAuditLogs]);

  return (
    <div className="app-content" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--sp-6)' }}>
      <PageHeader title="Audit Logs & Compliance" subtitle="Read-only immutable trail of all privileged administrative actions for regulatory compliance." />

      <div className="card" style={{ padding: 'var(--sp-4)' }}>
        <div className="flex items-center gap-4" style={{ flexWrap: 'wrap' }}>
          <select className="select" style={{ width: 'auto', minWidth: '180px' }} value={actorFilter} onChange={e => setActorFilter(e.target.value)}>
            {ACTOR_ROLES.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
          </select>
          <select className="select" style={{ width: 'auto', minWidth: '180px' }} value={actionFilter} onChange={e => setActionFilter(e.target.value)}>
            {ACTION_TYPES.map(a => <option key={a.value} value={a.value}>{a.label}</option>)}
          </select>
        </div>
      </div>

      {loading ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--sp-3)' }}>
          {[1, 2, 3].map(i => <div key={i} className="skeleton" style={{ height: '48px', borderRadius: 'var(--radius-lg)' }} />)}
        </div>
      ) : error ? (
        <div className="card" style={{ padding: 'var(--sp-6)', textAlign: 'center' }}>
          <IconAlertTriangle size={24} style={{ color: 'var(--danger)', margin: '0 auto var(--sp-3)' }} />
          <p style={{ color: 'var(--danger)' }}>{error}</p>
        </div>
      ) : (
        <div className="table-wrapper">
          <table className="table">
            <thead><tr><th>Timestamp</th><th>Actor Role</th><th>Action</th><th>Target</th><th>Details</th></tr></thead>
            <tbody>
              {entries.map((entry, idx) => (
                <tr key={idx}>
                  <td className="text-caption">{new Date(entry.timestamp).toLocaleString('en-IN')}</td>
                  <td><span className="badge badge-neutral">{(entry.actor_role || 'system').replace(/_/g, ' ')}</span></td>
                  <td><span className="badge badge-info">{entry.action_type.replace(/_/g, ' ')}</span></td>
                  <td className="text-caption" style={{ fontFamily: 'monospace' }}>{entry.target_entity_id.slice(0, 8)}...</td>
                  <td className="text-caption" style={{ maxWidth: '250px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{entry.justification || '-'}</td>
                </tr>
              ))}
              {entries.length === 0 && (
                <tr><td colSpan={5} style={{ textAlign: 'center', padding: 'var(--sp-8)', color: 'var(--text-muted)' }}>No audit entries match the selected filters.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
