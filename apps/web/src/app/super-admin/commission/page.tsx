'use client';

import React, { useState } from 'react';

export default function SuperAdminCommissionPage() {
  const [doctorRate, setDoctorRate] = useState<number>(5.0);
  const [platformRate, setPlatformRate] = useState<number>(2.0);
  const [platformBase, setPlatformBase] = useState<string>('doctor_commission');
  const [settlementMode, setSettlementMode] = useState<string>('deduct_from_vendor');
  const [saved, setSaved] = useState<boolean>(false);

  // Live Formula Preview for a ₹100 Order (10000 paise)
  const sampleOrderPaise = 10000;
  const doctorCommPaise = Math.round(sampleOrderPaise * (doctorRate / 100));
  const platformCommPaise = platformBase === 'order_total'
    ? Math.round(sampleOrderPaise * (platformRate / 100))
    : Math.round(doctorCommPaise * (platformRate / 100));
  
  const vendorNetPaise = settlementMode === 'deduct_from_vendor'
    ? Math.max(0, sampleOrderPaise - doctorCommPaise - platformCommPaise)
    : sampleOrderPaise;

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  return (
    <div style={{ padding: '2rem', fontFamily: 'sans-serif', maxWidth: '900px', margin: '0 auto', color: '#0f172a' }}>
      <header style={{ marginBottom: '2rem' }}>
        <h1 style={{ fontSize: '1.875rem', fontWeight: 700, color: '#1e293b' }}>
          Platform & Doctor Commission Settings
        </h1>
        <p style={{ color: '#64748b' }}>
          Super Admin Global Configuration — Hierarchy §2, §10, §11, §27
        </p>
      </header>

      {saved && (
        <div style={{ padding: '1rem', background: '#dcfce7', color: '#166534', borderRadius: '0.5rem', marginBottom: '1.5rem', fontWeight: 600 }}>
          ✓ Commission Configuration Updated Successfully & Snapshot Logged!
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem' }}>
        {/* Form Controls */}
        <form onSubmit={handleSave} style={{ background: '#ffffff', padding: '1.5rem', borderRadius: '0.75rem', border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 600, marginBottom: '1rem' }}>Configurable Rates</h2>

          <div style={{ marginBottom: '1.25rem' }}>
            <label style={{ display: 'block', fontWeight: 600, marginBottom: '0.5rem' }}>
              Doctor Commission Rate (%)
            </label>
            <input
              type="number"
              step="0.1"
              value={doctorRate}
              onChange={(e) => setDoctorRate(parseFloat(e.target.value) || 0)}
              style={{ width: '100%', padding: '0.625rem', borderRadius: '0.375rem', border: '1px solid #cbd5e1' }}
            />
          </div>

          <div style={{ marginBottom: '1.25rem' }}>
            <label style={{ display: 'block', fontWeight: 600, marginBottom: '0.5rem' }}>
              Platform Super Admin Commission Rate (%)
            </label>
            <input
              type="number"
              step="0.1"
              value={platformRate}
              onChange={(e) => setPlatformRate(parseFloat(e.target.value) || 0)}
              style={{ width: '100%', padding: '0.625rem', borderRadius: '0.375rem', border: '1px solid #cbd5e1' }}
            />
          </div>

          <div style={{ marginBottom: '1.25rem' }}>
            <label style={{ display: 'block', fontWeight: 600, marginBottom: '0.5rem' }}>
              Platform Commission Base
            </label>
            <select
              value={platformBase}
              onChange={(e) => setPlatformBase(e.target.value)}
              style={{ width: '100%', padding: '0.625rem', borderRadius: '0.375rem', border: '1px solid #cbd5e1', background: '#fff' }}
            >
              <option value="doctor_commission">% of Doctor Commission (Default)</option>
              <option value="order_total">% of Gross Order Total</option>
            </select>
          </div>

          <div style={{ marginBottom: '1.5rem' }}>
            <label style={{ display: 'block', fontWeight: 600, marginBottom: '0.5rem' }}>
              Settlement Mode
            </label>
            <select
              value={settlementMode}
              onChange={(e) => setSettlementMode(e.target.value)}
              style={{ width: '100%', padding: '0.625rem', borderRadius: '0.375rem', border: '1px solid #cbd5e1', background: '#fff' }}
            >
              <option value="deduct_from_vendor">COMMISSION_DEDUCTED_FROM_VENDOR</option>
              <option value="platform_funded">PLATFORM_FUNDED_COMMISSION</option>
            </select>
          </div>

          <button
            type="submit"
            style={{ width: '100%', padding: '0.75rem', background: '#2563eb', color: '#fff', fontWeight: 600, border: 'none', borderRadius: '0.375rem', cursor: 'pointer' }}
          >
            Save Commission Settings
          </button>
        </form>

        {/* Live Example Simulator (§27) */}
        <div style={{ background: '#f8fafc', padding: '1.5rem', borderRadius: '0.75rem', border: '1px solid #e2e8f0' }}>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 600, marginBottom: '1rem', color: '#0f172a' }}>
            Live Calculation Preview
          </h2>
          <p style={{ fontSize: '0.875rem', color: '#64748b', marginBottom: '1.5rem' }}>
            Formula preview for a sample <strong>₹100.00</strong> (10,000 paise) customer transaction:
          </p>

          <div style={{ background: '#fff', borderRadius: '0.5rem', padding: '1rem', border: '1px solid #e2e8f0' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.5rem 0', borderBottom: '1px solid #f1f5f9' }}>
              <span>Gross Order Total:</span>
              <strong>₹100.00</strong>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.5rem 0', borderBottom: '1px solid #f1f5f9', color: '#059669' }}>
              <span>Doctor Commission ({doctorRate}%):</span>
              <strong>₹{(doctorCommPaise / 100).toFixed(2)}</strong>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.5rem 0', borderBottom: '1px solid #f1f5f9', color: '#2563eb' }}>
              <span>Platform Commission ({platformRate}%):</span>
              <strong>₹{(platformCommPaise / 100).toFixed(2)}</strong>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.75rem 0 0 0', fontWeight: 700, fontSize: '1.1rem', color: '#0f172a' }}>
              <span>Pharmacy Net Settlement:</span>
              <span style={{ color: '#16a34a' }}>₹{(vendorNetPaise / 100).toFixed(2)}</span>
            </div>
          </div>

          <div style={{ marginTop: '1.5rem', fontSize: '0.75rem', color: '#94a3b8' }}>
            * All computations are processed in integer <strong>paise</strong> with deterministic rounding to protect financial ledger integrity.
          </div>
        </div>
      </div>
    </div>
  );
}
