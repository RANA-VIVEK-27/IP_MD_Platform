'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { ApiClient } from '../../../lib/api';
import { PageHeader } from '../../../components/PageHeader';
import { StatusBadge } from '../../../components/Badges';
import { IconTruck, IconAlertTriangle } from '../../../components/Icons';
import type { PharmacyFulfillmentItem } from '../../../lib/types';

export default function PharmacyFulfillmentPage() {
  const router = useRouter();
  const [fulfillments, setFulfillments] = useState<PharmacyFulfillmentItem[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [filterStatus, setFilterStatus] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadFulfillments = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const params: Record<string, string | number> = { page, page_size: 20 };
      if (filterStatus) params.status = filterStatus;
      const res = await ApiClient.listPharmacyFulfillments(params);
      setFulfillments(res.data);
      setTotal(res.total);
    } catch (e: any) {
      if (e.status === 401) { router.push('/login'); return; }
      setError(e.message || 'Failed to load fulfillments');
    } finally {
      setLoading(false);
    }
  }, [page, filterStatus]);

  useEffect(() => { loadFulfillments(); }, [loadFulfillments]);

  const handleUpdateStatus = async (id: string, newStatus: string) => {
    try {
      await ApiClient.updatePharmacyFulfillment(id, newStatus);
      loadFulfillments();
    } catch (e: any) {
      alert(e.message || 'Failed to update fulfillment');
    }
  };

  return (
    <div className="app-content" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--sp-6)' }}>
      <PageHeader title="Fulfillment" subtitle={`Track and manage order fulfillment (${total} records)`} />

      {/* Filters */}
      <div className="card" style={{ padding: 'var(--sp-3) var(--sp-4)', display: 'flex', gap: 'var(--sp-3)', alignItems: 'center' }}>
        <span style={{ fontSize: 'var(--text-sm)', fontWeight: 600, color: 'var(--text-secondary)' }}>Filter:</span>
        <select
          value={filterStatus}
          onChange={e => { setFilterStatus(e.target.value); setPage(1); }}
          className="input"
          style={{ height: '36px', width: '180px', fontSize: 'var(--text-sm)' }}
        >
          <option value="">All Statuses</option>
          <option value="assigned">Assigned</option>
          <option value="dispatched">Dispatched</option>
          <option value="delivered">Delivered</option>
        </select>
      </div>

      {loading ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--sp-3)' }}>
          {[1, 2, 3].map(i => <div key={i} className="skeleton" style={{ height: '56px', borderRadius: 'var(--radius-lg)' }} />)}
        </div>
      ) : error ? (
        <div className="card" style={{ padding: 'var(--sp-6)', textAlign: 'center' }}>
          <IconAlertTriangle size={24} style={{ color: 'var(--danger)', margin: '0 auto var(--sp-3)' }} />
          <p style={{ color: 'var(--danger)' }}>{error}</p>
          <button className="btn btn-secondary btn-sm" style={{ marginTop: 'var(--sp-3)' }} onClick={loadFulfillments}>Retry</button>
        </div>
      ) : fulfillments.length === 0 ? (
        <div className="card" style={{ padding: 'var(--sp-10)', textAlign: 'center' }}>
          <IconTruck size={32} style={{ color: 'var(--text-muted)', margin: '0 auto var(--sp-3)', opacity: 0.4 }} />
          <p style={{ color: 'var(--text-secondary)' }}>No fulfillment records found.</p>
        </div>
      ) : (
        <>
          <div className="table-wrapper">
            <table className="table" role="table" aria-label="Fulfillment records">
              <thead>
                <tr>
                  <th scope="col">Order</th>
                  <th scope="col">Medicine</th>
                  <th scope="col" style={{ textAlign: 'right' }}>Qty</th>
                  <th scope="col" style={{ textAlign: 'center' }}>Source</th>
                  <th scope="col" style={{ textAlign: 'center' }}>Status</th>
                  <th scope="col">Dispatched</th>
                  <th scope="col">Delivered</th>
                  <th scope="col" style={{ textAlign: 'center' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {fulfillments.map(f => (
                  <tr key={f.fulfillment_record_id}>
                    <td style={{ fontFamily: 'monospace', fontSize: 'var(--text-sm)' }}>{f.order_id ? f.order_id.slice(0, 8) + '...' : '-'}</td>
                    <td style={{ fontWeight: 500 }}>{f.medicine_name}</td>
                    <td style={{ textAlign: 'right' }}>{f.quantity}</td>
                    <td style={{ textAlign: 'center' }}>
                      <span className="badge badge-info" style={{ fontSize: 'var(--text-xs)' }}>{f.source_type}</span>
                    </td>
                    <td style={{ textAlign: 'center' }}><StatusBadge status={f.status} /></td>
                    <td style={{ fontSize: 'var(--text-sm)', color: 'var(--text-secondary)' }}>{f.dispatched_at ? new Date(f.dispatched_at).toLocaleString() : '-'}</td>
                    <td style={{ fontSize: 'var(--text-sm)', color: 'var(--text-secondary)' }}>{f.delivered_at ? new Date(f.delivered_at).toLocaleString() : '-'}</td>
                    <td style={{ textAlign: 'center' }}>
                      {f.status === 'assigned' && (
                        <button onClick={() => handleUpdateStatus(f.fulfillment_record_id, 'dispatched')} className="btn btn-primary btn-sm">Dispatch</button>
                      )}
                      {f.status === 'dispatched' && (
                        <button onClick={() => handleUpdateStatus(f.fulfillment_record_id, 'delivered')} className="btn btn-sm" style={{ background: 'var(--success)', borderColor: 'var(--success)' }}>Deliver</button>
                      )}
                      {f.status === 'delivered' && (
                        <span style={{ color: 'var(--success)', fontSize: 'var(--text-xs)', fontWeight: 600 }}>Complete</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div style={{ display: 'flex', justifyContent: 'center', gap: 'var(--sp-2)', marginTop: 'var(--sp-2)' }}>
            <button className="btn btn-ghost btn-sm" disabled={page <= 1} onClick={() => setPage(p => p - 1)}>Previous</button>
            <span style={{ padding: 'var(--sp-2) var(--sp-3)', fontSize: 'var(--text-sm)', color: 'var(--text-secondary)' }}>Page {page}</span>
            <button className="btn btn-ghost btn-sm" disabled={fulfillments.length < 20} onClick={() => setPage(p => p + 1)}>Next</button>
          </div>
        </>
      )}
    </div>
  );
}
