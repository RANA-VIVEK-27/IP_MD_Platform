'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../../../lib/auth-context';
import { ApiClient, ApiError } from '../../../lib/api';
import { PageHeader } from '../../../components/PageHeader';
import { LoadingSpinner } from '../../../components/LoadingSpinner';
import { useToast } from '../../../components/Toast';

const roleLabels: Record<string, string> = {
  patient: 'Patient',
  doctor: 'Doctor',
  pharmacist: 'Pharmacist',
  pharmacy_admin: 'Pharmacy Admin',
  pharmacy_staff_owned: 'Pharmacy Staff',
  partner_pharmacy: 'Partner Pharmacy',
  admin: 'Platform Admin',
  user_admin: 'User Admin',
  super_admin: 'Super Admin',
};

const statusColors: Record<string, { color: string; bg: string }> = {
  active: { color: 'var(--success)', bg: 'var(--success-bg)' },
  pending: { color: 'var(--warning, #d97706)', bg: 'var(--warning-bg, #fef3c7)' },
  suspended: { color: 'var(--danger)', bg: 'var(--danger-bg)' },
};

export default function PatientProfilePage() {
  const { user, logout } = useAuth();
  const router = useRouter();
  const { addToast } = useToast();
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    async function load() {
      try {
        setLoading(true);
        const me = await ApiClient.getMe();
        setProfile(me);
      } catch (err) {
        if (err instanceof ApiError) {
          setError(err.message);
        } else {
          setError('Failed to load profile');
        }
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  const handleSignOut = () => {
    logout();
    router.push('/');
  };

  if (loading) {
    return (
      <div style={{ maxWidth: '640px', margin: '0 auto', padding: 'var(--sp-6) 0' }}>
        <LoadingSpinner />
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ maxWidth: '640px', margin: '0 auto' }}>
        <PageHeader title="My Profile" subtitle="View and manage your account." />
        <div className="card" style={{ padding: 'var(--sp-6)', textAlign: 'center', color: 'var(--danger)' }}>
          {error}
        </div>
      </div>
    );
  }

  const p = profile || user;
  const statusStyle = statusColors[p?.status] || statusColors.active;
  const joinDate = p?.created_at ? new Date(p.created_at).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }) : 'N/A';

  return (
    <div style={{ maxWidth: '640px', margin: '0 auto' }}>
      <PageHeader
        title="My Profile"
        subtitle="View and manage your account information."
        action={
          <button className="btn btn-ghost" onClick={handleSignOut} style={{ color: 'var(--danger)', fontSize: 'var(--text-xs)' }}>
            Sign Out
          </button>
        }
      />

      <div className="card" style={{ padding: 'var(--sp-6)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--sp-4)', marginBottom: 'var(--sp-6)' }}>
          <div style={{
            width: '64px', height: '64px', borderRadius: '50%',
            background: 'var(--primary-lighter)', color: 'var(--primary)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 'var(--text-xl)', fontWeight: 700, flexShrink: 0,
          }}>
            {p?.full_name?.charAt(0)?.toUpperCase() || '?'}
          </div>
          <div>
            <h2 style={{ fontSize: 'var(--text-lg)', fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>
              {p?.full_name}
            </h2>
            <p style={{ fontSize: 'var(--text-sm)', color: 'var(--text-muted)', margin: '2px 0 0' }}>
              {p?.email}
            </p>
          </div>
        </div>

        <div style={{ display: 'grid', gap: 'var(--sp-4)' }}>
          <InfoRow label="Role" value={roleLabels[p?.role] || p?.role} />
          <InfoRow
            label="Account Status"
            value={
              <span style={{
                display: 'inline-flex', alignItems: 'center', gap: '4px',
                padding: '2px 10px', borderRadius: 'var(--radius-pill)',
                fontSize: 'var(--text-xs)', fontWeight: 600,
                color: statusStyle.color, background: statusStyle.bg,
              }}>
                {p?.status?.charAt(0)?.toUpperCase() + p?.status?.slice(1)}
              </span>
            }
          />
          <InfoRow label="Phone" value={p?.phone || 'Not provided'} />
          <InfoRow label="Member Since" value={joinDate} />
          <InfoRow label="User ID" value={p?.user_id?.slice(0, 8) + '...'} />
        </div>
      </div>

      <div className="card" style={{ padding: 'var(--sp-4)', marginTop: 'var(--sp-4)' }}>
        <p style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)', textAlign: 'center' }}>
          To update your profile information, please contact support.
        </p>
      </div>
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div style={{
      display: 'flex', justifyContent: 'space-between', alignItems: 'center',
      padding: 'var(--sp-3) 0',
      borderBottom: '1px solid var(--border-light)',
    }}>
      <span style={{ fontSize: 'var(--text-sm)', color: 'var(--text-muted)' }}>{label}</span>
      <span style={{ fontSize: 'var(--text-sm)', fontWeight: 500, color: 'var(--text-primary)' }}>{value}</span>
    </div>
  );
}
