'use client';

import React, { useState, useEffect } from 'react';
import { ApiClient } from '../../lib/api';
import { PageHeader } from '../../components/PageHeader';
import { Avatar } from '../../components/Avatar';
import { StatusBadge } from '../../components/Badges';
import { Modal, ConfirmModal } from '../../components/Modal';
import { useToast } from '../../components/Toast';

interface AdminAccount {
  user_id: string;
  full_name: string;
  email?: string;
  role: string;
  status: string;
}

export default function SuperAdminAccountsPage() {
  const { addToast } = useToast();
  const [admins, setAdmins] = useState<AdminAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [revokeModalOpen, setRevokeModalOpen] = useState(false);
  const [selectedAdmin, setSelectedAdmin] = useState<AdminAccount | null>(null);
  const [newName, setNewName] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newRole, setNewRole] = useState<'admin' | 'user_admin'>('admin');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => { loadAdmins(); }, []);

  async function loadAdmins() {
    setLoading(true);
    setError('');
    try {
      const res = await ApiClient.listAdminAccounts({ limit: 100 });
      setAdmins(res.data || []);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to load admin accounts');
    } finally { setLoading(false); }
  }

  const handleCreateAdmin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim() || !newEmail.trim()) return;
    setSubmitting(true);
    try {
      await ApiClient.createAdminAccount({ full_name: newName.trim(), email: newEmail.trim(), role: newRole, permissions: [] });
      setCreateModalOpen(false);
      setNewName('');
      setNewEmail('');
      addToast('success', 'Admin Created', 'New administrative account created successfully.');
      loadAdmins();
    } catch (e: unknown) {
      addToast('error', 'Creation Failed', e instanceof Error ? e.message : 'Failed to create admin account.');
    } finally { setSubmitting(false); }
  };

  const handleRevoke = async () => {
    if (!selectedAdmin) return;
    setSubmitting(true);
    try {
      await ApiClient.revokeAdminAccount(selectedAdmin.user_id);
      setRevokeModalOpen(false);
      setSelectedAdmin(null);
      addToast('warning', 'Access Revoked', `Admin privileges for ${selectedAdmin.full_name} have been revoked.`);
      loadAdmins();
    } catch (e: unknown) {
      addToast('error', 'Revocation Failed', e instanceof Error ? e.message : 'Failed to revoke admin access.');
    } finally { setSubmitting(false); }
  };

  return (
    <div className="app-content" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--sp-6)' }}>
      <PageHeader title="Admin & User Admin Governance" subtitle="Create, assign granular permissions, and revoke administrative accounts." action={
        <button className="btn btn-primary" onClick={() => setCreateModalOpen(true)}>+ Create Admin</button>
      } />

      {loading ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--sp-3)' }}>
          {[1, 2, 3].map(i => <div key={i} className="skeleton" style={{ height: '56px', borderRadius: 'var(--radius-lg)' }} />)}
        </div>
      ) : error ? (
        <div className="card" style={{ padding: 'var(--sp-6)', textAlign: 'center', color: 'var(--danger)' }}>{error}</div>
      ) : (
        <div className="table-wrapper">
          <table className="table">
            <thead><tr><th>Admin</th><th>Role</th><th>Status</th><th style={{ textAlign: 'right' }}>Actions</th></tr></thead>
            <tbody>
              {admins.length === 0 ? (
                <tr><td colSpan={4} style={{ textAlign: 'center', padding: 'var(--sp-8)', color: 'var(--text-muted)' }}>No admin accounts found. Create one to get started.</td></tr>
              ) : admins.map(adm => (
                <tr key={adm.user_id}>
                  <td>
                    <div className="flex items-center gap-3">
                      <Avatar name={adm.full_name} size="md" />
                      <div>
                        <div style={{ fontWeight: 600 }}>{adm.full_name}</div>
                        <div className="text-caption">{adm.email || 'No email'}</div>
                      </div>
                    </div>
                  </td>
                  <td><span className="badge badge-info">{adm.role.replace(/_/g, ' ')}</span></td>
                  <td><StatusBadge status={adm.status} /></td>
                  <td style={{ textAlign: 'right' }}>
                    <button className="btn btn-danger btn-sm" onClick={() => { setSelectedAdmin(adm); setRevokeModalOpen(true); }}>Revoke</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Modal isOpen={createModalOpen} onClose={() => setCreateModalOpen(false)} title="Create New Administrative Account">
        <form onSubmit={handleCreateAdmin} className="flex flex-col gap-4">
          <div className="form-group">
            <label className="form-label">Full Name</label>
            <input className="input" required value={newName} onChange={e => setNewName(e.target.value)} placeholder="e.g. Ramesh Chandra" />
          </div>
          <div className="form-group">
            <label className="form-label">Work Email</label>
            <input className="input" type="email" required value={newEmail} onChange={e => setNewEmail(e.target.value)} placeholder="e.g. ramesh.admin@ipmd.in" />
          </div>
          <div className="form-group">
            <label className="form-label">Administrative Tier</label>
            <select className="select" value={newRole} onChange={e => setNewRole(e.target.value as 'admin' | 'user_admin')}>
              <option value="admin">Operations Admin</option>
              <option value="user_admin">User Admin</option>
            </select>
          </div>
          <div className="modal-footer">
            <button type="button" className="btn btn-ghost" onClick={() => setCreateModalOpen(false)}>Cancel</button>
            <button type="submit" className="btn btn-primary" disabled={submitting}>{submitting ? 'Creating...' : 'Create Admin Account'}</button>
          </div>
        </form>
      </Modal>

      <ConfirmModal
        isOpen={revokeModalOpen}
        onClose={() => { setRevokeModalOpen(false); setSelectedAdmin(null); }}
        onConfirm={handleRevoke}
        title="Revoke Admin Access"
        message={`Are you sure you want to revoke all administrative privileges for ${selectedAdmin?.full_name}? This action will be logged in the audit trail.`}
        confirmLabel="Revoke Access"
        variant="danger"
      />
    </div>
  );
}
