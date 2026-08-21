'use client';

import React, { useState } from 'react';
import { PageHeader } from '../../../components/PageHeader';
import { useToast } from '../../../components/Toast';
import { IconAlertTriangle, IconShieldCheck } from '../../../components/Icons';

export default function SuperAdminCompliancePage() {
  const { addToast } = useToast();
  const [orderId, setOrderId] = useState('ord-5501');
  const [justification, setJustification] = useState('');
  const [overrides, setOverrides] = useState([
    {
      overrideId: 'ovr-801',
      orderId: 'ord-5110',
      justification: 'Emergency hospital inpatient request with verified offline hospital clearance letter from Chief Medical Officer.',
      issuedAt: 'Aug 18, 2026, 11:20 AM UTC',
    },
  ]);

  const handleIssueOverride = (e: React.FormEvent) => {
    e.preventDefault();
    if (!justification.trim()) return;

    const newOverride = {
      overrideId: `ovr-${800 + overrides.length + 1}`,
      orderId: orderId.trim(),
      justification: justification.trim(),
      issuedAt: new Date().toUTCString(),
    };
    setOverrides((prev) => [newOverride, ...prev]);
    setJustification('');
    addToast('warning', 'Override Issued', `Compliance override for ${orderId}. Audit log permanently recorded.`);
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
      <form onSubmit={handleIssueOverride} className="card">
        <div className="card-header" style={{ marginBottom: 'var(--sp-4)' }}>
          <h3 className="section-title">Issue Compliance Override</h3>
        </div>

        <div className="flex flex-col gap-4">
          <div className="form-group" style={{ maxWidth: '360px' }}>
            <label className="form-label">Target Order ID</label>
            <input
              type="text"
              className="input"
              required
              placeholder="e.g. ord-5501"
              value={orderId}
              onChange={(e) => setOrderId(e.target.value)}
            />
          </div>

          <div className="form-group">
            <label className="form-label">Mandatory Statutory / Clinical Justification</label>
            <textarea
              className="textarea"
              rows={4}
              required
              placeholder="Provide explicit clinical or emergency justification and reference supporting offline documentation or CMO clearance..."
              value={justification}
              onChange={(e) => setJustification(e.target.value)}
            />
            <p className="form-helper">This justification will be permanently recorded in the audit trail and may be reviewed during regulatory audits.</p>
          </div>

          <button
            type="submit"
            className="btn btn-danger"
            disabled={!justification.trim()}
            style={{ alignSelf: 'flex-start' }}
          >
            <IconShieldCheck size={16} />
            <span>Execute Compliance Override</span>
          </button>
        </div>
      </form>

      {/* Override History */}
      <div className="card">
        <div className="card-header" style={{ marginBottom: 'var(--sp-4)' }}>
          <h3 className="section-title">Override History & Audit Trace</h3>
          <span className="badge badge-neutral">{overrides.length} records</span>
        </div>

        <div className="table-wrapper">
          <table className="table" role="table" aria-label="Compliance override history">
            <thead>
              <tr>
                <th scope="col">Override ID</th>
                <th scope="col">Order ID</th>
                <th scope="col">Statutory Justification</th>
                <th scope="col">Issued At (UTC)</th>
              </tr>
            </thead>
            <tbody>
              {overrides.map((ovr) => (
                <tr key={ovr.overrideId}>
                  <td>
                    <span style={{ fontFamily: 'monospace', fontSize: 'var(--text-sm)', color: 'var(--text-secondary)' }}>{ovr.overrideId}</span>
                  </td>
                  <td>
                    <span style={{ fontWeight: 600, color: 'var(--primary)', fontFamily: 'monospace', fontSize: 'var(--text-sm)' }}>
                      {ovr.orderId}
                    </span>
                  </td>
                  <td>
                    <span style={{ fontSize: 'var(--text-sm)', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                      {ovr.justification}
                    </span>
                  </td>
                  <td>
                    <span className="text-caption">{ovr.issuedAt}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
