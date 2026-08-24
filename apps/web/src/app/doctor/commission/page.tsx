'use client';

import React from 'react';

export default function DoctorCommissionDashboard() {
  const transactions = [
    {
      tx_id: 'tx-1001',
      order_id: 'ord-5501',
      pharmacy_name: 'ABC Pharmacy',
      order_gross: '₹100.00',
      doctor_comm_rate: '5%',
      doctor_comm_earned: '₹5.00',
      platform_comm: '₹0.10',
      pharmacy_net: '₹94.90',
      status: 'APPROVED',
      date: '2026-08-23'
    }
  ];

  return (
    <div style={{ padding: '2rem', fontFamily: 'sans-serif', maxWidth: '1000px', margin: '0 auto', color: '#0f172a' }}>
      <header style={{ marginBottom: '2rem' }}>
        <h1 style={{ fontSize: '1.875rem', fontWeight: 700, color: '#1e293b' }}>
          Doctor Commission Earnings
        </h1>
        <p style={{ color: '#64748b' }}>
          Doctor Admin Financial Commission Ledger — Hierarchy §3, §10, §11
        </p>
      </header>

      {/* Summary KPI Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1rem', marginBottom: '2rem' }}>
        <div style={{ background: '#ecfdf5', padding: '1.25rem', borderRadius: '0.5rem', border: '1px solid #a7f3d0' }}>
          <div style={{ color: '#047857', fontSize: '0.875rem', fontWeight: 600 }}>Total Commission Earned</div>
          <div style={{ fontSize: '1.75rem', fontWeight: 700, color: '#065f46', marginTop: '0.5rem' }}>₹5.00</div>
        </div>

        <div style={{ background: '#eff6ff', padding: '1.25rem', borderRadius: '0.5rem', border: '1px solid #bfdbfe' }}>
          <div style={{ color: '#1d4ed8', fontSize: '0.875rem', fontWeight: 600 }}>Total Pharmacy Sales</div>
          <div style={{ fontSize: '1.75rem', fontWeight: 700, color: '#1e40af', marginTop: '0.5rem' }}>₹100.00</div>
        </div>

        <div style={{ background: '#f8fafc', padding: '1.25rem', borderRadius: '0.5rem', border: '1px solid #e2e8f0' }}>
          <div style={{ color: '#64748b', fontSize: '0.875rem', fontWeight: 600 }}>Active Configured Rate</div>
          <div style={{ fontSize: '1.75rem', fontWeight: 700, color: '#334155', marginTop: '0.5rem' }}>5.0%</div>
        </div>
      </div>

      {/* Transactions Table */}
      <div style={{ background: '#fff', borderRadius: '0.5rem', border: '1px solid #e2e8f0', overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.875rem' }}>
          <thead>
            <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0', color: '#475569' }}>
              <th style={{ padding: '0.75rem 1rem' }}>Date</th>
              <th style={{ padding: '0.75rem 1rem' }}>Order ID</th>
              <th style={{ padding: '0.75rem 1rem' }}>Pharmacy</th>
              <th style={{ padding: '0.75rem 1rem' }}>Sale Amount</th>
              <th style={{ padding: '0.75rem 1rem' }}>Rate</th>
              <th style={{ padding: '0.75rem 1rem' }}>Commission Earned</th>
              <th style={{ padding: '0.75rem 1rem' }}>Status</th>
            </tr>
          </thead>
          <tbody>
            {transactions.map((tx) => (
              <tr key={tx.tx_id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                <td style={{ padding: '0.75rem 1rem' }}>{tx.date}</td>
                <td style={{ padding: '0.75rem 1rem', fontFamily: 'monospace' }}>{tx.order_id}</td>
                <td style={{ padding: '0.75rem 1rem' }}>{tx.pharmacy_name}</td>
                <td style={{ padding: '0.75rem 1rem' }}>{tx.order_gross}</td>
                <td style={{ padding: '0.75rem 1rem' }}>{tx.doctor_comm_rate}</td>
                <td style={{ padding: '0.75rem 1rem', fontWeight: 700, color: '#059669' }}>{tx.doctor_comm_earned}</td>
                <td style={{ padding: '0.75rem 1rem' }}>
                  <span style={{ background: '#dcfce7', color: '#166534', padding: '0.25rem 0.5rem', borderRadius: '0.25rem', fontSize: '0.75rem', fontWeight: 600 }}>
                    {tx.status}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
