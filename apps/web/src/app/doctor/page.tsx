'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { ApiClient, ApiError } from '../../lib/api';
import { PageHeader } from '../../components/PageHeader';
import { Avatar } from '../../components/Avatar';
import { ConfidenceIndicator } from '../../components/Badges';
import { IconShieldCheck, IconAlertTriangle, IconSearch, IconClock } from '../../components/Icons';
import { VerificationQueueItem } from '../../lib/types';

export default function DoctorQueuePage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('pending_review');
  const [queueItems, setQueueItems] = useState<VerificationQueueItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    loadQueue();
  }, [statusFilter]);

  async function loadQueue() {
    setLoading(true);
    setError('');
    try {
      const params: Record<string, string | number> = { limit: 50 };
      if (statusFilter !== 'all') params.status = statusFilter;
      const res = await ApiClient.getVerificationQueue(params);
      setQueueItems(res.data || []);
    } catch (e: unknown) {
      const msg = e instanceof ApiError ? e.message : 'Failed to load queue';
      setError(msg);
    } finally {
      setLoading(false);
    }
  }

  const filtered = queueItems.filter((item) => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return item.prescription_id.toLowerCase().includes(q) || item.patient_ref.toLowerCase().includes(q);
  });

  const slaUrgent = queueItems.filter(i => i.sla_breach).length;

  return (
    <div className="app-content" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--sp-6)' }}>
      <PageHeader
        title="Doctor Verification Queue"
        subtitle="Review and clinically verify AI-extracted prescriptions within the 12-hour platform SLA."
        action={
          <div className="flex items-center gap-3">
            {slaUrgent > 0 && (
              <span className="badge badge-danger" style={{ gap: 'var(--sp-1)' }}>
                <IconAlertTriangle size={12} />
                {slaUrgent} SLA Urgent
              </span>
            )}
            <span className="badge badge-info">{queueItems.length} Pending</span>
          </div>
        }
      />

      <div className="card" style={{ padding: 'var(--sp-4)' }}>
        <div className="flex items-center gap-4" style={{ flexWrap: 'wrap' }}>
          <div className="search-input-wrapper" style={{ flex: 1, minWidth: '240px' }}>
            <IconSearch size={16} className="search-icon" />
            <input type="text" className="input" placeholder="Search by patient name or prescription ID..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} aria-label="Search prescriptions" />
          </div>
          <select className="select" style={{ width: 'auto', minWidth: '160px' }} value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} aria-label="Filter by status">
            <option value="pending_review">Pending Review</option>
            <option value="doctor_verified">Verified</option>
            <option value="rejected">Rejected</option>
            <option value="all">All</option>
          </select>
        </div>
      </div>

      {loading ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--sp-3)' }}>
          {[1, 2, 3].map(i => <div key={i} className="skeleton" style={{ height: '64px', borderRadius: 'var(--radius-lg)' }} />)}
        </div>
      ) : error ? (
        <div className="card" style={{ padding: 'var(--sp-6)', textAlign: 'center' }}>
          <IconAlertTriangle size={24} style={{ color: 'var(--danger)', margin: '0 auto var(--sp-3)' }} />
          <p style={{ color: 'var(--danger)' }}>{error}</p>
          <button className="btn btn-secondary btn-sm" style={{ marginTop: 'var(--sp-3)' }} onClick={loadQueue}>Retry</button>
        </div>
      ) : (
        <div className="table-wrapper">
          <table className="table" role="table" aria-label="Prescription verification queue">
            <thead>
              <tr>
                <th scope="col">Prescription ID</th>
                <th scope="col">Patient Ref</th>
                <th scope="col">Extraction</th>
                <th scope="col">Verification</th>
                <th scope="col">SLA</th>
                <th scope="col" style={{ textAlign: 'right' }}>Action</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((item) => (
                <tr key={item.prescription_id} className="table-row-clickable" role="row">
                  <td>
                    <span style={{ fontFamily: 'monospace', fontWeight: 600, color: 'var(--primary)', fontSize: 'var(--text-sm)' }}>
                      {item.prescription_id.slice(0, 8)}
                    </span>
                  </td>
                  <td>
                    <div className="flex items-center gap-3">
                      <Avatar name={item.patient_ref} size="sm" />
                      <span style={{ fontWeight: 500, fontSize: 'var(--text-base)' }}>{item.patient_ref.slice(0, 8)}</span>
                    </div>
                  </td>
                  <td><span className="badge badge-neutral">{item.extraction_status}</span></td>
                  <td><span className={`badge ${item.verification_status === 'doctor_verified' ? 'badge-success' : item.verification_status === 'rejected' ? 'badge-danger' : 'badge-warning'}`}>{item.verification_status.replace(/_/g, ' ')}</span></td>
                  <td>
                    {item.sla_breach ? (
                      <span className="badge badge-danger" style={{ gap: 'var(--sp-1)' }}><IconAlertTriangle size={12} />Overdue</span>
                    ) : (
                      <span className="badge badge-neutral" style={{ gap: 'var(--sp-1)' }}><IconClock size={12} />OK</span>
                    )}
                  </td>
                  <td style={{ textAlign: 'right' }}>
                    {item.verification_status === 'pending_review' && (
                      <Link href={`/doctor/prescriptions/${item.prescription_id}`} className="btn btn-primary btn-sm">
                        <IconShieldCheck size={14} /><span>Review</span>
                      </Link>
                    )}
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={6} style={{ textAlign: 'center', padding: 'var(--sp-10)' }}>
                    <div className="flex flex-col items-center gap-3" style={{ color: 'var(--text-secondary)' }}>
                      <IconSearch size={32} style={{ opacity: 0.4 }} />
                      <span style={{ fontSize: 'var(--text-base)' }}>No prescriptions match your filters</span>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
