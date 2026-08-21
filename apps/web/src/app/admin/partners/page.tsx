'use client';

import React, { useState, useEffect } from 'react';
import { ApiClient, ApiError } from '../../../lib/api';
import { PageHeader } from '../../../components/PageHeader';
import { StatusBadge } from '../../../components/Badges';
import { Modal } from '../../../components/Modal';
import { useToast } from '../../../components/Toast';
import { IconCheckCircle, IconAlertTriangle } from '../../../components/Icons';
import { PartnerPharmacyAdmin } from '../../../lib/types';

export default function AdminPartnersPage() {
  const { addToast } = useToast();
  const [partners, setPartners] = useState<PartnerPharmacyAdmin[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [onboardModalOpen, setOnboardModalOpen] = useState(false);
  const [newName, setNewName] = useState('');
  const [newRadius, setNewRadius] = useState('8.0');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => { loadPartners(); }, []);

  async function loadPartners() {
    setLoading(true);
    try {
      const res = await ApiClient.listPartnerPharmacies({ limit: 50 });
      setPartners(res.data || []);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to load partners');
    } finally {
      setLoading(false);
    }
  }

  const handleOnboard = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await ApiClient.createPartnerPharmacy({ name: newName, address: {}, fulfillment_radius_km: parseFloat(newRadius) });
      setOnboardModalOpen(false);
      setNewName('');
      setNewRadius('8.0');
      addToast('success', 'Partner Onboarded', 'New partner pharmacy registered.');
      loadPartners();
    } catch (e: unknown) {
      addToast('error', 'Onboarding Failed', e instanceof Error ? e.message : 'Failed');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="app-content" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--sp-6)' }}>
      <PageHeader title="Partner Pharmacy Network" subtitle="Onboard and manage partner pharmacies for marketplace fulfillment." action={
        <button className="btn btn-primary" onClick={() => setOnboardModalOpen(true)}>+ Onboard Partner</button>
      } />

      {loading ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--sp-3)' }}>
          {[1, 2, 3].map(i => <div key={i} className="skeleton" style={{ height: '56px', borderRadius: 'var(--radius-lg)' }} />)}
        </div>
      ) : error ? (
        <div className="card" style={{ padding: 'var(--sp-6)', textAlign: 'center' }}>
          <IconAlertTriangle size={24} style={{ color: 'var(--danger)', margin: '0 auto var(--sp-3)' }} />
          <p style={{ color: 'var(--danger)' }}>{error}</p>
        </div>
      ) : (
        <div className="table-wrapper">
          <table className="table">
            <thead><tr><th>Name</th><th>Radius</th><th>Status</th></tr></thead>
            <tbody>
              {partners.map(p => (
                <tr key={p.partner_id}>
                  <td style={{ fontWeight: 600 }}>{p.name}</td>
                  <td>{p.fulfillment_radius_km} km</td>
                  <td><StatusBadge status={p.status} /></td>
                </tr>
              ))}
              {partners.length === 0 && <tr><td colSpan={3} style={{ textAlign: 'center', padding: 'var(--sp-8)' }}>No partners onboarded yet</td></tr>}
            </tbody>
          </table>
        </div>
      )}

      <Modal isOpen={onboardModalOpen} onClose={() => setOnboardModalOpen(false)} title="Onboard Partner Pharmacy">
        <form onSubmit={handleOnboard} className="flex flex-col gap-4">
          <div className="form-group"><label className="form-label">Pharmacy Name</label><input className="input" required value={newName} onChange={e => setNewName(e.target.value)} placeholder="e.g. Apollo Pharmacy" /></div>
          <div className="form-group"><label className="form-label">Fulfillment Radius (km)</label><input className="input" type="number" step="0.5" value={newRadius} onChange={e => setNewRadius(e.target.value)} /></div>
          <div className="modal-footer">
            <button type="button" className="btn btn-ghost" onClick={() => setOnboardModalOpen(false)}>Cancel</button>
            <button type="submit" className="btn btn-primary" disabled={submitting}>{submitting ? 'Creating...' : 'Create Partner'}</button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
