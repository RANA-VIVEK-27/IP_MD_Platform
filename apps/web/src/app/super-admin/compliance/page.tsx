'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { PageHeader } from '../../../components/PageHeader';
import { useToast } from '../../../components/Toast';
import { IconAlertTriangle, IconShieldCheck } from '../../../components/Icons';
import { ApiClient } from '../../../lib/api';

interface OverrideRecord {
  override_id: string;
  order_id: string;
  audit_log_id: string;
}

export default function SuperAdminCompliancePage() {
  const { addToast } = useToast();
  const [orderId, setOrderId] = useState('');
  const [justification, setJustification] = useState('');
  const [overrides, setOverrides] = useState<OverrideRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [error, setError] = useState('');

  const loadOverrides = useCallback(async () => {
    try {
      const res = await ApiClient.queryAuditLogs({ action_type: 'COMPLIANCE_OVERRIDE', limit: 50 });
      const items: OverrideRecord[] = (res.data || []).map((log) => ({
        override_id: log.audit_log_id,
        order_id: log.target_entity_id,
        audit_log_id: log.audit_log_id,
      }));
      setOverrides(items);
    } catch {
      // Audit logs may fail, show empty
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadOverrides(); }, [loadOverrides]);

  const isValidUUID = (str: string) => {
    return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(str.trim());
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!orderId.trim()) {
      setError('Order ID is required.');
      return;
    }
    if (!isValidUUID(orderId)) {
      setError('Order ID must be a valid UUID (e.g. 550e8400-e29b-41d4-a716-446655440000).');
      return;
    }
    if (!justification.trim() || justification.trim().length < 10) {
      setError('Justification must be at least 10 characters.');
      return;
    }
    setError('');
    setConfirmOpen(true);
  };

  const confirmOverride = async () => {
    setConfirmOpen(false);
    setSubmitting(true);
    try {
      const res = await ApiClient.createComplianceOverride(orderId.trim(), justification.trim());
      setOverrides((prev) => [{
        override_id: res.override_id,
        order_id: res.order_id,
        audit_log_id: res.audit_log_id,
      }, ...prev]);
      setOrderId('');
      setJustification('');
      addToast('warning', 'Override Issued', `Compliance override executed for order ${orderId}. Audit log permanently recorded.`);
    } catch (e: unknown) {
      addToast('error', 'Override Failed', e instanceof Error ? e.message : 'Failed to execute override.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="app-content" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--sp-6)', maxWidth: '960px' }}>
      <PageHeader
        title="Emergency Compliance Overrides"
        subtitle="Final authority mechanism to unblock edge-case regulated orders with mandatory legal justification."
      />

      {/* Statutory Compliance Warning Panel */}
      <div
        role="alert"
        className="flex items-start gap-4"
        style={{
          padding: 'var(--sp-5)',
          background: 'linear-gradient(135deg, var(--warning-bg), rgba(251, 244, 232, 0.5))',
          border: '1px solid rgba(184, 121, 10, 0.25)',
          borderRadius: 'var(--radius-lg)',
        }}
      >
        <div
          style={{
            width: '44px',
            height: '44px',
            borderRadius: 'var(--radius-md)',
            background: 'var(--warning)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
          }}
        >
          <IconAlertTriangle size={22} style={{ color: '#fff' }} />
        </div>
        <div>
          <h4 style={{ fontSize: 'var(--text-md)', fontWeight: 700, color: 'var(--warning-dark)', marginBottom: 'var(--sp-1)' }}>
            Statutory Compliance Warning
          </h4>
          <p style={{ fontSize: 'var(--text-sm)', color: 'var(--text-secondary)', lineHeight: 1.6 }}>
            Overriding a Schedule H/H1/X dispensing block is scoped to this single order instance only.
            Every action produces an immutable audit record submitted to regulatory authorities during compliance audits.
          </p>
        </div>
      </div>

      {/* Override Form */}
      <form onSubmit={handleSubmit} className="card">
        <div className="card-header" style={{ marginBottom: 'var(--sp-4)' }}>
          <h3 className="section-title">Issue Compliance Override</h3>
        </div>

        <div className="flex flex-col gap-4">
          <div className="form-group" style={{ maxWidth: '480px' }}>
            <label className="form-label">Target Order ID (UUID)</label>
            <input
              type="text"
              className="input"
              required
              placeholder="e.g. 550e8400-e29b-41d4-a716-446655440000"
              value={orderId}
              onChange={(e) => { setOrderId(e.target.value); setError(''); }}
            />
            <p className="form-hint">Enter the full UUID of the blocked order.</p>
          </div>

          <div className="form-group">
            <label className="form-label">Mandatory Statutory / Clinical Justification</label>
            <textarea
              className="textarea"
              rows={4}
              required
              minLength={10}
              placeholder="Provide explicit clinical or emergency justification and reference supporting offline documentation or CMO clearance..."
              value={justification}
              onChange={(e) => { setJustification(e.target.value); setError(''); }}
            />
            <p className="form-helper">This justification will be permanently recorded in the audit trail and may be reviewed during regulatory audits.</p>
          </div>

          {error && (
            <div style={{ padding: 'var(--sp-3) var(--sp-4)', background: 'var(--danger-bg)', border: '1px solid rgba(196, 61, 61, 0.2)', borderRadius: 'var(--radius-md)', color: 'var(--danger)', fontSize: 'var(--text-sm)' }} role="alert">
              {error}
            </div>
          )}

          <button
            type="submit"
            className="btn btn-danger"
            disabled={submitting || !justification.trim() || !orderId.trim()}
            style={{ alignSelf: 'flex-start' }}
          >
            <IconShieldCheck size={16} />
            <span>{submitting ? 'Executing...' : 'Execute Compliance Override'}</span>
          </button>
        </div>
      </form>

      {/* Confirmation Dialog */}
      {confirmOpen && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div className="card" style={{ maxWidth: '440px', padding: 'var(--sp-6)', margin: 'var(--sp-4)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--sp-3)', marginBottom: 'var(--sp-4)' }}>
              <div style={{ width: '40px', height: '40px', borderRadius: 'var(--radius-md)', background: 'var(--danger-bg)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <IconAlertTriangle size={20} style={{ color: 'var(--danger)' }} />
              </div>
              <h3 style={{ fontSize: 'var(--text-lg)', fontWeight: 700, color: 'var(--text-heading)' }}>Confirm Override</h3>
            </div>
            <p style={{ fontSize: 'var(--text-sm)', color: 'var(--text-secondary)', marginBottom: 'var(--sp-4)', lineHeight: 1.6 }}>
              This action is <strong>irreversible</strong> and will create a permanent audit record. Are you sure you want to execute a compliance override for order <code style={{ background: 'var(--bg-muted)', padding: '2px 6px', borderRadius: 'var(--radius-sm)' }}>{orderId}</code>?
            </p>
            <div style={{ display: 'flex', gap: 'var(--sp-3)', justifyContent: 'flex-end' }}>
              <button className="btn btn-secondary" onClick={() => setConfirmOpen(false)}>Cancel</button>
              <button className="btn btn-danger" onClick={confirmOverride}>Yes, Execute Override</button>
            </div>
          </div>
        </div>
      )}

      {/* Override History */}
      <div className="card">
        <div className="card-header" style={{ marginBottom: 'var(--sp-4)' }}>
          <h3 className="section-title">Override History & Audit Trace</h3>
          <span className="badge badge-neutral">{overrides.length} records</span>
        </div>

        {loading ? (
          <div style={{ padding: 'var(--sp-6)', textAlign: 'center', color: 'var(--text-muted)' }}>Loading audit trail...</div>
        ) : overrides.length === 0 ? (
          <div style={{ padding: 'var(--sp-6)', textAlign: 'center', color: 'var(--text-muted)' }}>No compliance overrides recorded yet.</div>
        ) : (
          <div className="table-wrapper">
            <table className="table" role="table" aria-label="Compliance override history">
              <thead>
                <tr>
                  <th scope="col">Override ID</th>
                  <th scope="col">Order ID</th>
                  <th scope="col">Audit Log ID</th>
                </tr>
              </thead>
              <tbody>
                {overrides.map((ovr) => (
                  <tr key={ovr.override_id}>
                    <td>
                      <span style={{ fontFamily: 'monospace', fontSize: 'var(--text-sm)', color: 'var(--text-secondary)' }}>{ovr.override_id.slice(0, 8)}...</span>
                    </td>
                    <td>
                      <span style={{ fontWeight: 600, color: 'var(--primary)', fontFamily: 'monospace', fontSize: 'var(--text-sm)' }}>
                        {ovr.order_id.slice(0, 8)}...
                      </span>
                    </td>
                    <td>
                      <span style={{ fontFamily: 'monospace', fontSize: 'var(--text-sm)', color: 'var(--text-secondary)' }}>
                        {ovr.audit_log_id.slice(0, 8)}...
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
