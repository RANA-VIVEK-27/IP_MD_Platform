'use client';

import React, { useState, useEffect } from 'react';
import { ApiClient, ApiError } from '../../../lib/api';
import { PageHeader } from '../../../components/PageHeader';
import { useToast } from '../../../components/Toast';
import { IconAlertTriangle, IconCheckCircle } from '../../../components/Icons';
import { PlatformSettingsResponse } from '../../../lib/types';

export default function SuperAdminSettingsPage() {
  const { addToast } = useToast();
  const [settings, setSettings] = useState<PlatformSettingsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [mfaEnabled, setMfaEnabled] = useState(false);
  const [sessionTimeout, setSessionTimeout] = useState(15);
  const [commissionRate, setCommissionRate] = useState(0);
  const [paymentGatewayRef, setPaymentGatewayRef] = useState('');

  useEffect(() => { loadSettings(); }, []);

  async function loadSettings() {
    setLoading(true);
    try {
      const res = await ApiClient.getPlatformSettings();
      setSettings(res);
      setMfaEnabled(res.security_policies?.mfa_required ?? false);
      setSessionTimeout(res.security_policies?.session_timeout_mins ?? 15);
      setCommissionRate(res.commission_rate_pct ?? 0);
      setPaymentGatewayRef(res.payment_gateway_credential_ref ?? '');
    } catch (e: unknown) {
      addToast('error', 'Load Failed', e instanceof Error ? e.message : 'Failed to load settings.');
    } finally { setLoading(false); }
  }

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await ApiClient.updatePlatformSettings({
        commission_rate_pct: commissionRate,
        payment_gateway_credential: paymentGatewayRef,
        security_policies: {
          mfa_required: mfaEnabled,
          session_timeout_mins: sessionTimeout,
        }
      });
      addToast('success', 'Settings Saved', 'Platform settings updated successfully.');
    } catch (e: unknown) {
      addToast('error', 'Save Failed', e instanceof Error ? e.message : 'Failed');
    } finally { setSaving(false); }
  };

  if (loading) {
    return <div className="app-content"><div className="skeleton" style={{ height: '400px', borderRadius: 'var(--radius-lg)' }} /></div>;
  }

  return (
    <div className="app-content" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--sp-6)' }}>
      <PageHeader title="Platform Settings & Compliance" subtitle="Global payment settings, security policy, and regulatory compliance controls." />

      <form onSubmit={handleSave} className="flex flex-col gap-6" style={{ maxWidth: '700px' }}>
        <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--sp-4)' }}>
          <h3 className="section-title">Payment Configuration</h3>
          <div className="form-group">
            <label className="form-label">Commission Rate (%)</label>
            <input className="input" type="number" step="0.1" min={0} max={100} value={commissionRate} onChange={e => setCommissionRate(parseFloat(e.target.value) || 0)} />
            <p className="form-hint">Platform commission rate applied to all transactions (0-100%).</p>
          </div>
          <div className="form-group">
            <label className="form-label">Razorpay Key Reference</label>
            <input className="input" type="text" value={paymentGatewayRef} onChange={e => setPaymentGatewayRef(e.target.value)} placeholder="e.g. rzp_live_xxxxx" />
          </div>
        </div>

        <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--sp-4)' }}>
          <h3 className="section-title">Security Policy</h3>
          <div className="form-check" style={{ display: 'flex', alignItems: 'center', gap: 'var(--sp-3)' }}>
            <input className="form-check-input" type="checkbox" checked={mfaEnabled} onChange={e => setMfaEnabled(e.target.checked)} id="mfa-toggle" />
            <label className="form-check-label" htmlFor="mfa-toggle">Enable Multi-Factor Authentication for Admins</label>
          </div>
          <div className="form-group">
            <label className="form-label">Session Timeout (minutes)</label>
            <input className="input" type="number" min={5} max={480} value={sessionTimeout} onChange={e => setSessionTimeout(parseInt(e.target.value) || 15)} />
          </div>
        </div>

        <div>
          <button type="submit" className="btn btn-primary" disabled={saving}>
            {saving ? 'Saving...' : 'Save Settings'}
          </button>
        </div>
      </form>
    </div>
  );
}
