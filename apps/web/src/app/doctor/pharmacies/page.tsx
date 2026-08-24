'use client';

import React, { useState } from 'react';

interface Pharmacy {
  partner_id: string;
  name: string;
  address: string;
  gstin: string;
  fulfillment_radius_km: number;
  status: string;
}

export default function DoctorPharmaciesPage() {
  const [pharmacies, setPharmacies] = useState<Pharmacy[]>([
    {
      partner_id: 'p-001',
      name: 'ABC Pharmacy',
      address: '123 Health Ave, Mumbai',
      gstin: '27AAAAA0000A1Z5',
      fulfillment_radius_km: 10.0,
      status: 'active'
    }
  ]);

  const [showAdd, setShowAdd] = useState(false);
  const [name, setName] = useState('');
  const [address, setAddress] = useState('');
  const [gstin, setGstin] = useState('');

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    const newPharm: Pharmacy = {
      partner_id: `p-00${pharmacies.length + 1}`,
      name,
      address,
      gstin,
      fulfillment_radius_km: 10.0,
      status: 'active'
    };
    setPharmacies([...pharmacies, newPharm]);
    setName('');
    setAddress('');
    setGstin('');
    setShowAdd(false);
  };

  return (
    <div style={{ padding: '2rem', fontFamily: 'sans-serif', maxWidth: '1000px', margin: '0 auto', color: '#0f172a' }}>
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <div>
          <h1 style={{ fontSize: '1.875rem', fontWeight: 700, color: '#1e293b' }}>
            My Managed Pharmacies
          </h1>
          <p style={{ color: '#64748b' }}>
            Doctor Admin Pharmacy Ownership Portal — Hierarchy §3, §4
          </p>
        </div>

        <button
          onClick={() => setShowAdd(!showAdd)}
          style={{ padding: '0.625rem 1.25rem', background: '#059669', color: '#fff', fontWeight: 600, border: 'none', borderRadius: '0.375rem', cursor: 'pointer' }}
        >
          + Add New Pharmacy
        </button>
      </header>

      {showAdd && (
        <form onSubmit={handleCreate} style={{ background: '#f8fafc', padding: '1.5rem', borderRadius: '0.5rem', border: '1px solid #cbd5e1', marginBottom: '2rem' }}>
          <h3 style={{ fontSize: '1.125rem', fontWeight: 600, marginBottom: '1rem' }}>Onboard Pharmacy under Dr. Rahul</h3>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
            <div>
              <label style={{ display: 'block', fontWeight: 600, marginBottom: '0.25rem' }}>Pharmacy Name</label>
              <input required value={name} onChange={(e) => setName(e.target.value)} style={{ width: '100%', padding: '0.5rem', borderRadius: '0.25rem', border: '1px solid #cbd5e1' }} />
            </div>
            <div>
              <label style={{ display: 'block', fontWeight: 600, marginBottom: '0.25rem' }}>GSTIN</label>
              <input value={gstin} onChange={(e) => setGstin(e.target.value)} style={{ width: '100%', padding: '0.5rem', borderRadius: '0.25rem', border: '1px solid #cbd5e1' }} />
            </div>
          </div>
          <div style={{ marginBottom: '1rem' }}>
            <label style={{ display: 'block', fontWeight: 600, marginBottom: '0.25rem' }}>Address</label>
            <input required value={address} onChange={(e) => setAddress(e.target.value)} style={{ width: '100%', padding: '0.5rem', borderRadius: '0.25rem', border: '1px solid #cbd5e1' }} />
          </div>
          <button type="submit" style={{ padding: '0.5rem 1rem', background: '#2563eb', color: '#fff', fontWeight: 600, border: 'none', borderRadius: '0.25rem', cursor: 'pointer' }}>
            Save Pharmacy
          </button>
        </form>
      )}

      <div style={{ display: 'grid', gap: '1rem' }}>
        {pharmacies.map((p) => (
          <div key={p.partner_id} style={{ background: '#fff', padding: '1.25rem', borderRadius: '0.5rem', border: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <h3 style={{ fontSize: '1.25rem', fontWeight: 600, color: '#1e293b' }}>{p.name}</h3>
              <p style={{ color: '#64748b', fontSize: '0.875rem', margin: '0.25rem 0' }}>{p.address} | GSTIN: {p.gstin || 'N/A'}</p>
              <span style={{ fontSize: '0.75rem', padding: '0.25rem 0.5rem', background: '#dcfce7', color: '#166534', borderRadius: '0.25rem', fontWeight: 600 }}>
                {p.status.toUpperCase()}
              </span>
            </div>

            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <button style={{ padding: '0.5rem 1rem', background: '#f1f5f9', color: '#334155', border: '1px solid #cbd5e1', borderRadius: '0.25rem', cursor: 'pointer' }}>
                Manage Inventory
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
