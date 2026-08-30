'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '../../../lib/auth-context';
import { ApiClient } from '../../../lib/api';
import { ProfessionalStatusResponse } from '../../../lib/types';
import { IconShieldMedical, IconCheckCircle, IconClock, IconAlertCircle, IconChevronRight, IconHeartbeat, IconRefreshCw } from '../../../components/Icons';

export default function ProfessionalStatusPage() {
  const router = useRouter();
  const { user, isLoading: authLoading } = useAuth();
  const [status, setStatus] = useState<ProfessionalStatusResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [resubmitting, setResubmitting] = useState(false);

  useEffect(() => {
    if (!authLoading && !user) {
      router.replace('/professional/login');
      return;
    }
    if (user) {
      fetchStatus();
    }
  }, [user, authLoading, router]);

  const fetchStatus = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await ApiClient.getProfessionalStatus();
      setStatus(res);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to load status';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleResubmit = async () => {
    setResubmitting(true);
    try {
      await ApiClient.resubmitApplication({});
      await fetchStatus();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to resubmit';
      setError(msg);
    } finally {
      setResubmitting(false);
    }
  };

  if (authLoading || loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '60vh' }}>
        <div style={{ width: 40, height: 40, borderRadius: '50%', border: '3px solid var(--primary-light)', borderTopColor: 'var(--primary)', animation: 'spin 0.8s linear infinite' }} />
      </div>
    );
  }

  if (error && !status) {
    return (
      <div style={{ minHeight: 'calc(100vh - 60px)', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg-page)' }}>
        <div style={{ textAlign: 'center', maxWidth: '400px', padding: 'var(--sp-8)' }}>
          <IconAlertCircle size={48} style={{ color: 'var(--danger)', margin: '0 auto var(--sp-4)' }} />
          <h2 style={{ fontSize: 'var(--text-xl)', fontWeight: 700, color: 'var(--text-heading)', marginBottom: 'var(--sp-2)' }}>Unable to Load Status</h2>
          <p style={{ fontSize: 'var(--text-sm)', color: 'var(--text-secondary)', marginBottom: 'var(--sp-4)' }}>{error}</p>
          <button onClick={fetchStatus} className="btn btn-primary">
            <IconRefreshCw size={16} /> Retry
          </button>
        </div>
      </div>
    );
  }

  const professionalStatus = status?.professional_status;
  const verificationRequest = status?.verification_request;
  const credentials: ProfessionalStatusResponse['credentials'] = status?.credentials || [];
  const organizations: ProfessionalStatusResponse['organizations'] = status?.organizations || [];

  const getStatusConfig = () => {
    if (!professionalStatus || professionalStatus === 'draft') {
      return {
        color: 'var(--text-muted)',
        bg: 'var(--bg-muted)',
        border: 'var(--border)',
        icon: IconClock,
        title: 'No Application Submitted',
        description: 'You have not yet submitted a verification request.',
      };
    }
    if (professionalStatus === 'submitted' || professionalStatus === 'under_review') {
      return {
        color: 'var(--info)',
        bg: 'var(--info-bg)',
        border: 'var(--info-border)',
        icon: IconClock,
        title: 'Under Review',
        description: 'Your application is being reviewed by our verification team. This typically takes 2-5 business days.',
      };
    }
    if (professionalStatus === 'needs_information') {
      return {
        color: 'var(--warning)',
        bg: 'var(--warning-bg)',
        border: 'var(--warning-border)',
        icon: IconAlertCircle,
        title: 'Additional Information Required',
        description: 'The verification team requires additional information or documents to proceed.',
      };
    }
    if (professionalStatus === 'rejected') {
      return {
        color: 'var(--danger)',
        bg: 'var(--danger-bg)',
        border: 'var(--danger-border)',
        icon: IconAlertCircle,
        title: 'Application Rejected',
        description: verificationRequest?.rejection_reason || 'Your application has been rejected. Please review and resubmit.',
      };
    }
    if (professionalStatus === 'verified' || professionalStatus === 'active') {
      return {
        color: 'var(--success)',
        bg: 'var(--success-bg)',
        border: 'var(--success-border)',
        icon: IconCheckCircle,
        title: 'Verified',
        description: 'Your professional credentials have been verified. You have full access to clinical workflows.',
      };
    }
    if (professionalStatus === 'resubmitted') {
      return {
        color: 'var(--info)',
        bg: 'var(--info-bg)',
        border: 'var(--info-border)',
        icon: IconClock,
        title: 'Resubmitted',
        description: 'Your updated application has been resubmitted and is under review.',
      };
    }
    return {
      color: 'var(--text-muted)',
      bg: 'var(--bg-muted)',
      border: 'var(--border)',
      icon: IconClock,
      title: professionalStatus,
      description: 'Current status of your verification request.',
    };
  };

  const statusConfig = getStatusConfig();
  const StatusIcon = statusConfig.icon;

  const timeline = [
    { label: 'Application Submitted', done: !!verificationRequest?.submitted_at, date: verificationRequest?.submitted_at },
    { label: 'Under Review', done: professionalStatus === 'under_review' || professionalStatus === 'needs_information' || professionalStatus === 'resubmitted' || professionalStatus === 'verified' || professionalStatus === 'active', date: verificationRequest?.reviewed_at },
    { label: 'Decision', done: professionalStatus === 'verified' || professionalStatus === 'active' || professionalStatus === 'rejected', date: (verificationRequest as { decision_at?: string })?.decision_at },
  ];

  const canAccessDashboard = professionalStatus === 'verified' || professionalStatus === 'active';
  const dashboardHref = user?.role === 'doctor' ? '/doctor' : '/pharmacy/dashboard';

  return (
    <div style={{ minHeight: 'calc(100vh - 60px)', background: 'var(--bg-page)' }}>
      {/* Header */}
      <div style={{
        background: 'linear-gradient(135deg, #0B6E6B 0%, #095A58 40%, #0F2B3C 100%)',
        padding: 'var(--sp-8) var(--sp-6)',
        position: 'relative',
        overflow: 'hidden',
      }}>
        <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(circle at 30% 40%, rgba(20, 163, 199, 0.12) 0%, transparent 50%)' }} />
        <div style={{ position: 'relative', zIndex: 1, maxWidth: '800px', margin: '0 auto' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--sp-4)' }}>
            <div style={{ width: '56px', height: '56px', borderRadius: 'var(--radius-lg)', background: 'rgba(255,255,255,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <IconShieldMedical size={28} style={{ color: '#fff' }} />
            </div>
            <div>
              <h1 style={{ fontSize: 'var(--text-2xl)', fontWeight: 800, color: '#fff', letterSpacing: '-0.02em' }}>Verification Status</h1>
              <p style={{ fontSize: 'var(--text-sm)', color: 'rgba(255,255,255,0.6)' }}>Track your professional credential verification progress</p>
            </div>
          </div>
        </div>
      </div>

      <div style={{ maxWidth: '800px', margin: '0 auto', padding: 'var(--sp-6)' }}>
        {/* Status Card */}
        <div style={{
          padding: 'var(--sp-6)',
          background: statusConfig.bg,
          border: `1px solid ${statusConfig.border}`,
          borderRadius: 'var(--radius-xl)',
          marginBottom: 'var(--sp-6)',
        }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 'var(--sp-4)' }}>
            <div style={{
              width: '48px', height: '48px', borderRadius: '50%',
              background: `${statusConfig.color}20`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              flexShrink: 0,
            }}>
              <StatusIcon size={24} style={{ color: statusConfig.color }} />
            </div>
            <div style={{ flex: 1 }}>
              <h3 style={{ fontSize: 'var(--text-lg)', fontWeight: 700, color: statusConfig.color, marginBottom: 'var(--sp-1)' }}>
                {statusConfig.title}
              </h3>
              <p style={{ fontSize: 'var(--text-sm)', color: 'var(--text-secondary)', lineHeight: 1.6 }}>
                {statusConfig.description}
              </p>
            </div>
          </div>
        </div>

        {/* Timeline */}
        <div className="card" style={{ padding: 'var(--sp-6)', marginBottom: 'var(--sp-6)' }}>
          <h3 style={{ fontSize: 'var(--text-base)', fontWeight: 600, color: 'var(--text-heading)', marginBottom: 'var(--sp-5)' }}>
            Verification Timeline
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--sp-4)' }}>
            {timeline.map((item, i) => (
              <div key={item.label} style={{ display: 'flex', alignItems: 'flex-start', gap: 'var(--sp-3)' }}>
                <div style={{
                  width: '24px', height: '24px', borderRadius: '50%',
                  background: item.done ? 'var(--primary)' : 'var(--bg-muted)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  flexShrink: 0,
                }}>
                  {item.done ? (
                    <IconCheckCircle size={14} style={{ color: '#fff' }} />
                  ) : (
                    <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: 'var(--text-muted)' }} />
                  )}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 'var(--text-sm)', fontWeight: 500, color: item.done ? 'var(--text-primary)' : 'var(--text-muted)' }}>
                    {item.label}
                  </div>
                  {item.date && (
                    <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)', marginTop: '2px' }}>
                      {new Date(item.date).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Credentials */}
        {credentials.length > 0 && (
          <div className="card" style={{ padding: 'var(--sp-6)', marginBottom: 'var(--sp-6)' }}>
            <h3 style={{ fontSize: 'var(--text-base)', fontWeight: 600, color: 'var(--text-heading)', marginBottom: 'var(--sp-4)' }}>
              Credential Status
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--sp-3)' }}>
              {credentials.map((cred) => (
                <div key={cred.credential_id} style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  padding: 'var(--sp-3) var(--sp-4)',
                  background: 'var(--bg-soft)',
                  borderRadius: 'var(--radius-md)',
                }}>
                  <div>
                    <div style={{ fontSize: 'var(--text-sm)', fontWeight: 500, color: 'var(--text-primary)' }}>
                      {cred.credential_name || cred.credential_type}
                    </div>
                    {cred.registration_number && (
                      <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>
                        {cred.registration_number}
                      </div>
                    )}
                  </div>
                  <span className={`badge ${cred.status === 'verified' ? 'badge-success' : cred.status === 'rejected' ? 'badge-danger' : 'badge-warning'}`}>
                    {cred.status}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Organizations */}
        {organizations.length > 0 && (
          <div className="card" style={{ padding: 'var(--sp-6)', marginBottom: 'var(--sp-6)' }}>
            <h3 style={{ fontSize: 'var(--text-base)', fontWeight: 600, color: 'var(--text-heading)', marginBottom: 'var(--sp-4)' }}>
              Organization Memberships
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--sp-3)' }}>
              {organizations.map((org) => (
                <div key={org.membership_id} style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  padding: 'var(--sp-3) var(--sp-4)',
                  background: 'var(--bg-soft)',
                  borderRadius: 'var(--radius-md)',
                }}>
                  <div>
                    <div style={{ fontSize: 'var(--text-sm)', fontWeight: 500, color: 'var(--text-primary)' }}>
                      {org.organization_id}
                    </div>
                    <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>
                      Role: {org.role}
                    </div>
                  </div>
                  <span className={`badge ${org.status === 'active' ? 'badge-success' : org.status === 'revoked' ? 'badge-danger' : 'badge-warning'}`}>
                    {org.status}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Actions */}
        <div style={{ display: 'flex', gap: 'var(--sp-3)', flexWrap: 'wrap' }}>
          {canAccessDashboard && (
            <Link href={dashboardHref} className="btn btn-primary">
              Go to Dashboard <IconChevronRight size={16} />
            </Link>
          )}
          {(professionalStatus === 'needs_information' || professionalStatus === 'rejected') && (
            <button onClick={handleResubmit} disabled={resubmitting} className="btn btn-primary">
              {resubmitting ? 'Resubmitting...' : 'Resubmit Application'}
            </button>
          )}
          <button onClick={fetchStatus} className="btn btn-secondary">
            <IconRefreshCw size={16} /> Refresh Status
          </button>
        </div>

        {/* Help */}
        <div style={{
          marginTop: 'var(--sp-6)',
          padding: 'var(--sp-5)',
          background: 'var(--bg-soft)',
          borderRadius: 'var(--radius-lg)',
          border: '1px solid var(--border-light)',
        }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 'var(--sp-3)' }}>
            <IconHeartbeat size={20} style={{ color: 'var(--primary)', flexShrink: 0, marginTop: '2px' }} />
            <div>
              <h4 style={{ fontSize: 'var(--text-sm)', fontWeight: 600, color: 'var(--text-heading)', marginBottom: 'var(--sp-1)' }}>
                Need Help?
              </h4>
              <p style={{ fontSize: 'var(--text-sm)', color: 'var(--text-secondary)', lineHeight: 1.6 }}>
                If you have questions about the verification process, contact our support team at support@ipmd.in or call +91-XXX-XXX-XXXX.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
