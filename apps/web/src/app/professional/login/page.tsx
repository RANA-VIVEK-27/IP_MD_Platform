'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth, ROLE_REDIRECTS } from '../../../lib/auth-context';
import { ApiClient } from '../../../lib/api';
import { IconLock, IconShieldMedical, IconHeartbeat, IconChevronRight } from '../../../components/Icons';
import { LoadingSpinner } from '../../../components/LoadingSpinner';

export default function ProfessionalLoginPage() {
  const router = useRouter();
  const { login, user, isLoading } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!isLoading && user) {
      const redirect = ROLE_REDIRECTS[user.role] || '/patient';
      router.replace(redirect);
    }
  }, [user, isLoading, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      await login(email, password);
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api/v1'}/users/me`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('ipmd_access_token')}` },
      });
      if (res.ok) {
        const me = await res.json();
        if (me.role === 'doctor') {
          try {
            const status = await ApiClient.getProfessionalStatus();
            if (status.professional_status && status.professional_status !== 'verified' && status.professional_status !== 'active') {
              router.replace('/professional/status');
              return;
            }
          } catch {
            // If status check fails, proceed to default redirect
          }
          router.replace('/doctor');
        } else if (me.role === 'pharmacist') {
          try {
            const status = await ApiClient.getProfessionalStatus();
            if (status.professional_status && status.professional_status !== 'verified' && status.professional_status !== 'active') {
              router.replace('/professional/status');
              return;
            }
          } catch {
            // If status check fails, proceed to default redirect
          }
          router.replace('/pharmacy/pharmacist/dashboard');
        } else if (me.role === 'pharmacy_admin' || me.role === 'pharmacy_staff_owned') {
          try {
            const status = await ApiClient.getProfessionalStatus();
            if (status.professional_status && status.professional_status !== 'verified' && status.professional_status !== 'active') {
              router.replace('/professional/status');
              return;
            }
          } catch {
            // If status check fails, proceed to default redirect
          }
          router.replace('/pharmacy/dashboard');
        } else {
          router.replace(ROLE_REDIRECTS[me.role] || '/patient');
        }
      } else {
        router.replace((user?.role ? ROLE_REDIRECTS[user.role] : undefined) || '/patient');
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Login failed. Please check your credentials.';
      setError(msg);
    } finally {
      setSubmitting(false);
    }
  };

  if (isLoading || user) {
    return <LoadingSpinner text="Loading..." />;
  }

  return (
    <div style={{
      minHeight: 'calc(100vh - 60px)',
      display: 'grid',
      gridTemplateColumns: '1fr 1fr',
      background: 'var(--bg-page)',
    }}>
      {/* Left: Professional Visual */}
      <div style={{
        background: 'linear-gradient(135deg, #0B6E6B 0%, #095A58 40%, #0F2B3C 100%)',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        alignItems: 'center',
        padding: 'var(--sp-12)',
        position: 'relative',
        overflow: 'hidden',
      }}
        className="hide-mobile"
      >
        <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(circle at 30% 40%, rgba(20, 163, 199, 0.15) 0%, transparent 50%)' }} />
        <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(circle at 70% 60%, rgba(24, 155, 106, 0.1) 0%, transparent 50%)' }} />
        <div style={{ position: 'absolute', top: '10%', left: '10%', width: '120px', height: '120px', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '50%', animation: 'floatSlow 6s ease-in-out infinite' }} />
        <div style={{ position: 'absolute', bottom: '15%', right: '15%', width: '80px', height: '80px', border: '1px solid rgba(255,255,255,0.04)', borderRadius: '50%', animation: 'floatSlow 8s ease-in-out infinite 1s' }} />
        <div style={{ position: 'absolute', top: '60%', left: '20%', fontSize: '180px', fontWeight: 200, color: 'rgba(255,255,255,0.03)', lineHeight: 1 }}>+</div>

        <div style={{ position: 'relative', zIndex: 1, textAlign: 'center', maxWidth: '400px' }}>
          <div style={{
            width: '72px', height: '72px', borderRadius: 'var(--radius-xl)',
            background: 'rgba(255,255,255,0.1)',
            backdropFilter: 'blur(8px)',
            border: '1px solid rgba(255,255,255,0.15)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            margin: '0 auto var(--sp-6)',
          }}>
            <IconShieldMedical size={36} style={{ color: '#fff' }} />
          </div>
          <h2 style={{ fontSize: 'var(--text-3xl)', fontWeight: 800, color: '#fff', letterSpacing: '-0.03em', lineHeight: 1.2, marginBottom: 'var(--sp-4)' }}>
            Professional Access
          </h2>
          <p style={{ fontSize: 'var(--text-md)', color: 'rgba(255,255,255,0.65)', lineHeight: 1.7, marginBottom: 'var(--sp-8)' }}>
            Secure login for verified healthcare professionals
          </p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--sp-3)' }}>
            {[
              'Encrypted credential storage',
              'Role-based clinical access',
              'Compliance & audit trails',
            ].map((item, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 'var(--sp-3)', color: 'rgba(255,255,255,0.7)', fontSize: 'var(--text-sm)' }}>
                <div style={{ width: '20px', height: '20px', borderRadius: '50%', background: 'rgba(255,255,255,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <IconHeartbeat size={12} style={{ color: 'rgba(255,255,255,0.8)' }} />
                </div>
                {item}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Right: Login Form */}
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        alignItems: 'center',
        padding: 'var(--sp-10) var(--sp-6)',
      }}>
        <div style={{ width: '100%', maxWidth: '400px' }}>
          {/* Mobile logo */}
          <div className="hide-desktop" style={{ textAlign: 'center', marginBottom: 'var(--sp-6)' }}>
            <div style={{
              width: '48px', height: '48px', borderRadius: 'var(--radius-md)',
              background: 'linear-gradient(135deg, var(--primary) 0%, #0A8E8A 100%)',
              color: '#fff',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              margin: '0 auto var(--sp-3)',
              boxShadow: '0 2px 8px rgba(11, 110, 107, 0.25)',
            }}>
              <IconHeartbeat size={24} />
            </div>
          </div>

          <div style={{ marginBottom: 'var(--sp-6)' }}>
            <h1 style={{ fontSize: 'var(--text-2xl)', fontWeight: 800, color: 'var(--text-heading)', letterSpacing: '-0.02em', marginBottom: 'var(--sp-1)' }}>
              Professional Login
            </h1>
            <p style={{ fontSize: 'var(--text-sm)', color: 'var(--text-secondary)' }}>
              Sign in to your professional healthcare account
            </p>
          </div>

          {error && (
            <div style={{
              padding: 'var(--sp-3) var(--sp-4)',
              background: 'var(--danger-bg)',
              border: '1px solid var(--danger-border)',
              borderRadius: 'var(--radius-md)',
              color: 'var(--danger)',
              fontSize: 'var(--text-sm)',
              marginBottom: 'var(--sp-4)',
              display: 'flex', alignItems: 'center', gap: 'var(--sp-2)',
            }} role="alert">
              <span style={{ fontSize: '16px' }}>&#9888;</span>
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--sp-4)' }}>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label" htmlFor="email">Email address</label>
              <input
                id="email" type="email" className="input" required
                value={email} onChange={(e) => setEmail(e.target.value)}
                placeholder="you@hospital.com" autoComplete="email"
                style={{ height: '44px', fontSize: 'var(--text-base)' }}
              />
            </div>

            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label" htmlFor="password">Password</label>
              <input
                id="password" type="password" className="input" required
                value={password} onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter your password" autoComplete="current-password" minLength={6}
                style={{ height: '44px', fontSize: 'var(--text-base)' }}
              />
            </div>

            <button
              type="submit" disabled={submitting}
              style={{
                width: '100%', height: '48px',
                background: 'linear-gradient(135deg, var(--primary) 0%, #0A8E8A 100%)',
                color: '#fff', border: 'none', borderRadius: 'var(--radius-md)',
                fontWeight: 600, fontSize: 'var(--text-base)',
                cursor: submitting ? 'not-allowed' : 'pointer',
                opacity: submitting ? 0.7 : 1,
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 'var(--sp-2)',
                boxShadow: '0 2px 8px rgba(11, 110, 107, 0.25)',
                transition: 'all 200ms var(--ease)',
              }}
            >
              {submitting ? (
                <span style={{ display: 'flex', alignItems: 'center', gap: 'var(--sp-2)' }}>
                  <div style={{ width: 16, height: 16, borderRadius: '50%', border: '2px solid rgba(255,255,255,0.3)', borderTopColor: '#fff', animation: 'spin 0.8s linear infinite' }} />
                  Signing in...
                </span>
              ) : (
                <>
                  <IconLock size={16} />
                  Sign In
                </>
              )}
            </button>
          </form>

          <div style={{ marginTop: 'var(--sp-5)', textAlign: 'center' }}>
            <p style={{ fontSize: 'var(--text-sm)', color: 'var(--text-secondary)', marginBottom: 'var(--sp-3)' }}>
              New healthcare professional?{' '}
              <Link href="/professional" style={{ color: 'var(--primary)', fontWeight: 600, textDecoration: 'none' }}>
                Register Now
              </Link>
            </p>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 'var(--sp-2)', fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>
              <span>Are you a patient?</span>
              <Link href="/patient/login" style={{ color: 'var(--text-secondary)', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '2px' }}>
                Patient Login <IconChevronRight size={12} />
              </Link>
            </div>
          </div>

          <p style={{ textAlign: 'center', fontSize: 'var(--text-xs)', color: 'var(--text-muted)', marginTop: 'var(--sp-4)' }}>
            AI-generated information does not replace professional medical advice.
          </p>
        </div>
      </div>
    </div>
  );
}
