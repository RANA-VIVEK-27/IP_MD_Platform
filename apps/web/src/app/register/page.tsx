'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { UserRole } from '../../lib/types';
import { useAuth } from '../../lib/auth-context';
import { IconCheckCircle, IconAlertTriangle } from '../../components/Icons';

export default function RegisterPage() {
  const router = useRouter();
  const { register, user, isLoading } = useAuth();
  const [role, setRole] = useState<UserRole>('patient');
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [licenseNumber, setLicenseNumber] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!isLoading && user) {
      router.replace('/patient');
    }
  }, [user, isLoading, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      await register({ email, password, full_name: fullName, role, license_number: role === 'doctor' ? licenseNumber : undefined });
      setSuccess(true);
      setTimeout(() => router.push('/login'), 1500);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Registration failed. Please try again.';
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
            Create Account
          </h1>
          <p style={{ fontSize: 'var(--text-sm)', color: 'var(--text-secondary)' }}>
            Register for the I.P. & M.D Platform
          </p>
        </div>

        {success && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--sp-2)', padding: 'var(--sp-3) var(--sp-4)', background: 'var(--success-bg)', border: '1px solid rgba(30, 142, 90, 0.2)', borderRadius: 'var(--radius-md)', color: 'var(--success)', fontSize: 'var(--text-sm)', marginBottom: 'var(--sp-4)' }} role="status">
            <IconCheckCircle size={16} />
            Account created! Redirecting to login...
          </div>
        )}

        {error && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--sp-2)', padding: 'var(--sp-3) var(--sp-4)', background: 'var(--danger-bg)', border: '1px solid rgba(196, 61, 61, 0.2)', borderRadius: 'var(--radius-md)', color: 'var(--danger)', fontSize: 'var(--text-sm)', marginBottom: 'var(--sp-4)' }} role="alert">
            <IconAlertTriangle size={16} />
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--sp-4)' }}>
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label" htmlFor="role">Account Type</label>
            <select id="role" className="select" value={role} onChange={(e) => setRole(e.target.value as UserRole)}>
              <option value="patient">Patient</option>
              <option value="doctor">Licensed Doctor</option>
              <option value="pharmacy_staff_owned">Pharmacy Staff</option>
              <option value="partner_pharmacy">Partner Pharmacy</option>
            </select>
          </div>

          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label" htmlFor="fullName">Full Name</label>
            <input id="fullName" type="text" className="input" required placeholder="e.g. Dr. Ramesh Gupta" value={fullName} onChange={(e) => setFullName(e.target.value)} autoComplete="name" />
          </div>

          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label" htmlFor="email">Email Address</label>
            <input id="email" type="email" className="input" required placeholder="you@example.com" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" />
          </div>

          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label" htmlFor="password">Password</label>
            <input id="password" type="password" className="input" required placeholder="Create a strong password" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="new-password" minLength={6} />
          </div>

          {role === 'doctor' && (
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label" htmlFor="license">Medical License Number</label>
              <input id="license" type="text" className="input" required placeholder="e.g. MCI-2026-9812" value={licenseNumber} onChange={(e) => setLicenseNumber(e.target.value)} />
              <span className="form-helper">Required for doctor accounts. Verified by User Admin.</span>
            </div>
          )}

          <button type="submit" className="btn btn-primary btn-lg" disabled={submitting || success} style={{ width: '100%' }}>
            {submitting ? 'Creating Account...' : 'Create Account'}
          </button>
        </form>

        <p style={{ textAlign: 'center', fontSize: 'var(--text-sm)', color: 'var(--text-secondary)', marginTop: 'var(--sp-5)' }}>
          Already have an account?{' '}
          <Link href="/login" style={{ color: 'var(--primary)', fontWeight: 600, textDecoration: 'none' }}>
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
