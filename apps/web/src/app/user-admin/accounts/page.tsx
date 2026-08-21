'use client';

import React, { useState } from 'react';
import { PageHeader } from '../../../components/PageHeader';
import { Avatar } from '../../../components/Avatar';
import { StatusBadge } from '../../../components/Badges';
import { Modal } from '../../../components/Modal';
import { useToast } from '../../../components/Toast';
import { IconSearch } from '../../../components/Icons';

export default function UserAdminAccountsPage() {
  const { addToast } = useToast();
  const [search, setSearch] = useState('');
  const [accounts, setAccounts] = useState([
    {
      id: 'usr-101',
      name: 'Rahul Sharma',
      email: 'rahul.sharma@example.com',
      role: 'patient',
      status: 'active',
      joinedAt: 'Jul 12, 2026',
    },
    {
      id: 'usr-102',
      name: 'Dr. Ananya Sen',
      email: 'dr.ananya@ipmd.in',
      role: 'doctor',
      status: 'active',
      joinedAt: 'Jul 10, 2026',
    },
    {
      id: 'usr-103',
      name: 'Rohan Gupta',
      email: 'rohan.g@example.com',
      role: 'patient',
      status: 'suspended',
      joinedAt: 'Aug 02, 2026',
    },
    {
      id: 'usr-104',
      name: 'Vikram Joshi',
      email: 'vikram.j@pharmacy.in',
      role: 'pharmacy_staff_owned',
      status: 'active',
      joinedAt: 'Jul 15, 2026',
    },
  ]);

  const [statusModalOpen, setStatusModalOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<any>(null);
  const [actionType, setActionType] = useState<'suspend' | 'reinstate'>('suspend');
  const [reasonCode, setReasonCode] = useState('');

  const handleOpenStatusModal = (user: any, type: 'suspend' | 'reinstate') => {
    setSelectedUser(user);
    setActionType(type);
    setReasonCode('');
    setStatusModalOpen(true);
  };

  const handleConfirmStatus = () => {
    setAccounts((prev) =>
      prev.map((acc) =>
        acc.id === selectedUser.id
          ? { ...acc, status: actionType === 'suspend' ? 'suspended' : 'active' }
          : acc
      )
    );
    setStatusModalOpen(false);
    addToast(
      actionType === 'suspend' ? 'warning' : 'success',
      actionType === 'suspend' ? 'Account Suspended' : 'Account Reinstated',
      `${selectedUser.name} has been ${actionType === 'suspend' ? 'suspended' : 'reinstated'}.`
    );
  };

  const filtered = accounts.filter(
    (a) =>
      a.name.toLowerCase().includes(search.toLowerCase()) ||
      a.email.toLowerCase().includes(search.toLowerCase()) ||
      a.role.toLowerCase().includes(search.toLowerCase())
  );

  const activeCount = accounts.filter((a) => a.status === 'active').length;
  const suspendedCount = accounts.filter((a) => a.status === 'suspended').length;

  return (
    <div className="app-content" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--sp-6)' }}>
      <PageHeader
        title="Account Management"
        subtitle="Search user accounts across patient, doctor, and pharmacy staff roles. Live suspend/reinstate controls."
      />

      {/* Summary Stats */}
      <div className="grid-3" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))' }}>
        <div className="card" style={{ textAlign: 'center', padding: 'var(--sp-4)' }}>
          <div className="text-overline" style={{ marginBottom: 'var(--sp-1)' }}>Total Accounts</div>
          <div className="tabular-nums" style={{ fontSize: 'var(--text-2xl)', fontWeight: 700, color: 'var(--text-primary)' }}>
            {accounts.length}
          </div>
        </div>
        <div className="card" style={{ textAlign: 'center', padding: 'var(--sp-4)' }}>
          <div className="text-overline" style={{ marginBottom: 'var(--sp-1)' }}>Active</div>
          <div className="tabular-nums" style={{ fontSize: 'var(--text-2xl)', fontWeight: 700, color: 'var(--success)' }}>
            {activeCount}
          </div>
        </div>
        <div className="card" style={{ textAlign: 'center', padding: 'var(--sp-4)' }}>
          <div className="text-overline" style={{ marginBottom: 'var(--sp-1)' }}>Suspended</div>
          <div className="tabular-nums" style={{ fontSize: 'var(--text-2xl)', fontWeight: 700, color: 'var(--danger)' }}>
            {suspendedCount}
          </div>
        </div>
      </div>

      {/* Search Input */}
      <div className="search-input-wrapper">
        <IconSearch size={16} className="search-icon" />
        <input
          type="text"
          className="input"
          placeholder="Search by name, email, or role..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          aria-label="Search accounts"
        />
      </div>

      <div className="table-wrapper">
        <table className="table" role="table" aria-label="User accounts">
          <thead>
            <tr>
              <th scope="col">User ID</th>
              <th scope="col">Full Name</th>
              <th scope="col">Email Address</th>
              <th scope="col">Role</th>
              <th scope="col">Status</th>
              <th scope="col" style={{ textAlign: 'right' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((acc) => (
              <tr key={acc.id}>
                <td>
                  <span style={{ fontFamily: 'monospace', fontSize: 'var(--text-sm)', color: 'var(--text-secondary)' }}>{acc.id}</span>
                </td>
                <td>
                  <div className="flex items-center gap-3">
                    <Avatar name={acc.name} size="sm" />
                    <span style={{ fontWeight: 600, fontSize: 'var(--text-base)' }}>{acc.name}</span>
                  </div>
                </td>
                <td>
                  <span className="text-caption">{acc.email}</span>
                </td>
                <td>
                  <span className="badge badge-neutral" style={{ textTransform: 'capitalize' }}>
                    {acc.role.replace(/_/g, ' ')}
                  </span>
                </td>
                <td><StatusBadge status={acc.status} /></td>
                <td style={{ textAlign: 'right' }}>
                  {acc.status === 'active' ? (
                    <button
                      className="btn btn-danger btn-sm"
                      onClick={() => handleOpenStatusModal(acc, 'suspend')}
                    >
                      Suspend
                    </button>
                  ) : (
                    <button
                      className="btn btn-primary btn-sm"
                      onClick={() => handleOpenStatusModal(acc, 'reinstate')}
                    >
                      Reinstate
                    </button>
                  )}
                </td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={6} style={{ textAlign: 'center', padding: 'var(--sp-10)' }}>
                  <div className="flex flex-col items-center gap-3" style={{ color: 'var(--text-secondary)' }}>
                    <IconSearch size={32} style={{ opacity: 0.4 }} />
                    <span style={{ fontSize: 'var(--text-base)' }}>No accounts match your search</span>
                  </div>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Status Modal */}
      <Modal
        isOpen={statusModalOpen}
        onClose={() => setStatusModalOpen(false)}
        title={actionType === 'suspend' ? 'Suspend User Account' : 'Reinstate User Account'}
      >
        <div className="flex flex-col gap-4">
          <div className="flex items-center gap-3" style={{ padding: 'var(--sp-3)', background: 'var(--bg-page)', borderRadius: 'var(--radius-md)' }}>
            <Avatar name={selectedUser?.name || ''} size="lg" />
            <div>
              <div style={{ fontWeight: 600 }}>{selectedUser?.name}</div>
              <div className="text-caption">{selectedUser?.email}</div>
            </div>
          </div>

          <p style={{ fontSize: 'var(--text-sm)', color: 'var(--text-secondary)' }}>
            {actionType === 'suspend'
              ? 'Suspending this account will immediately revoke access token issuance and invalidate live API calls on all subsequent requests.'
              : 'Reinstating this account will restore active login capabilities.'}
          </p>

          <div className="form-group">
            <label className="form-label">Mandatory Reason Code / Justification</label>
            <input
              type="text"
              className="input"
              required
              placeholder="e.g. SUSPICIOUS_ACTIVITY, IDENTITY_MISMATCH, SUPPORT_REQUEST..."
              value={reasonCode}
              onChange={(e) => setReasonCode(e.target.value)}
            />
          </div>

          <div className="modal-footer">
            <button className="btn btn-ghost" onClick={() => setStatusModalOpen(false)}>
              Cancel
            </button>
            <button
              className={`btn ${actionType === 'suspend' ? 'btn-danger' : 'btn-primary'}`}
              disabled={!reasonCode.trim()}
              onClick={handleConfirmStatus}
            >
              {actionType === 'suspend' ? 'Confirm Suspension' : 'Confirm Reinstatement'}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
