'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth, ROLE_REDIRECTS } from '../../lib/auth-context';
import { IconLock } from '../../components/Icons';

export default function LoginPage() {
  const router = useRouter();
  const { login, user, isLoading } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!isLoading && user) {
      router.replace(ROLE_REDIRECTS[user.role] || '/patient');
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
        router.replace(ROLE_REDIRECTS[me.role] || '/patient');
      } else {
        router.replace((user?.role && ROLE_REDIRECTS[user.role]) || '/patient');
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Login failed. Please check your credentials.';
      setError(msg);
    } finally {
      setSubmitting(false);
    }
  };

  if (isLoading || user) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '60vh' }}>
        <div className="skeleton" style={{ width: '40px', height: '40px', borderRadius: '50%' }} />
      </div>
    );
  }

  return (
    <div style={{ maxWidth: '440px', margin: 'var(--sp-10) auto', padding: '0 var(--sp-4)' }}>
      <div className="card" style={{ padding: 'var(--sp-8)' }}>
        <div style={{ textAlign: 'center', marginBottom: 'var(--sp-6)' }}>
          <div style={{ width: '48px', height: '48px', borderRadius: 'var(--radius-lg)', backgroundColor: 'var(--primary)', color: '#ffffff', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: 'var(--text-lg)', marginBottom: 'var(--sp-3)' }}>
            IP
          </div>
          <h1 style={{ fontSize: 'var(--text-xl)', fontWeight: 700, color: 'var(--text-primary)', marginBottom: 'var(--sp-1)' }}>
            Welcome back
          </h1>
          <p style={{ fontSize: 'var(--text-sm)', color: 'var(--text-secondary)' }}>
            Sign in to your I.P. & M.D Platform account
          </p>
        </div>

        {error && (
          <div style={{ padding: 'var(--sp-3) var(--sp-4)', background: 'var(--danger-bg)', border: '1px solid rgba(196, 61, 61, 0.2)', borderRadius: 'var(--radius-md)', color: 'var(--danger)', fontSize: 'var(--text-sm)', marginBottom: 'var(--sp-4)' }} role="alert">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--sp-4)' }}>
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label" htmlFor="email">Email address</label>
            <input id="email" type="email" className="input" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" autoComplete="email" />
          </div>

          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label" htmlFor="password">Password</label>
            <input id="password" type="password" className="input" required value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Enter your password" autoComplete="current-password" minLength={6} />
          </div>

          <button type="submit" className="btn btn-primary btn-lg" disabled={submitting} style={{ width: '100%' }}>
            {submitting ? (
              <span style={{ display: 'flex', alignItems: 'center', gap: 'var(--sp-2)' }}>
                <span className="skeleton" style={{ width: 16, height: 16, borderRadius: '50%' }} />
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

        <p style={{ textAlign: 'center', fontSize: 'var(--text-sm)', color: 'var(--text-secondary)', marginTop: 'var(--sp-5)' }}>
          Don&apos;t have an account?{' '}
          <Link href="/register" style={{ color: 'var(--primary)', fontWeight: 600, textDecoration: 'none' }}>
            Create one
          </Link>
        </p>
      </div>
    </div>
  );
}
