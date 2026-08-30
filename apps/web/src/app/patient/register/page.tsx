'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '../../../lib/auth-context';
import { ApiClient } from '../../../lib/api';
import { IconCheckCircle, IconHeartbeat, IconShieldMedical, IconUserCheck } from '../../../components/Icons';
import { LoadingSpinner } from '../../../components/LoadingSpinner';

export default function PatientRegisterPage() {
  const router = useRouter();
  const { user, isLoading } = useAuth();
  const [fullName, setFullName] = useState('');
  const [dateOfBirth, setDateOfBirth] = useState('');
  const [mobile, setMobile] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [consentTerms, setConsentTerms] = useState(false);
  const [consentPrivacy, setConsentPrivacy] = useState(false);
  const [consentHealth, setConsentHealth] = useState(false);
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

    if (password.length < 6) {
      setError('Password must be at least 6 characters long.');
      return;
    }
    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }
    if (!consentTerms || !consentPrivacy || !consentHealth) {
      setError('Please accept all consent checkboxes to continue.');
      return;
    }

    setSubmitting(true);
    try {
      await ApiClient.register({
        email,
        password,
        full_name: fullName,
        role: 'patient',
        phone: mobile || undefined,
        date_of_birth: dateOfBirth || undefined,
      });
      await ApiClient.verifyEmail(email);
      setSuccess(true);
      setTimeout(() => router.push('/patient/login'), 5000);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Registration failed. Please try again.';
      if (msg.toLowerCase().includes('already') || msg.toLowerCase().includes('exist') || msg.toLowerCase().includes('duplicate')) {
        setError('An account with this email or phone number already exists. Please try logging in or use a different email.');
      } else {
        setError(msg);
      }
    } finally {
      setSubmitting(false);
    }
  };

  if (success) {
    return (
      <div style={{ minHeight: 'calc(100vh - 60px)', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg-page)' }}>
        <div style={{ textAlign: 'center', maxWidth: '440px', padding: 'var(--sp-8)' }}>
          <div style={{ width: '72px', height: '72px', borderRadius: '50%', background: 'var(--success-bg)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto var(--sp-5)' }}>
            <IconCheckCircle size={36} style={{ color: 'var(--success)' }} />
          </div>
          <h2 style={{ fontSize: 'var(--text-2xl)', fontWeight: 700, color: 'var(--text-heading)', marginBottom: 'var(--sp-2)' }}>Account Created Successfully!</h2>
          <p style={{ fontSize: 'var(--text-md)', color: 'var(--text-secondary)', marginBottom: 'var(--sp-5)', lineHeight: 1.6 }}>
            Welcome to I.P. & M.D, {fullName}! Your patient account has been created and is ready to use.
          </p>
          <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', padding: 'var(--sp-4)', marginBottom: 'var(--sp-5)', textAlign: 'left' }}>
            <p style={{ fontSize: 'var(--text-sm)', color: 'var(--text-heading)', fontWeight: 600, marginBottom: 'var(--sp-2)' }}>What happens next:</p>
            <ul style={{ fontSize: 'var(--text-sm)', color: 'var(--text-secondary)', listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: 'var(--sp-2)' }}>
              <li style={{ display: 'flex', alignItems: 'flex-start', gap: 'var(--sp-2)' }}>
                <span style={{ color: 'var(--success)', fontWeight: 700 }}>1.</span>
                You can now sign in with your email and password
              </li>
              <li style={{ display: 'flex', alignItems: 'flex-start', gap: 'var(--sp-2)' }}>
                <span style={{ color: 'var(--success)', fontWeight: 700 }}>2.</span>
                Upload prescriptions and manage your health records
              </li>
              <li style={{ display: 'flex', alignItems: 'flex-start', gap: 'var(--sp-2)' }}>
                <span style={{ color: 'var(--success)', fontWeight: 700 }}>3.</span>
                Explore AI-powered medicine recommendations
              </li>
            </ul>
          </div>
          <p style={{ fontSize: 'var(--text-sm)', color: 'var(--text-muted)' }}>Redirecting to login...</p>
        </div>
      </div>
    );
  }

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
      {/* Left: Visual Panel */}
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
        <div style={{ position: 'absolute', top: '15%', right: '10%', width: '100px', height: '100px', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '50%', animation: 'floatSlow 7s ease-in-out infinite' }} />
        <div style={{ position: 'absolute', bottom: '20%', left: '15%', width: '60px', height: '60px', border: '1px solid rgba(255,255,255,0.04)', borderRadius: '50%', animation: 'floatSlow 5s ease-in-out infinite 0.5s' }} />

        <div style={{ position: 'relative', zIndex: 1, textAlign: 'center', maxWidth: '400px' }}>
          <div style={{
            width: '72px', height: '72px', borderRadius: 'var(--radius-xl)',
            background: 'rgba(255,255,255,0.1)',
            backdropFilter: 'blur(8px)',
            border: '1px solid rgba(255,255,255,0.15)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            margin: '0 auto var(--sp-6)',
          }}>
            <IconUserCheck size={36} style={{ color: '#fff' }} />
          </div>
          <h2 style={{ fontSize: 'var(--text-3xl)', fontWeight: 800, color: '#fff', letterSpacing: '-0.03em', lineHeight: 1.2, marginBottom: 'var(--sp-4)' }}>
            Welcome to I.P. & M.D
          </h2>
          <p style={{ fontSize: 'var(--text-md)', color: 'rgba(255,255,255,0.65)', lineHeight: 1.7, marginBottom: 'var(--sp-8)' }}>
            Your trusted platform for prescriptions, medicine discovery and health records.
          </p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--sp-3)' }}>
            {[
              'Upload & manage prescriptions easily',
              'AI-powered medicine discovery',
              'Secure personal health records',
            ].map((item, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 'var(--sp-3)', color: 'rgba(255,255,255,0.7)', fontSize: 'var(--text-sm)' }}>
                <div style={{ width: '20px', height: '20px', borderRadius: '50%', background: 'rgba(255,255,255,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <IconShieldMedical size={12} style={{ color: 'rgba(255,255,255,0.8)' }} />
                </div>
                {item}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Right: Registration Form */}
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        alignItems: 'center',
        padding: 'var(--sp-10) var(--sp-6)',
        overflowY: 'auto',
      }}>
        <div style={{ width: '100%', maxWidth: '420px' }}>
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

          <div style={{ marginBottom: 'var(--sp-5)' }}>
            <h1 style={{ fontSize: 'var(--text-2xl)', fontWeight: 800, color: 'var(--text-heading)', letterSpacing: '-0.02em', marginBottom: 'var(--sp-1)' }}>
              Create Patient Account
            </h1>
            <p style={{ fontSize: 'var(--text-sm)', color: 'var(--text-secondary)' }}>
              Sign up to access prescriptions and health records
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
            }} role="alert">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--sp-3)' }}>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label" htmlFor="fullName">Full Name</label>
              <input id="fullName" type="text" className="input" required placeholder="e.g. Priya Sharma" value={fullName} onChange={(e) => setFullName(e.target.value)} autoComplete="name" style={{ height: '44px' }} />
            </div>

            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label" htmlFor="dob">Date of Birth</label>
              <input id="dob" type="date" className="input" value={dateOfBirth} onChange={(e) => setDateOfBirth(e.target.value)} autoComplete="bday" style={{ height: '44px' }} />
            </div>

            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label" htmlFor="mobile">Mobile Number</label>
              <input id="mobile" type="tel" className="input" placeholder="e.g. 98765 43210" value={mobile} onChange={(e) => setMobile(e.target.value)} autoComplete="tel" style={{ height: '44px' }} />
            </div>

            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label" htmlFor="email">Email Address</label>
              <input id="email" type="email" className="input" required placeholder="you@example.com" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" style={{ height: '44px' }} />
            </div>

            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label" htmlFor="password">Password</label>
              <input id="password" type="password" className="input" required placeholder="Create a password (min 6 chars)" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="new-password" minLength={6} style={{ height: '44px' }} />
            </div>

            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label" htmlFor="confirmPassword">Confirm Password</label>
              <input id="confirmPassword" type="password" className="input" required placeholder="Re-enter your password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} autoComplete="new-password" minLength={6} style={{ height: '44px' }} />
              {confirmPassword && password !== confirmPassword && (
                <span className="form-error">Passwords do not match</span>
              )}
            </div>

            {/* Consent Checkboxes */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--sp-2)', marginTop: 'var(--sp-1)' }}>
              <label style={{ display: 'flex', alignItems: 'flex-start', gap: 'var(--sp-2)', cursor: 'pointer', fontSize: 'var(--text-sm)', color: 'var(--text-secondary)' }}>
                <input type="checkbox" checked={consentTerms} onChange={(e) => setConsentTerms(e.target.checked)} style={{ marginTop: '2px', accentColor: 'var(--primary)' }} required />
                <span>I agree to the <Link href="/terms" style={{ color: 'var(--primary)', textDecoration: 'none' }}>Terms of Service</Link></span>
              </label>
              <label style={{ display: 'flex', alignItems: 'flex-start', gap: 'var(--sp-2)', cursor: 'pointer', fontSize: 'var(--text-sm)', color: 'var(--text-secondary)' }}>
                <input type="checkbox" checked={consentPrivacy} onChange={(e) => setConsentPrivacy(e.target.checked)} style={{ marginTop: '2px', accentColor: 'var(--primary)' }} required />
                <span>I agree to the <Link href="/privacy" style={{ color: 'var(--primary)', textDecoration: 'none' }}>Privacy Policy</Link></span>
              </label>
              <label style={{ display: 'flex', alignItems: 'flex-start', gap: 'var(--sp-2)', cursor: 'pointer', fontSize: 'var(--text-sm)', color: 'var(--text-secondary)' }}>
                <input type="checkbox" checked={consentHealth} onChange={(e) => setConsentHealth(e.target.checked)} style={{ marginTop: '2px', accentColor: 'var(--primary)' }} required />
                <span>I consent to the processing of my health information for prescription and medicine management purposes</span>
              </label>
            </div>

            <button
              type="submit" disabled={submitting || success}
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
                marginTop: 'var(--sp-2)',
              }}
            >
              {submitting ? (
                <>
                  <span style={{ width: '18px', height: '18px', border: '2px solid rgba(255,255,255,0.3)', borderTopColor: '#fff', borderRadius: '50%', animation: 'spin 0.6s linear infinite' }} />
                  Creating Account...
                </>
              ) : 'Create Patient Account'}
            </button>
          </form>

          <p style={{ textAlign: 'center', fontSize: 'var(--text-sm)', color: 'var(--text-secondary)', marginTop: 'var(--sp-4)' }}>
            Already have an account?{' '}
            <Link href="/patient/login" style={{ color: 'var(--primary)', fontWeight: 600, textDecoration: 'none' }}>
              Sign in
            </Link>
          </p>

          <p style={{ textAlign: 'center', fontSize: 'var(--text-xs)', color: 'var(--text-muted)', marginTop: 'var(--sp-3)' }}>
            Are you a healthcare professional?{' '}
            <Link href="/professional" style={{ color: 'var(--primary)', textDecoration: 'none' }}>
              Professional Registration
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
