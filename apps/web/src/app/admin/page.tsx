'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useAuth } from '../../lib/auth-context';
import { ApiClient } from '../../lib/api';
import { PageHeader } from '../../components/PageHeader';
import { KPICard } from '../../components/KPICard';
import { IconActivity, IconShieldCheck, IconAlertTriangle, IconFileText, IconClock } from '../../components/Icons';
import { DashboardSummary, Dispute } from '../../lib/types';

const PHARMACY_ROLES = ['pharmacy_staff_owned', 'partner_pharmacy'];

export default function AdminDashboardPage() {
  const { user } = useAuth();
  const isAdmin = user && !PHARMACY_ROLES.includes(user.role);
  const [kpis, setKpis] = useState<DashboardSummary>({ orders_today: 0, fulfillment_sla_breach_count: 0, doctor_verification_queue_depth: 0, payment_success_rate_30d: 0 });
  const [disputes, setDisputes] = useState<Dispute[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        if (isAdmin) {
          const [summaryRes, disputesRes] = await Promise.allSettled([
            ApiClient.getAdminDashboardSummary(),
            ApiClient.listDisputes({ limit: 5 }),
          ]);
          if (summaryRes.status === 'fulfilled') setKpis(summaryRes.value);
          if (disputesRes.status === 'fulfilled') setDisputes(disputesRes.value.data || []);
        }
      } catch {} finally {
        setLoading(false);
      }
    }
    load();
  }, [isAdmin]);

  const isPartner = user?.role === 'partner_pharmacy';
  const isOwnedPharmacy = user?.role === 'pharmacy_staff_owned';
  const dashboardTitle = isPartner ? 'Partner Pharmacy Dashboard' : isOwnedPharmacy ? 'Pharmacy Dashboard' : 'Operations Admin Dashboard';
  const dashboardSubtitle = isPartner || isOwnedPharmacy
    ? 'Manage your orders, fulfillment, and inventory.'
    : 'Platform operations overview, fulfillment tracking, and SLA compliance monitoring.';

  return (
    <div className="app-content" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--sp-6)' }}>
      <PageHeader title={dashboardTitle} subtitle={dashboardSubtitle} />

      {loading ? (
        <div className="grid-4">
          {[1, 2, 3, 4].map(i => <div key={i} className="skeleton" style={{ height: '120px', borderRadius: 'var(--radius-lg)' }} />)}
        </div>
      ) : isAdmin ? (
        <div className="grid-4">
          <KPICard title="Orders Today" value={kpis.orders_today} icon={<IconActivity size={18} />} />
          <KPICard title="SLA Breaches" value={kpis.fulfillment_sla_breach_count} isWarning={kpis.fulfillment_sla_breach_count > 0} icon={<IconAlertTriangle size={18} />} />
          <KPICard title="Verification Queue" value={kpis.doctor_verification_queue_depth} icon={<IconShieldCheck size={18} />} />
          <KPICard title="Payment Success" value={`${kpis.payment_success_rate_30d}%`} icon={<IconFileText size={18} />} />
        </div>
      ) : (
        <div className="grid-2">
          <KPICard title="My Role" value={user?.role?.replace(/_/g, ' ') || 'N/A'} icon={<IconActivity size={18} />} />
          <KPICard title="Account Status" value={user?.status || 'N/A'} icon={<IconShieldCheck size={18} />} />
        </div>
      )}

      {isAdmin && (
        <div className="grid-2">
          <div className="card" style={{ display: 'flex', flexDirection: 'column' }}>
            <div className="card-header" style={{ marginBottom: 0 }}>
              <div className="flex items-center gap-3">
                <IconAlertTriangle size={16} style={{ color: 'var(--warning)' }} />
                <h3 className="section-title">Active Order Disputes</h3>
              </div>
              <Link href="/admin/disputes" className="btn btn-ghost btn-sm">View All</Link>
            </div>
            <div className="flex flex-col" style={{ marginTop: 'var(--sp-3)' }}>
              {disputes.length === 0 ? (
                <p className="text-caption" style={{ padding: 'var(--sp-4)', textAlign: 'center' }}>No active disputes</p>
              ) : (
                disputes.map((d, idx) => (
                  <div key={d.dispute_id} className="flex items-center justify-between" style={{ padding: 'var(--sp-3) 0', borderBottom: idx < disputes.length - 1 ? '1px solid var(--border-light)' : 'none' }}>
                    <div className="flex items-center gap-3" style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ width: '36px', height: '36px', borderRadius: 'var(--radius-md)', background: 'var(--danger-bg)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                        <IconAlertTriangle size={16} style={{ color: 'var(--danger)' }} />
                      </div>
                      <div style={{ minWidth: 0 }}>
                        <div style={{ fontWeight: 600, fontSize: 'var(--text-base)' }}>Order #{d.order_id.slice(0, 8)}</div>
                        <div className="text-caption truncate">{d.dispute_type.replace(/_/g, ' ')}</div>
                      </div>
                    </div>
                    <Link href="/admin/disputes" className="btn btn-secondary btn-sm">Resolve</Link>
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="card" style={{ display: 'flex', flexDirection: 'column' }}>
            <div className="card-header" style={{ marginBottom: 0 }}>
              <div className="flex items-center gap-3">
                <IconActivity size={16} style={{ color: 'var(--primary)' }} />
                <h3 className="section-title">Quick Actions</h3>
              </div>
            </div>
            <div className="flex flex-col gap-2" style={{ marginTop: 'var(--sp-3)' }}>
              <Link href="/admin/partners" className="btn btn-secondary" style={{ justifyContent: 'flex-start' }}>Manage Partner Pharmacies</Link>
              <Link href="/admin/verification" className="btn btn-secondary" style={{ justifyContent: 'flex-start' }}>SLA Escalation Queue</Link>
              <Link href="/admin/disputes" className="btn btn-secondary" style={{ justifyContent: 'flex-start' }}>Resolve Disputes</Link>
            </div>
          </div>
        </div>
      )}

      {(isPartner || isOwnedPharmacy) && (
        <div className="grid-2">
          <div className="card" style={{ display: 'flex', flexDirection: 'column' }}>
            <div className="card-header" style={{ marginBottom: 0 }}>
              <div className="flex items-center gap-3">
                <IconActivity size={16} style={{ color: 'var(--primary)' }} />
                <h3 className="section-title">Quick Actions</h3>
              </div>
            </div>
            <div className="flex flex-col gap-2" style={{ marginTop: 'var(--sp-3)' }}>
              <Link href="/patient/orders" className="btn btn-secondary" style={{ justifyContent: 'flex-start' }}>View Orders</Link>
              <Link href="/patient/catalog" className="btn btn-secondary" style={{ justifyContent: 'flex-start' }}>Browse Catalog</Link>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
