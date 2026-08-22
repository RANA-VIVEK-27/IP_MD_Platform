'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useAuth } from '../../lib/auth-context';

const NAV_LINKS = [
  { label: 'Platform', href: '#platform' },
  { label: 'How It Works', href: '#how-it-works' },
  { label: 'For Patients', href: '#patients' },
  { label: 'For Doctors', href: '#doctors' },
  { label: 'For Pharmacies', href: '#pharmacies' },
  { label: 'AI Intelligence', href: '#ai' },
];

export function LandingNav() {
  const { user, token } = useAuth();
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [scrollProgress, setScrollProgress] = useState(0);

  const isLoggedIn = !!user && !!token && !token.startsWith('demo-token-');

  useEffect(() => {
    const onScroll = () => {
      setScrolled(window.scrollY > 20);
      const total = document.documentElement.scrollHeight - window.innerHeight;
      setScrollProgress(total > 0 ? (window.scrollY / total) * 100 : 0);
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <>
      <div
        aria-hidden="true"
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          width: `${scrollProgress}%`,
          height: '2px',
          background: 'linear-gradient(90deg, #087F7B, #22A06B)',
          zIndex: 300,
          transition: 'width 50ms linear',
        }}
      />
      <header
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          zIndex: 200,
          backgroundColor: scrolled ? 'rgba(255,255,255,0.88)' : 'transparent',
          backdropFilter: scrolled ? 'blur(16px) saturate(180%)' : 'none',
          WebkitBackdropFilter: scrolled ? 'blur(16px) saturate(180%)' : 'none',
          borderBottom: scrolled ? '1px solid rgba(217,229,234,0.6)' : '1px solid transparent',
          transition: 'all 300ms cubic-bezier(0.16, 1, 0.3, 1)',
        }}
      >
      <div style={{ maxWidth: '1280px', margin: '0 auto', padding: '0 var(--sp-6)', height: '64px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <Link href="/" style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 'var(--sp-2)' }}>
          <div style={{ width: '32px', height: '32px', borderRadius: 'var(--radius-md)', background: 'linear-gradient(135deg, var(--primary) 0%, #0A8E8A 100%)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 2px 8px rgba(8,127,123,0.25)' }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M8.5 14.5A2.5 2.5 0 0011 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 11-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 002.5 2.5z" /></svg>
          </div>
          <span style={{ fontWeight: 700, fontSize: 'var(--text-lg)', color: 'var(--navy)', letterSpacing: '-0.01em' }}>I.P. & M.D</span>
        </Link>

        <nav className="hide-mobile" style={{ display: 'flex', alignItems: 'center', gap: 'var(--sp-1)' }}>
          {NAV_LINKS.map((link) => (
            <a key={link.href} href={link.href} style={{ padding: '6px 14px', borderRadius: 'var(--radius-md)', textDecoration: 'none', fontSize: 'var(--text-sm)', fontWeight: 500, color: 'var(--text-secondary)', transition: 'all 150ms' }}
              onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.color = 'var(--primary)'; (e.currentTarget as HTMLElement).style.backgroundColor = 'var(--primary-lighter)'; }}
              onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.color = 'var(--text-secondary)'; (e.currentTarget as HTMLElement).style.backgroundColor = 'transparent'; }}
            >
              {link.label}
            </a>
          ))}
        </nav>

        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--sp-3)' }}>
          {isLoggedIn ? (
            <Link href={user!.role === 'patient' ? '/patient' : `/${user!.role === 'pharmacy_staff_owned' || user!.role === 'partner_pharmacy' ? 'admin' : user!.role}`} style={{ textDecoration: 'none' }}>
              <button className="btn btn-primary btn-sm">Dashboard</button>
            </Link>
          ) : (
            <>
              <Link href="/login" style={{ textDecoration: 'none' }}>
                <button className="btn btn-ghost btn-sm" style={{ fontWeight: 500 }}>Log In</button>
              </Link>
              <Link href="/register" style={{ textDecoration: 'none' }}>
                <button className="btn btn-primary btn-sm">Get Started</button>
              </Link>
            </>
          )}

          <button className="hide-desktop" onClick={() => setMobileOpen(!mobileOpen)} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '4px', color: 'var(--text-primary)' }} aria-label="Menu">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              {mobileOpen ? (<><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></>) : (<><line x1="3" y1="6" x2="21" y2="6" /><line x1="3" y1="12" x2="21" y2="12" /><line x1="3" y1="18" x2="21" y2="18" /></>)}
            </svg>
          </button>
        </div>
      </div>

      {mobileOpen && (
        <div className="hide-desktop" style={{ backgroundColor: 'var(--bg-surface)', borderTop: '1px solid var(--border-light)', padding: 'var(--sp-4) var(--sp-6)' }}>
          {NAV_LINKS.map((link) => (
            <a key={link.href} href={link.href} onClick={() => setMobileOpen(false)} style={{ display: 'block', padding: 'var(--sp-3) 0', textDecoration: 'none', fontSize: 'var(--text-md)', fontWeight: 500, color: 'var(--text-primary)', borderBottom: '1px solid var(--border-light)' }}>
              {link.label}
            </a>
          ))}
          <div style={{ display: 'flex', gap: 'var(--sp-3)', marginTop: 'var(--sp-4)' }}>
            <Link href="/login" style={{ flex: 1, textDecoration: 'none' }}><button className="btn btn-secondary" style={{ width: '100%' }}>Log In</button></Link>
            <Link href="/register" style={{ flex: 1, textDecoration: 'none' }}><button className="btn btn-primary" style={{ width: '100%' }}>Get Started</button></Link>
          </div>
        </div>
      )}
    </header>
    </>
  );
}
