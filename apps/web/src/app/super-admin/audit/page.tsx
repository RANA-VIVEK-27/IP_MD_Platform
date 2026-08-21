'use client';

import React, { useState, useEffect } from 'react';
import { ApiClient } from '../../../lib/api';
import { PageHeader } from '../../../components/PageHeader';
import { Avatar } from '../../../components/Avatar';
import { IconClock, IconAlertTriangle } from '../../../components/Icons';
import { AuditLogEntry } from '../../../lib/types';

export default function SuperAdminAuditPage() {
  const [entries, setEntries] = useState<AuditLogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [actorFilter, setActorFilter] = useState('');
  const [actionFilter, setActionFilter] = useState('');

  useEffect(() => { loadAuditLogs(); }, [actorFilter, actionFilter]);

  async function loadAuditLogs() {
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
  }

  return (
    <div className="app-content" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--sp-6)' }}>
      <PageHeader title="Audit Logs & Compliance" subtitle="Read-only immutable trail of all privileged administrative actions for regulatory compliance." />

      <div className="card" style={{ padding: 'var(--sp-4)' }}>
        <div className="flex items-center gap-4" style={{ flexWrap: 'wrap' }}>
          <select className="select" style={{ width: 'auto', minWidth: '160px' }} value={actorFilter} onChange={e => setActorFilter(e.target.value)}>
            <option value="">All Actors</option>
            <option value="super_admin">Super Admin</option>
            <option value="admin">Admin</option>
            <option value="user_admin">User Admin</option>
            <option value="doctor">Doctor</option>
          </select>
          <select className="select" style={{ width: 'auto', minWidth: '160px' }} value={actionFilter} onChange={e => setActionFilter(e.target.value)}>
            <option value="">All Actions</option>
            <option value="approve">Approve</option>
            <option value="reject">Reject</option>
            <option value="suspend">Suspend</option>
            <option value="create">Create</option>
            <option value="update_settings">Update Settings</option>
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
            <thead><tr><th>Timestamp</th><th>Actor</th><th>Action</th><th>Target</th><th>Details</th></tr></thead>
            <tbody>
              {entries.map((e, idx) => (
                <tr key={idx}>
                  <td className="text-caption">{new Date(e.timestamp).toLocaleString('en-IN')}</td>
                  <td><div className="flex items-center gap-2"><Avatar name={e.actor_id || 'system'} size="sm" /><span style={{ fontWeight: 500 }}>{(e.actor_id || 'system').slice(0, 8)}</span></div></td>
                  <td><span className="badge badge-neutral">{e.action_type.replace(/_/g, ' ')}</span></td>
                  <td className="text-caption">{e.target_entity_id.slice(0, 8)}</td>
                  <td className="text-caption" style={{ maxWidth: '200px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{e.justification || '-'}</td>
                </tr>
              ))}
              {entries.length === 0 && (
                <tr><td colSpan={5} style={{ textAlign: 'center', padding: 'var(--sp-8)' }}>No audit entries match filters</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
