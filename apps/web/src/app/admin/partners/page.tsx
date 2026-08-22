'use client';

import React, { useState, useEffect } from 'react';
import { ApiClient } from '../../../lib/api';
import { PageHeader } from '../../../components/PageHeader';
import { StatusBadge } from '../../../components/Badges';
import { Modal } from '../../../components/Modal';
import { useToast } from '../../../components/Toast';
import { IconAlertTriangle } from '../../../components/Icons';
import { PartnerPharmacyAdmin } from '../../../lib/types';

export default function AdminPartnersPage() {
  const { addToast } = useToast();
  const [partners, setPartners] = useState<PartnerPharmacyAdmin[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [onboardModalOpen, setOnboardModalOpen] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [selectedPartner, setSelectedPartner] = useState<PartnerPharmacyAdmin | null>(null);
  const [newName, setNewName] = useState('');
  const [newAddress, setNewAddress] = useState('');
  const [newRadius, setNewRadius] = useState('8.0');
  const [editRadius, setEditRadius] = useState('');
  const [editStatus, setEditStatus] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => { loadPartners(); }, []);

  async function loadPartners() {
    setLoading(true);
    setError('');
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
    if (!newName.trim()) return;
    setSubmitting(true);
    try {
      const address = newAddress.trim() ? { street: newAddress.trim() } : {};
      await ApiClient.createPartnerPharmacy({ name: newName.trim(), address, fulfillment_radius_km: parseFloat(newRadius) || 8 });
      setOnboardModalOpen(false);
      setNewName('');
      setNewAddress('');
      setNewRadius('8.0');
      addToast('success', 'Partner Onboarded', 'New partner pharmacy registered successfully.');
      loadPartners();
    } catch (e: unknown) {
      addToast('error', 'Onboarding Failed', e instanceof Error ? e.message : 'Failed to onboard partner.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPartner) return;
    setSubmitting(true);
    try {
      await ApiClient.updatePartnerPharmacy(selectedPartner.partner_id, {
        fulfillment_radius_km: parseFloat(editRadius) || selectedPartner.fulfillment_radius_km,
        status: editStatus || selectedPartner.status,
      });
      setEditModalOpen(false);
      setSelectedPartner(null);
      addToast('success', 'Partner Updated', 'Partner pharmacy details updated.');
      loadPartners();
    } catch (e: unknown) {
      addToast('error', 'Update Failed', e instanceof Error ? e.message : 'Failed to update partner.');
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
            <thead><tr><th>Name</th><th>Radius</th><th>Status</th><th style={{ textAlign: 'right' }}>Actions</th></tr></thead>
            <tbody>
              {partners.map(p => (
                <tr key={p.partner_id}>
                  <td style={{ fontWeight: 600 }}>{p.name}</td>
                  <td>{p.fulfillment_radius_km} km</td>
                  <td><StatusBadge status={p.status} /></td>
                  <td style={{ textAlign: 'right' }}>
                    <button className="btn btn-secondary btn-sm" onClick={() => {
                      setSelectedPartner(p);
                      setEditRadius(String(p.fulfillment_radius_km));
                      setEditStatus(p.status);
                      setEditModalOpen(true);
                    }}>Edit</button>
                  </td>
                </tr>
              ))}
              {partners.length === 0 && <tr><td colSpan={4} style={{ textAlign: 'center', padding: 'var(--sp-8)', color: 'var(--text-muted)' }}>No partners onboarded yet. Click "Onboard Partner" to add one.</td></tr>}
            </tbody>
          </table>
        </div>
      )}

      {/* Onboard Modal */}
      <Modal isOpen={onboardModalOpen} onClose={() => setOnboardModalOpen(false)} title="Onboard Partner Pharmacy">
        <form onSubmit={handleOnboard} className="flex flex-col gap-4">
          <div className="form-group">
            <label className="form-label">Pharmacy Name *</label>
            <input className="input" required value={newName} onChange={e => setNewName(e.target.value)} placeholder="e.g. Apollo Pharmacy" />
          </div>
          <div className="form-group">
            <label className="form-label">Address</label>
            <input className="input" value={newAddress} onChange={e => setNewAddress(e.target.value)} placeholder="e.g. 123 MG Road, Mumbai" />
          </div>
          <div className="form-group">
            <label className="form-label">Fulfillment Radius (km)</label>
            <input className="input" type="number" step="0.5" min={1} max={100} value={newRadius} onChange={e => setNewRadius(e.target.value)} />
          </div>
          <div className="modal-footer">
            <button type="button" className="btn btn-ghost" onClick={() => setOnboardModalOpen(false)}>Cancel</button>
            <button type="submit" className="btn btn-primary" disabled={submitting}>{submitting ? 'Creating...' : 'Create Partner'}</button>
          </div>
        </form>
      </Modal>

      {/* Edit Modal */}
      <Modal isOpen={editModalOpen} onClose={() => { setEditModalOpen(false); setSelectedPartner(null); }} title={`Edit: ${selectedPartner?.name || ''}`}>
        <form onSubmit={handleEdit} className="flex flex-col gap-4">
          <div className="form-group">
            <label className="form-label">Fulfillment Radius (km)</label>
            <input className="input" type="number" step="0.5" min={1} max={100} value={editRadius} onChange={e => setEditRadius(e.target.value)} />
          </div>
          <div className="form-group">
            <label className="form-label">Status</label>
            <select className="select" value={editStatus} onChange={e => setEditStatus(e.target.value)}>
              <option value="pending_activation">Pending Activation</option>
              <option value="active">Active</option>
              <option value="suspended">Suspended</option>
              <option value="delisted">Delisted</option>
            </select>
          </div>
          <div className="modal-footer">
            <button type="button" className="btn btn-ghost" onClick={() => { setEditModalOpen(false); setSelectedPartner(null); }}>Cancel</button>
            <button type="submit" className="btn btn-primary" disabled={submitting}>{submitting ? 'Saving...' : 'Save Changes'}</button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
