'use client';

import React, { useState, useEffect, useRef, Suspense } from 'react';
import Link from 'next/link';
import dynamic from 'next/dynamic';

const HealthcareScene = dynamic(
  () => import('../components/home/HealthcareScene').then((mod) => mod.HealthcareScene),
  { ssr: false, loading: () => <div style={{ width: '100%', height: '100%', minHeight: 400, borderRadius: 20, background: 'rgba(255,255,255,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><div style={{ width: 40, height: 40, borderRadius: '50%', border: '3px solid rgba(11, 110, 107, 0.1)', borderTopColor: 'var(--primary)', animation: 'spin 0.8s linear infinite' }} /></div> }
);

/* ─── Scroll reveal hook ─── */
function useReveal() {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) { el.classList.add('visible'); obs.unobserve(el); } },
      { threshold: 0.1, rootMargin: '0px 0px -40px 0px' }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, []);
  return ref;
}

/* ─── Animated counter hook ─── */
function useCounter(end: number, duration = 2000) {
  const [count, setCount] = useState(0);
  const [started, setStarted] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) { setStarted(true); obs.unobserve(el); } },
      { threshold: 0.3 }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  useEffect(() => {
    if (!started) return;
    let start = 0;
    const step = end / (duration / 16);
    const timer = setInterval(() => {
      start += step;
      if (start >= end) {
        setCount(end);
        clearInterval(timer);
      } else {
        setCount(Math.floor(start));
      }
    }, 16);
    return () => clearInterval(timer);
  }, [started, end, duration]);

  return { count, ref };
}

/* ─── Reusable tiny helpers ─── */
function RevealDiv({ children, className, style, delay }: { children: React.ReactNode; className?: string; style?: React.CSSProperties; delay?: number }) {
  const ref = useReveal();
  return <div ref={ref} className={`reveal ${delay ? `reveal-delay-${delay}` : ''} ${className || ''}`} style={style}>{children}</div>;
}

function Overline({ children }: { children: React.ReactNode }) {
  return <p className="text-overline" style={{ marginBottom: 'var(--sp-3)', color: 'var(--primary)', letterSpacing: '0.08em' }}>{children}</p>;
}

function SectionHeading({ children }: { children: React.ReactNode }) {
  return <h2 style={{ fontSize: 'clamp(28px, 4vw, 42px)', fontWeight: 800, color: 'var(--navy)', letterSpacing: '-0.03em', lineHeight: 1.15, marginBottom: 'var(--sp-4)' }}>{children}</h2>;
}

function SectionSub({ children, style }: { children: React.ReactNode; style?: React.CSSProperties }) {
  return <p style={{ fontSize: 'var(--text-lg)', color: 'var(--text-secondary)', lineHeight: 1.7, maxWidth: '640px', ...style }}>{children}</p>;
}

function CheckIcon({ color = '#189B6A' }: { color?: string }) {
  return <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>;
}

/* ─── EKG Heartbeat Divider ─── */
function EKGDivider() {
  return (
    <div className="ekg-divider" aria-hidden="true">
      <svg viewBox="0 0 1200 40" preserveAspectRatio="none">
        <path
          d="M0,20 L200,20 L220,20 L230,5 L240,35 L250,10 L260,30 L270,20 L400,20 L600,20 L620,20 L630,5 L640,35 L650,10 L660,30 L670,20 L800,20 L1000,20 L1020,20 L1030,5 L1040,35 L1050,10 L1060,30 L1070,20 L1200,20"
          fill="none"
          stroke="var(--primary)"
          strokeWidth="1.5"
          strokeLinecap="round"
          opacity="0.3"
        />
      </svg>
    </div>
  );
}

/* ─── Floating Capsule Decoration ─── */
function FloatingCapsule({ className, style }: { className: string; style?: React.CSSProperties }) {
  return (
    <svg className={`floating-capsule ${className}`} style={style} width="40" height="18" viewBox="0 0 40 18" fill="none">
      <rect x="0" y="0" width="40" height="18" rx="9" fill="var(--primary)" opacity="0.6" />
      <rect x="20" y="0" width="20" height="18" rx="9" fill="var(--cyan)" opacity="0.8" />
    </svg>
  );
}

/* ─── Medical Cross Decoration ─── */
function MedicalCross({ size = 80, opacity = 0.04, style }: { size?: number; opacity?: number; style?: React.CSSProperties }) {
  return (
    <div style={{ position: 'absolute', pointerEvents: 'none', ...style }} aria-hidden="true">
      <svg width={size} height={size} viewBox="0 0 80 80" fill="none">
        <rect x="30" y="5" width="20" height="70" rx="4" fill="var(--primary)" opacity={opacity} />
        <rect x="5" y="30" width="70" height="20" rx="4" fill="var(--primary)" opacity={opacity} />
      </svg>
    </div>
  );
}

/* ─── Stat Counter Component ─── */
function StatCounter({ end, suffix = '', label, icon }: { end: number; suffix?: string; label: string; icon: React.ReactNode }) {
  const { count, ref } = useCounter(end);
  return (
    <div ref={ref} className="stat-item">
      <div style={{ marginBottom: 'var(--sp-2)', display: 'flex', justifyContent: 'center' }}>
        {icon}
      </div>
      <div className="stat-number">{count.toLocaleString()}{suffix}</div>
      <div className="stat-label">{label}</div>
    </div>
  );
}


/* ═══════════════════════════════════════════════
   LANDING PAGE
   ═══════════════════════════════════════════════ */
export default function LandingPage() {
  const [faqOpen, setFaqOpen] = useState<number | null>(null);

  return (
    <div style={{ overflow: 'hidden' }}>
      {/* ═══ HERO — PREMIUM MEDICAL THEME ═══ */}
      <section className="hero-medical" style={{ padding: '160px var(--sp-6) 120px' }}>
        {/* Decorative floating capsules */}
        <FloatingCapsule className="floating-capsule-1" style={{ top: '15%', left: '8%' }} />
        <FloatingCapsule className="floating-capsule-2" style={{ top: '30%', right: '12%' }} />
        <FloatingCapsule className="floating-capsule-3" style={{ bottom: '25%', left: '15%' }} />

        {/* Medical cross decorations */}
        <MedicalCross size={120} opacity={0.03} style={{ top: '10%', right: '20%' }} />
        <MedicalCross size={60} opacity={0.04} style={{ bottom: '20%', left: '5%' }} />
        <MedicalCross size={90} opacity={0.025} style={{ top: '50%', right: '5%' }} />

        {/* Decorative circles */}
        <div style={{ position: 'absolute', top: '8%', right: '10%', width: '400px', height: '400px', borderRadius: '50%', background: 'radial-gradient(circle, rgba(11, 110, 107, 0.06) 0%, transparent 60%)', pointerEvents: 'none', animation: 'heroPulse 4s ease-in-out infinite' }} />
        <div style={{ position: 'absolute', bottom: '10%', left: '5%', width: '300px', height: '300px', borderRadius: '50%', background: 'radial-gradient(circle, rgba(20, 163, 199, 0.05) 0%, transparent 60%)', pointerEvents: 'none', animation: 'heroPulse 5s ease-in-out infinite 1s' }} />

        <div className="hero-grid" style={{ maxWidth: '1280px', margin: '0 auto', position: 'relative', zIndex: 2, width: '100%', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--sp-12)', alignItems: 'center' }}>
          {/* Left: Text + CTA */}
          <div>
            <RevealDiv>
              <div style={{
                display: 'inline-flex', alignItems: 'center', gap: 'var(--sp-2)',
                padding: '8px 18px',
                borderRadius: 'var(--radius-pill)',
                background: 'rgba(11, 110, 107, 0.08)',
                border: '1px solid rgba(11, 110, 107, 0.15)',
                marginBottom: 'var(--sp-6)',
              }}>
                <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: 'var(--primary)', animation: 'pulseGlow 2s infinite' }} />
                <span style={{ fontWeight: 600, fontSize: 'var(--text-xs)', textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--primary)' }}>
                  Intelligent Healthcare Platform
                </span>
              </div>
            </RevealDiv>

            <RevealDiv delay={1}>
              <h1 style={{
                fontSize: 'clamp(38px, 5vw, 60px)',
                fontWeight: 800,
                color: 'var(--navy)',
                letterSpacing: '-0.04em',
                lineHeight: 1.08,
                marginBottom: 'var(--sp-6)',
              }}>
                From Prescription<br />to Medicine,{' '}
                <span className="gradient-text-animated">
                  Made Smarter.
                </span>
              </h1>
            </RevealDiv>

            <RevealDiv delay={2}>
              <p style={{
                fontSize: 'clamp(16px, 2vw, 19px)',
                color: 'var(--text-secondary)',
                lineHeight: 1.7,
                marginBottom: 'var(--sp-8)',
                maxWidth: '520px',
              }}>
                I.P. &amp; M.D connects patients, doctors and pharmacies through intelligent prescription processing, medicine discovery and secure healthcare workflows.
              </p>
            </RevealDiv>

            <RevealDiv delay={3}>
              <div style={{ display: 'flex', gap: 'var(--sp-3)', flexWrap: 'wrap', marginBottom: 'var(--sp-8)' }}>
                <Link href="/patient/register" style={{ textDecoration: 'none' }}>
                  <button className="btn-medical" style={{ padding: '16px 36px', fontSize: 'var(--text-md)', borderRadius: 'var(--radius-lg)' }}>
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="8.5" cy="7" r="4" /><line x1="20" y1="8" x2="20" y2="14" /><line x1="23" y1="11" x2="17" y2="11" /></svg>
                    Get Started Free
                  </button>
                </Link>
                <a href="#platform" style={{ textDecoration: 'none' }}>
                  <button className="btn-outline-medical" style={{ padding: '16px 36px', fontSize: 'var(--text-md)', borderRadius: 'var(--radius-lg)' }}>
                    Explore Platform
                  </button>
                </a>
              </div>
            </RevealDiv>

            <RevealDiv delay={4}>
              <div style={{ display: 'flex', gap: 'var(--sp-4)', flexWrap: 'wrap' }}>
                {[
                  { text: 'AI-Powered Extractions', icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--primary)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2a10 10 0 1010 10A10 10 0 0012 2z" /><path d="M12 6v6l4 2" /></svg> },
                  { text: 'Doctor Verified', icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#1E6FB5" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M22 11.08V12a10 10 0 11-5.93-9.14" /><polyline points="22 4 12 14.01 9 11.01" /></svg> },
                  { text: 'Secure Health Data', icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#189B6A" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" /></svg> },
                ].map((item, i) => (
                  <span key={i} className="trust-badge">
                    {item.icon}
                    {item.text}
                  </span>
                ))}
              </div>
            </RevealDiv>
          </div>

          {/* Right: 3D Scene */}
          <RevealDiv delay={2} style={{ height: '500px', position: 'relative' }}>
            <HealthcareScene />
          </RevealDiv>
        </div>
      </section>

      {/* ═══ EKG DIVIDER ═══ */}
      <EKGDivider />

      {/* ═══ PROFESSIONAL PORTAL ENTRY ═══ */}
      <section style={{ padding: 'var(--sp-16) var(--sp-6)', background: 'var(--bg-surface)' }}>
        <div style={{ maxWidth: '1200px', margin: '0 auto', textAlign: 'center' }}>
          <RevealDiv>
            <p className="text-overline" style={{ marginBottom: 'var(--sp-3)', color: 'var(--blue)', letterSpacing: '0.08em' }}>Healthcare Professional?</p>
            <h2 style={{ fontSize: 'clamp(24px, 3.5vw, 36px)', fontWeight: 800, color: 'var(--navy)', letterSpacing: '-0.03em', lineHeight: 1.15, marginBottom: 'var(--sp-3)' }}>
              Join as a verified healthcare provider
            </h2>
            <p style={{ fontSize: 'var(--text-lg)', color: 'var(--text-secondary)', lineHeight: 1.7, maxWidth: '540px', margin: '0 auto var(--sp-10)' }}>
              Register through the portal that matches your practice. Get verified and start using the platform.
            </p>
          </RevealDiv>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 'var(--sp-5)', maxWidth: '900px', margin: '0 auto' }}>
            <RevealDiv delay={1}>
              <Link href="/professional/doctor/register" style={{ textDecoration: 'none' }}>
                <div className="card card-interactive" style={{ padding: 'var(--sp-6)', textAlign: 'center', borderColor: 'var(--blue-light)' }}>
                  <div style={{ width: '56px', height: '56px', borderRadius: '50%', background: 'rgba(30, 111, 181, 0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto var(--sp-4)' }}>
                    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#1E6FB5" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" /><polyline points="22 4 12 14.01 9 11.01" /></svg>
                  </div>
                  <h3 style={{ fontSize: 'var(--text-lg)', fontWeight: 700, color: 'var(--navy)', marginBottom: 'var(--sp-2)' }}>Doctor Portal</h3>
                  <p style={{ fontSize: 'var(--text-sm)', color: 'var(--text-secondary)', lineHeight: 1.6 }}>Verify prescriptions, review AI extractions, and maintain clinical audit trails.</p>
                </div>
              </Link>
            </RevealDiv>

            <RevealDiv delay={2}>
              <Link href="/professional/pharmacist/register" style={{ textDecoration: 'none' }}>
                <div className="card card-interactive" style={{ padding: 'var(--sp-6)', textAlign: 'center', borderColor: 'var(--primary-light)' }}>
                  <div style={{ width: '56px', height: '56px', borderRadius: '50%', background: 'rgba(11, 110, 107, 0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto var(--sp-4)' }}>
                    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#0B6E6B" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="m10.5 20.5 10-10a4.95 4.95 0 1 0-7-7l-10 10a4.95 4.95 0 1 0 7 7z" /><path d="m8.5 8.5 7 7" /></svg>
                  </div>
                  <h3 style={{ fontSize: 'var(--text-lg)', fontWeight: 700, color: 'var(--navy)', marginBottom: 'var(--sp-2)' }}>Pharmacist Portal</h3>
                  <p style={{ fontSize: 'var(--text-sm)', color: 'var(--text-secondary)', lineHeight: 1.6 }}>Manage pharmacy operations, verify prescriptions, and oversee inventory.</p>
                </div>
              </Link>
            </RevealDiv>

            <RevealDiv delay={3}>
              <Link href="/professional/pharmacy/register" style={{ textDecoration: 'none' }}>
                <div className="card card-interactive" style={{ padding: 'var(--sp-6)', textAlign: 'center', borderColor: 'var(--green-light)' }}>
                  <div style={{ width: '56px', height: '56px', borderRadius: '50%', background: 'rgba(24, 155, 106, 0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto var(--sp-4)' }}>
                    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#189B6A" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><rect x="1" y="3" width="15" height="13" /><polygon points="16 8 20 8 23 11 23 16 16 16 16 8" /><circle cx="5.5" cy="18.5" r="2.5" /><circle cx="18.5" cy="18.5" r="2.5" /></svg>
                  </div>
                  <h3 style={{ fontSize: 'var(--text-lg)', fontWeight: 700, color: 'var(--navy)', marginBottom: 'var(--sp-2)' }}>Pharmacy Portal</h3>
                  <p style={{ fontSize: 'var(--text-sm)', color: 'var(--text-secondary)', lineHeight: 1.6 }}>Join the pharmacy network, manage inventory, and fulfill verified orders.</p>
                </div>
              </Link>
            </RevealDiv>
          </div>
        </div>
      </section>

      {/* ═══ ANIMATED STATS ═══ */}
      <section style={{ background: 'var(--bg-surface)', borderBottom: '1px solid var(--border-light)' }}>
        <div className="stats-strip" style={{ maxWidth: '1100px', margin: '0 auto' }}>
          <StatCounter
            end={10000}
            suffix="+"
            label="Prescriptions Processed"
            icon={<svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="var(--primary)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" /><polyline points="14 2 14 8 20 8" /><line x1="16" y1="13" x2="8" y2="13" /><line x1="16" y1="17" x2="8" y2="17" /></svg>}
          />
          <StatCounter
            end={500}
            suffix="+"
            label="Verified Doctors"
            icon={<svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#1E6FB5" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M22 11.08V12a10 10 0 11-5.93-9.14" /><polyline points="22 4 12 14.01 9 11.01" /></svg>}
          />
          <StatCounter
            end={200}
            suffix="+"
            label="Partner Pharmacies"
            icon={<svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#189B6A" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><rect x="1" y="3" width="15" height="13" /><polygon points="16 8 20 8 23 11 23 16 16 16 16 8" /><circle cx="5.5" cy="18.5" r="2.5" /><circle cx="18.5" cy="18.5" r="2.5" /></svg>}
          />
          <StatCounter
            end={98}
            suffix="%"
            label="Patient Satisfaction"
            icon={<svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#D48800" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z" /></svg>}
          />
        </div>
      </section>

      {/* ═══ ROLE-BASED INTRO — WHO IS IT FOR ═══ */}
      <section style={{ padding: 'var(--sp-20) var(--sp-6)' }} className="medical-bg-pattern">
        <div style={{ maxWidth: '1200px', margin: '0 auto', textAlign: 'center', position: 'relative', zIndex: 1 }}>
          <RevealDiv>
            <Overline>Built For Everyone</Overline>
            <SectionHeading>One platform. Three powerful experiences.</SectionHeading>
            <SectionSub style={{ margin: '0 auto var(--sp-12)' }}>
              Whether you&rsquo;re a patient seeking medicines, a doctor verifying prescriptions, or a pharmacy fulfilling orders &mdash; I.P. &amp; M.D is built for you.
            </SectionSub>
          </RevealDiv>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 'var(--sp-6)', maxWidth: '1050px', margin: '0 auto' }}>
            {/* Patient Card */}
            <RevealDiv delay={1}>
              <div className="role-card role-card-patient">
                <div className="role-icon-wrap" style={{ background: 'rgba(11, 110, 107, 0.08)' }}>
                  <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#0B6E6B" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" /></svg>
                </div>
                <h3 style={{ fontSize: 'var(--text-xl)', fontWeight: 700, color: 'var(--navy)', marginBottom: 'var(--sp-2)' }}>For Patients</h3>
                <p style={{ fontSize: 'var(--text-sm)', color: 'var(--text-secondary)', lineHeight: 1.7, marginBottom: 'var(--sp-4)' }}>
                  Upload prescriptions, discover medicines, track orders &mdash; all in one simple, secure experience.
                </p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--sp-2)', textAlign: 'left' }}>
                  {['Upload & scan prescriptions', 'AI-powered medicine search', 'Real-time order tracking', 'Secure health records'].map((item) => (
                    <div key={item} style={{ display: 'flex', alignItems: 'center', gap: 'var(--sp-2)', fontSize: 'var(--text-sm)', color: 'var(--text-secondary)' }}>
                      <CheckIcon color="#0B6E6B" /> {item}
                    </div>
                  ))}
                </div>
              </div>
            </RevealDiv>

            {/* Doctor Card */}
            <RevealDiv delay={2}>
              <div className="role-card role-card-doctor">
                <div className="role-icon-wrap" style={{ background: 'rgba(30, 111, 181, 0.08)' }}>
                  <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#1E6FB5" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" /><polyline points="22 4 12 14.01 9 11.01" /></svg>
                </div>
                <h3 style={{ fontSize: 'var(--text-xl)', fontWeight: 700, color: 'var(--navy)', marginBottom: 'var(--sp-2)' }}>For Doctors</h3>
                <p style={{ fontSize: 'var(--text-sm)', color: 'var(--text-secondary)', lineHeight: 1.7, marginBottom: 'var(--sp-4)' }}>
                  Review AI-extracted prescriptions, verify clinical data, and maintain complete audit trails.
                </p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--sp-2)', textAlign: 'left' }}>
                  {['Prescription verification queue', 'AI-assisted data extraction', 'Clinical review dashboard', 'Complete audit trail'].map((item) => (
                    <div key={item} style={{ display: 'flex', alignItems: 'center', gap: 'var(--sp-2)', fontSize: 'var(--text-sm)', color: 'var(--text-secondary)' }}>
                      <CheckIcon color="#1E6FB5" /> {item}
                    </div>
                  ))}
                </div>
              </div>
            </RevealDiv>

            {/* Pharmacy Card */}
            <RevealDiv delay={3}>
              <div className="role-card role-card-pharmacy">
                <div className="role-icon-wrap" style={{ background: 'rgba(24, 155, 106, 0.08)' }}>
                  <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#189B6A" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><rect x="1" y="3" width="15" height="13" /><polygon points="16 8 20 8 23 11 23 16 16 16 16 8" /><circle cx="5.5" cy="18.5" r="2.5" /><circle cx="18.5" cy="18.5" r="2.5" /></svg>
                </div>
                <h3 style={{ fontSize: 'var(--text-xl)', fontWeight: 700, color: 'var(--navy)', marginBottom: 'var(--sp-2)' }}>For Pharmacies</h3>
                <p style={{ fontSize: 'var(--text-sm)', color: 'var(--text-secondary)', lineHeight: 1.7, marginBottom: 'var(--sp-4)' }}>
                  Receive verified orders, manage inventory, process fulfillment, and update delivery status.
                </p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--sp-2)', textAlign: 'left' }}>
                  {['Order fulfillment pipeline', 'Inventory management', 'Real-time status updates', 'Partner network access'].map((item) => (
                    <div key={item} style={{ display: 'flex', alignItems: 'center', gap: 'var(--sp-2)', fontSize: 'var(--text-sm)', color: 'var(--text-secondary)' }}>
                      <CheckIcon color="#189B6A" /> {item}
                    </div>
                  ))}
                </div>
              </div>
            </RevealDiv>
          </div>
        </div>
      </section>

      {/* ═══ EKG DIVIDER ═══ */}
      <EKGDivider />

      {/* ═══ PLATFORM OVERVIEW ═══ */}
      <section className="section-soft" id="platform" style={{ padding: 'var(--sp-20) var(--sp-6)' }}>
        <div style={{ maxWidth: '1200px', margin: '0 auto', textAlign: 'center' }}>
          <RevealDiv>
            <Overline>Platform</Overline>
            <SectionHeading>One platform. Every step connected.</SectionHeading>
            <SectionSub style={{ margin: '0 auto var(--sp-12)' }}>
              From the moment a prescription is uploaded to the final medicine delivery, every step is intelligent, connected and transparent.
            </SectionSub>
          </RevealDiv>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 'var(--sp-5)' }}>
            {[
              { icon: <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--primary)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" /><polyline points="14 2 14 8 20 8" /><line x1="16" y1="13" x2="8" y2="13" /><line x1="16" y1="17" x2="8" y2="17" /></svg>, title: 'Prescription Intelligence', desc: 'AI-powered OCR extracts medicine data from uploaded prescriptions with high accuracy.', color: 'var(--primary)' },
              { icon: <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--blue)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 11.08V12a10 10 0 11-5.93-9.14" /><polyline points="22 4 12 14.01 9 11.01" /></svg>, title: 'Doctor Verification', desc: 'Licensed doctors review and verify extracted prescription data before fulfillment.', color: 'var(--blue)' },
              { icon: <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--green)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" /></svg>, title: 'Medicine Discovery', desc: 'Search, compare and discover medicines with availability and pricing information.', color: 'var(--green)' },
              { icon: <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--warning)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="1" y="3" width="15" height="13" /><polygon points="16 8 20 8 23 11 23 16 16 16 16 8" /><circle cx="5.5" cy="18.5" r="2.5" /><circle cx="18.5" cy="18.5" r="2.5" /></svg>, title: 'Pharmacy & Ordering', desc: 'Connected pharmacy network for seamless prescription fulfillment and delivery.', color: 'var(--warning)' },
              { icon: <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--navy)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2a10 10 0 1010 10A10 10 0 0012 2z" /><path d="M12 6v6l4 2" /></svg>, title: 'Order Tracking', desc: 'Real-time visibility from order placement through pharmacy processing to delivery.', color: 'var(--navy)' },
            ].map((item, i) => (
              <RevealDiv key={i} delay={(i + 1) as any}>
                <div className="gradient-border-card" style={{ textAlign: 'left', height: '100%' }}>
                  <div style={{ width: '48px', height: '48px', borderRadius: 'var(--radius-md)', background: `${item.color}12`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginBottom: 'var(--sp-4)' }}>
                    {item.icon}
                  </div>
                  <h3 style={{ fontSize: 'var(--text-lg)', fontWeight: 700, color: 'var(--navy)', marginBottom: 'var(--sp-2)' }}>{item.title}</h3>
                  <p style={{ fontSize: 'var(--text-sm)', color: 'var(--text-secondary)', lineHeight: 1.6 }}>{item.desc}</p>
                </div>
              </RevealDiv>
            ))}
          </div>
        </div>
      </section>

      {/* ═══ PRESCRIPTION INTELLIGENCE ═══ */}
      <section style={{ padding: 'var(--sp-20) var(--sp-6)' }}>
        <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 'var(--sp-12)', alignItems: 'center' }}>
            <RevealDiv>
              <Overline>Prescription Intelligence</Overline>
              <SectionHeading>Turn prescriptions into structured intelligence.</SectionHeading>
              <SectionSub>
                Patients upload a prescription photograph. Our AI-powered OCR extracts medicine names, dosages, frequencies and durations &mdash; structuring unstructured medical data into actionable information.
              </SectionSub>
              <div style={{ marginTop: 'var(--sp-6)', padding: 'var(--sp-4)', background: 'var(--warning-bg)', borderRadius: 'var(--radius-md)', border: '1px solid var(--warning-border)' }}>
                <p style={{ fontSize: 'var(--text-sm)', color: 'var(--warning)', fontWeight: 600 }}>AI-assisted extraction. Doctor verification remains part of the workflow.</p>
              </div>
            </RevealDiv>

            <RevealDiv delay={2}>
              <div className="feature-showcase">
                <div className="feature-showcase-header" style={{ background: 'var(--bg-muted)' }}>
                  <div style={{ display: 'flex', gap: 'var(--sp-2)' }}>
                    <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: 'var(--danger)' }} />
                    <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: 'var(--warning)' }} />
                    <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: 'var(--success)' }} />
                  </div>
                  <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)', marginLeft: 'var(--sp-2)' }}>AI Extraction Results</span>
                </div>
                <div className="feature-showcase-body">
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--sp-3)' }}>
                    {[
                      { field: 'Medicine', value: 'Amoxicillin 500mg', confidence: 0.97 },
                      { field: 'Dosage', value: '1 capsule', confidence: 0.95 },
                      { field: 'Frequency', value: '3 times daily', confidence: 0.92 },
                      { field: 'Duration', value: '7 days', confidence: 0.89 },
                    ].map((f, i) => (
                      <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: 'var(--sp-3)', background: 'var(--bg-page)', borderRadius: 'var(--radius-sm)' }}>
                        <div>
                          <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>{f.field}</span>
                          <div style={{ fontWeight: 600, fontSize: 'var(--text-sm)', color: 'var(--text-primary)' }}>{f.value}</div>
                        </div>
                        <span style={{ fontSize: 'var(--text-xs)', fontWeight: 600, color: f.confidence >= 0.9 ? 'var(--success)' : 'var(--warning)', background: f.confidence >= 0.9 ? 'var(--success-bg)' : 'var(--warning-bg)', padding: '2px 8px', borderRadius: 'var(--radius-pill)' }}>
                          {Math.round(f.confidence * 100)}%
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </RevealDiv>
          </div>
        </div>
      </section>

      {/* ═══ DOCTOR SECTION ═══ */}
      <section className="section-soft" id="doctors" style={{ padding: 'var(--sp-20) var(--sp-6)' }}>
        <div style={{ maxWidth: '1200px', margin: '0 auto', textAlign: 'center' }}>
          <RevealDiv>
            <Overline>For Doctors</Overline>
            <SectionHeading>Give doctors the information they need to review with confidence.</SectionHeading>
            <SectionSub style={{ margin: '0 auto var(--sp-10)' }}>
              AI assists the workflow. Doctors remain in control of verification. Every prescription goes through clinical review before medicines can be ordered.
            </SectionSub>
          </RevealDiv>

          <RevealDiv delay={2}>
            <div className="feature-showcase" style={{ maxWidth: '800px', margin: '0 auto' }}>
              <div className="feature-showcase-header" style={{ background: 'var(--bg-muted)', justifyContent: 'space-between' }}>
                <span style={{ fontWeight: 600, fontSize: 'var(--text-sm)' }}>Verification Queue</span>
                <span className="badge badge-warning">2 Pending</span>
              </div>
              <div className="feature-showcase-body">
                <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--sp-3)' }}>
                  {[
                    { id: 'RX-8812', patient: 'Rahul S.', confidence: 94, medicines: 3, status: 'pending' },
                    { id: 'RX-8819', patient: 'Priya M.', confidence: 91, medicines: 2, status: 'pending' },
                  ].map((rx) => (
                    <div key={rx.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: 'var(--sp-3) var(--sp-4)', background: 'var(--bg-page)', borderRadius: 'var(--radius-md)' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--sp-4)' }}>
                        <span style={{ fontFamily: 'monospace', fontWeight: 600, color: 'var(--primary)', fontSize: 'var(--text-sm)' }}>{rx.id}</span>
                        <span style={{ fontSize: 'var(--text-sm)' }}>{rx.patient}</span>
                        <span className="badge badge-info" style={{ fontSize: '10px' }}>{rx.medicines} medicines</span>
                      </div>
                      <button className="btn btn-primary btn-sm">Review</button>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </RevealDiv>
        </div>
      </section>

      {/* ═══ PATIENT SECTION ═══ */}
      <section id="patients" style={{ padding: 'var(--sp-20) var(--sp-6)' }}>
        <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 'var(--sp-12)', alignItems: 'center' }}>
            <RevealDiv>
              <Overline>For Patients</Overline>
              <SectionHeading>A simpler experience for patients.</SectionHeading>
              <SectionSub>
                Upload your prescription, track processing in real-time, discover verified medicines, and manage your healthcare journey &mdash; all in one place.
              </SectionSub>
              <div style={{ marginTop: 'var(--sp-6)', display: 'flex', flexDirection: 'column', gap: 'var(--sp-3)' }}>
                {['Upload prescription', 'Track processing', 'Discover medicines', 'Order & pay', 'Track delivery'].map((step, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 'var(--sp-3)' }}>
                    <div style={{ width: '28px', height: '28px', borderRadius: '50%', background: 'linear-gradient(135deg, var(--primary), #14A3C7)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 'var(--text-xs)', fontWeight: 700, flexShrink: 0 }}>{i + 1}</div>
                    <span style={{ fontSize: 'var(--text-md)', color: 'var(--text-primary)' }}>{step}</span>
                  </div>
                ))}
              </div>
            </RevealDiv>

            <RevealDiv delay={2}>
              <div className="feature-showcase">
                <div className="feature-showcase-header" style={{ background: 'var(--primary-light)' }}>
                  <span style={{ fontWeight: 600, fontSize: 'var(--text-sm)', color: 'var(--primary-dark)' }}>Patient Dashboard</span>
                </div>
                <div className="feature-showcase-body">
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--sp-4)' }}>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--sp-3)' }}>
                      <div style={{ padding: 'var(--sp-3)', background: 'var(--primary-lighter)', borderRadius: 'var(--radius-md)', textAlign: 'center' }}>
                        <div style={{ fontSize: 'var(--text-2xl)', fontWeight: 700, color: 'var(--primary)' }}>3</div>
                        <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>Prescriptions</div>
                      </div>
                      <div style={{ padding: 'var(--sp-3)', background: 'var(--blue-light)', borderRadius: 'var(--radius-md)', textAlign: 'center' }}>
                        <div style={{ fontSize: 'var(--text-2xl)', fontWeight: 700, color: 'var(--blue)' }}>2</div>
                        <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>Active Orders</div>
                      </div>
                    </div>
                    <div style={{ padding: 'var(--sp-3)', background: 'var(--bg-page)', borderRadius: 'var(--radius-md)' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ fontSize: 'var(--text-sm)', fontWeight: 500 }}>Order #ORD-8812</span>
                        <span className="badge badge-success" style={{ fontSize: '10px' }}>Delivered</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </RevealDiv>
          </div>
        </div>
      </section>

      {/* ═══ MEDICINE DISCOVERY ═══ */}
      <section className="section-soft" style={{ padding: 'var(--sp-20) var(--sp-6)' }}>
        <div style={{ maxWidth: '1200px', margin: '0 auto', textAlign: 'center' }}>
          <RevealDiv>
            <Overline>Medicine Discovery</Overline>
            <SectionHeading>Find the medicines you need, with clarity.</SectionHeading>
            <SectionSub style={{ margin: '0 auto var(--sp-10)' }}>
              Search across a comprehensive medicine catalog with real-time availability, pricing and prescription requirements.
            </SectionSub>
          </RevealDiv>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 'var(--sp-4)', maxWidth: '900px', margin: '0 auto' }}>
            {[
              { name: 'Amoxicillin 500mg', generic: 'Amoxicillin', type: 'Prescription', price: '₹45', available: true },
              { name: 'Paracetamol 650mg', generic: 'Paracetamol', type: 'OTC', price: '₹12', available: true },
              { name: 'Cetirizine 10mg', generic: 'Cetirizine', type: 'OTC', price: '₹8', available: true },
              { name: 'Metformin 500mg', generic: 'Metformin', type: 'Prescription', price: '₹28', available: false },
            ].map((med, i) => (
              <RevealDiv key={i} delay={(i + 1) as any}>
                <div className="glass-card" style={{ textAlign: 'left', padding: 'var(--sp-5)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 'var(--sp-2)' }}>
                    <span className={`badge ${med.type === 'OTC' ? 'badge-success' : 'badge-warning'}`} style={{ fontSize: '10px' }}>{med.type}</span>
                    <span style={{ fontWeight: 700, color: 'var(--navy)', fontSize: 'var(--text-lg)' }}>{med.price}</span>
                  </div>
                  <h4 style={{ fontSize: 'var(--text-md)', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '2px' }}>{med.name}</h4>
                  <p style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)', marginBottom: 'var(--sp-3)' }}>{med.generic}</p>
                  <span style={{ fontSize: 'var(--text-xs)', fontWeight: 600, color: med.available ? 'var(--success)' : 'var(--danger)' }}>
                    {med.available ? '\u25CF In Stock' : '\u25CB Out of Stock'}
                  </span>
                </div>
              </RevealDiv>
            ))}
          </div>
        </div>
      </section>

      {/* ═══ PHARMACY SECTION ═══ */}
      <section id="pharmacies" style={{ padding: 'var(--sp-20) var(--sp-6)' }}>
        <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 'var(--sp-12)', alignItems: 'center' }}>
            <RevealDiv>
              <div className="feature-showcase">
                <div className="feature-showcase-header" style={{ background: 'var(--bg-muted)' }}>
                  <span style={{ fontWeight: 600, fontSize: 'var(--text-sm)' }}>Order Fulfillment</span>
                </div>
                <div className="feature-showcase-body">
                  {[
                    { step: 'Order Received', done: true },
                    { step: 'Accepted by Pharmacy', done: true },
                    { step: 'Processing', done: true },
                    { step: 'Ready for Dispatch', done: false },
                    { step: 'Delivered', done: false },
                  ].map((s, i) => (
                    <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 'var(--sp-3)', padding: 'var(--sp-2) 0' }}>
                      <div style={{ width: '20px', height: '20px', borderRadius: '50%', background: s.done ? 'var(--success)' : i === 3 ? 'var(--primary)' : 'var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, transition: 'all 300ms var(--ease)' }}>
                        {s.done && <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>}
                        {!s.done && i === 3 && <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#fff' }} />}
                      </div>
                      <span style={{ fontSize: 'var(--text-sm)', color: s.done ? 'var(--text-primary)' : 'var(--text-muted)', fontWeight: s.done ? 600 : 400 }}>{s.step}</span>
                    </div>
                  ))}
                </div>
              </div>
            </RevealDiv>

            <RevealDiv delay={2}>
              <Overline>For Pharmacies</Overline>
              <SectionHeading>Connect pharmacies to a smarter fulfillment workflow.</SectionHeading>
              <SectionSub>
                Receive orders with full prescription context, manage inventory, process verified prescriptions and update status in real-time.
              </SectionSub>
              <Link href="/professional/pharmacy/register" style={{ textDecoration: 'none', display: 'inline-block', marginTop: 'var(--sp-6)' }}>
                <button className="btn-medical">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="1" y="3" width="15" height="13" /><polygon points="16 8 20 8 23 11 23 16 16 16 16 8" /><circle cx="5.5" cy="18.5" r="2.5" /><circle cx="18.5" cy="18.5" r="2.5" /></svg>
                  Partner With Us
                </button>
              </Link>
            </RevealDiv>
          </div>
        </div>
      </section>

      {/* ═══ AI ASSISTANT ═══ */}
      <section className="section-soft" id="ai" style={{ padding: 'var(--sp-20) var(--sp-6)' }}>
        <div style={{ maxWidth: '1200px', margin: '0 auto', textAlign: 'center' }}>
          <RevealDiv>
            <Overline>AI Intelligence</Overline>
            <SectionHeading>Intelligence where healthcare workflows need it.</SectionHeading>
            <SectionSub style={{ margin: '0 auto var(--sp-4)' }}>
              AI-powered assistance helps patients understand their prescriptions, medicines and healthcare journey &mdash; always with appropriate disclaimers.
            </SectionSub>
            <p style={{ fontSize: 'var(--text-sm)', color: 'var(--text-muted)', maxWidth: '640px', margin: '0 auto var(--sp-10)', fontStyle: 'italic' }}>
              AI assists the workflow. Clinical decisions remain under appropriate human oversight.
            </p>
          </RevealDiv>

          <RevealDiv delay={2}>
            <div className="feature-showcase" style={{ maxWidth: '600px', margin: '0 auto' }}>
              <div className="feature-showcase-header" style={{ background: 'var(--navy)', color: '#fff' }}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2a10 10 0 1010 10A10 10 0 0012 2z" /><path d="M12 6v6l4 2" /></svg>
                <span style={{ fontWeight: 600, fontSize: 'var(--text-sm)' }}>AI Healthcare Assistant</span>
              </div>
              <div className="feature-showcase-body">
                <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--sp-4)' }}>
                  <div style={{ alignSelf: 'flex-end', background: 'linear-gradient(135deg, var(--primary), #0A8E8A)', color: '#fff', padding: 'var(--sp-3) var(--sp-4)', borderRadius: 'var(--radius-lg) var(--radius-lg) 4px var(--radius-lg)', maxWidth: '80%', fontSize: 'var(--text-sm)' }}>
                    What is Amoxicillin used for?
                  </div>
                  <div style={{ alignSelf: 'flex-start', background: 'var(--bg-page)', padding: 'var(--sp-3) var(--sp-4)', borderRadius: 'var(--radius-lg) var(--radius-lg) var(--radius-lg) 4px', maxWidth: '85%', fontSize: 'var(--text-sm)', color: 'var(--text-secondary)' }}>
                    Amoxicillin is an antibiotic used to treat bacterial infections. It belongs to the penicillin group of antibiotics. Always follow your doctor&apos;s prescription for dosage and duration.
                  </div>
                  <p style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)', textAlign: 'center', marginTop: 'var(--sp-2)' }}>
                    AI-generated information is for assistance and does not replace professional medical advice.
                  </p>
                </div>
              </div>
            </div>
          </RevealDiv>
        </div>
      </section>

      {/* ═══ HOW IT WORKS ═══ */}
      <section id="how-it-works" style={{ padding: 'var(--sp-20) var(--sp-6)' }}>
        <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
          <RevealDiv>
            <div style={{ textAlign: 'center', marginBottom: 'var(--sp-12)' }}>
              <Overline>How It Works</Overline>
              <SectionHeading>From prescription to delivery, in six steps.</SectionHeading>
            </div>
          </RevealDiv>

          <div className="how-it-works-grid">
            {[
              { num: '01', title: 'Upload Prescription', desc: 'Photograph or scan your prescription', color: 'var(--primary)' },
              { num: '02', title: 'AI Extraction', desc: 'OCR extracts medicine data automatically', color: '#1E6FB5' },
              { num: '03', title: 'Doctor Verification', desc: 'Licensed doctor reviews and approves', color: '#189B6A' },
              { num: '04', title: 'Discover Medicines', desc: 'Search, compare and select medicines', color: '#D48800' },
              { num: '05', title: 'Order & Pay', desc: 'Secure checkout with multiple options', color: '#14A3C7' },
              { num: '06', title: 'Track Fulfillment', desc: 'Real-time order tracking to delivery', color: 'var(--navy)' },
            ].map((step, i) => (
              <RevealDiv key={i} delay={(i + 1) as any}>
                <div className="gradient-border-card" style={{
                  textAlign: 'center',
                  padding: 'var(--sp-5) var(--sp-3)',
                  height: '100%',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                }}>
                  <div style={{
                    width: '48px',
                    height: '48px',
                    borderRadius: '50%',
                    background: `linear-gradient(135deg, ${step.color}, ${step.color}dd)`,
                    color: '#fff',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    marginBottom: 'var(--sp-3)',
                    fontSize: 'var(--text-sm)',
                    fontWeight: 700,
                    boxShadow: `0 4px 12px ${step.color}40`,
                  }}>
                    {step.num}
                  </div>
                  <h4 style={{ fontSize: 'var(--text-sm)', fontWeight: 600, color: 'var(--navy)', marginBottom: '6px' }}>{step.title}</h4>
                  <p style={{ fontSize: 'var(--text-xs)', color: 'var(--text-secondary)', lineHeight: 1.5, margin: 0 }}>{step.desc}</p>
                </div>
              </RevealDiv>
            ))}
          </div>
        </div>
      </section>

      {/* ═══ EKG DIVIDER ═══ */}
      <EKGDivider />

      {/* ═══ TESTIMONIALS — NEW ═══ */}
      <section style={{ padding: 'var(--sp-20) var(--sp-6)', background: 'var(--bg-surface)' }}>
        <div style={{ maxWidth: '1200px', margin: '0 auto', textAlign: 'center' }}>
          <RevealDiv>
            <Overline>What People Say</Overline>
            <SectionHeading>Trusted by patients and healthcare professionals.</SectionHeading>
            <SectionSub style={{ margin: '0 auto var(--sp-12)' }}>
              Hear from the people who use I.P. &amp; M.D every day to simplify their healthcare experience.
            </SectionSub>
          </RevealDiv>

          <div className="testimonial-grid">
            {[
              {
                quote: 'Uploading my prescription was incredibly easy. Within minutes, I had all my medicines identified and could order them directly. The tracking feature gives me peace of mind.',
                name: 'Ananya Sharma',
                role: 'Patient',
                initials: 'AS',
                color: '#0B6E6B',
              },
              {
                quote: 'The AI extraction accuracy is impressive. It saves me significant time on prescription review while still giving me full control over verification. A great tool for clinical workflows.',
                name: 'Dr. Rajesh Kumar',
                role: 'Verified Doctor',
                initials: 'RK',
                color: '#1E6FB5',
              },
              {
                quote: 'Our pharmacy processes orders much faster now. The structured prescription data and real-time status updates have streamlined our entire fulfillment pipeline.',
                name: 'MedPlus Pharmacy',
                role: 'Partner Pharmacy',
                initials: 'MP',
                color: '#189B6A',
              },
            ].map((t, i) => (
              <RevealDiv key={i} delay={(i + 1) as any}>
                <div className="testimonial-card">
                  <p className="testimonial-quote">&ldquo;{t.quote}&rdquo;</p>
                  <div className="testimonial-author">
                    <div className="testimonial-avatar" style={{ background: `linear-gradient(135deg, ${t.color}, ${t.color}cc)` }}>
                      {t.initials}
                    </div>
                    <div>
                      <div className="testimonial-name">{t.name}</div>
                      <div className="testimonial-role">{t.role}</div>
                    </div>
                  </div>
                </div>
              </RevealDiv>
            ))}
          </div>
        </div>
      </section>

      {/* ═══ SECURITY / TRUST ═══ */}
      <section style={{ padding: 'var(--sp-20) var(--sp-6)' }} className="medical-bg-pattern">
        <div style={{ maxWidth: '1200px', margin: '0 auto', position: 'relative', zIndex: 1 }}>
          <RevealDiv>
            <div style={{ textAlign: 'center', marginBottom: 'var(--sp-10)' }}>
              <Overline>Trust &amp; Security</Overline>
              <SectionHeading>Your healthcare data, protected at every level.</SectionHeading>
            </div>
          </RevealDiv>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 'var(--sp-5)', maxWidth: '1000px', margin: '0 auto' }}>
            {[
              { title: 'Role-Based Access', desc: 'Every user sees only what their role permits.', icon: <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="var(--primary)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" /></svg> },
              { title: 'Secure Authentication', desc: 'JWT-based access with token refresh and session management.', icon: <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#1E6FB5" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2" /><path d="M7 11V7a5 5 0 0110 0v4" /></svg> },
              { title: 'Audit Logging', desc: 'Every privileged action is recorded for compliance.', icon: <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#189B6A" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" /><polyline points="14 2 14 8 20 8" /><line x1="16" y1="13" x2="8" y2="13" /><line x1="16" y1="17" x2="8" y2="17" /></svg> },
              { title: 'Data Encryption', desc: 'Encrypted data in transit and at rest for maximum protection.', icon: <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#D48800" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><path d="M12 16v-4" /><path d="M12 8h.01" /></svg> },
            ].map((item, i) => (
              <RevealDiv key={i} delay={(i + 1) as any}>
                <div className="glass-card" style={{ textAlign: 'center', padding: 'var(--sp-6)' }}>
                  <div style={{ width: '48px', height: '48px', borderRadius: '50%', background: 'var(--primary-lighter)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto var(--sp-4)' }}>
                    {item.icon}
                  </div>
                  <h4 style={{ fontSize: 'var(--text-sm)', fontWeight: 600, color: 'var(--navy)', marginBottom: '4px' }}>{item.title}</h4>
                  <p style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)', lineHeight: 1.5 }}>{item.desc}</p>
                </div>
              </RevealDiv>
            ))}
          </div>
        </div>
      </section>

      {/* ═══ FAQ ═══ */}
      <section className="section-soft" id="faq" style={{ padding: 'var(--sp-20) var(--sp-6)' }}>
        <div style={{ maxWidth: '720px', margin: '0 auto', textAlign: 'center' }}>
          <RevealDiv>
            <Overline>FAQ</Overline>
            <SectionHeading>Frequently asked questions.</SectionHeading>
          </RevealDiv>

          <RevealDiv delay={1}>
            <div style={{ marginTop: 'var(--sp-8)', textAlign: 'left' }}>
              {[
                { q: 'What is I.P. & M.D?', a: 'I.P. & M.D stands for Intelligent Prescription & Medicine Discovery. It is a healthcare platform that connects patients, doctors and pharmacies through intelligent prescription processing, medicine discovery and connected healthcare workflows.' },
                { q: 'How does prescription upload work?', a: 'Patients photograph or scan their prescription and upload it to the platform. Our AI-powered OCR engine extracts medicine names, dosages, frequencies and durations from the image, structuring the data for doctor verification.' },
                { q: 'Is my health data secure?', a: 'Yes. We use encrypted data transfer, role-based access control, JWT-based authentication, and comprehensive audit logging to protect your health information at every level.' },
                { q: 'Who verifies the AI extraction?', a: 'Licensed doctors review and verify all AI-extracted prescription data before any medicines can be ordered. The AI assists the workflow while doctors retain full clinical control.' },
                { q: 'How can pharmacies join the network?', a: 'Pharmacies can register as partners through our platform. Once verified, they receive structured prescription orders, manage inventory, and update fulfillment status in real-time.' },
              ].map((item, i) => (
                <div key={i} style={{ borderBottom: '1px solid var(--border-light)' }}>
                  <button
                    onClick={() => setFaqOpen(faqOpen === i ? null : i)}
                    style={{ width: '100%', display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: 'var(--sp-4) 0', background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left' }}
                    aria-expanded={faqOpen === i}
                  >
                    <span style={{ fontWeight: 600, fontSize: 'var(--text-md)', color: 'var(--text-primary)' }}>{item.q}</span>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--text-muted)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ transform: faqOpen === i ? 'rotate(180deg)' : 'rotate(0)', transition: 'transform 200ms', flexShrink: 0, marginLeft: 'var(--sp-3)' }}>
                      <polyline points="6 9 12 15 18 9" />
                    </svg>
                  </button>
                  <div style={{ overflow: 'hidden', maxHeight: faqOpen === i ? '200px' : '0', transition: 'max-height 300ms cubic-bezier(0.16, 1, 0.3, 1)' }}>
                    <p style={{ fontSize: 'var(--text-sm)', color: 'var(--text-secondary)', lineHeight: 1.7, paddingBottom: 'var(--sp-4)' }}>{item.a}</p>
                  </div>
                </div>
              ))}
            </div>
          </RevealDiv>
        </div>
      </section>

      {/* ═══ FINAL CTA ═══ */}
      <section className="section-navy" style={{ position: 'relative', overflow: 'hidden', padding: 'var(--sp-20) var(--sp-6)' }}>
        <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(ellipse at 30% 50%, rgba(11, 110, 107, 0.15) 0%, transparent 60%)', pointerEvents: 'none' }} />
        <MedicalCross size={150} opacity={0.03} style={{ top: '10%', right: '10%' }} />
        <MedicalCross size={80} opacity={0.04} style={{ bottom: '15%', left: '8%' }} />

        <div style={{ maxWidth: '1200px', margin: '0 auto', textAlign: 'center', position: 'relative', zIndex: 1 }}>
          <RevealDiv>
            <h2 style={{ fontSize: 'clamp(28px, 4vw, 42px)', fontWeight: 800, color: '#fff', letterSpacing: '-0.03em', lineHeight: 1.2, marginBottom: 'var(--sp-4)' }}>
              One connected experience,{' '}
              <span style={{
                background: 'linear-gradient(135deg, #14A3C7 0%, #189B6A 50%, #14A3C7 100%)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                backgroundClip: 'text',
              }}>
                built around the prescription.
              </span>
            </h2>
            <SectionSub style={{ margin: '0 auto var(--sp-8)', color: 'rgba(255,255,255,0.6)' }}>
              From intelligent prescription processing to verified medicine fulfillment, I.P. &amp; M.D brings healthcare workflows together.
            </SectionSub>
          </RevealDiv>

          <RevealDiv delay={2}>
            <div style={{ display: 'flex', gap: 'var(--sp-3)', justifyContent: 'center', flexWrap: 'wrap' }}>
              <Link href="/patient/register" style={{ textDecoration: 'none' }}>
                <button className="btn-medical" style={{ padding: '16px 36px', fontSize: 'var(--text-md)', borderRadius: 'var(--radius-lg)' }}>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="8.5" cy="7" r="4" /><line x1="20" y1="8" x2="20" y2="14" /><line x1="23" y1="11" x2="17" y2="11" /></svg>
                  Get Started Free
                </button>
              </Link>
              <a href="#platform" style={{ textDecoration: 'none' }}>
                <button className="btn" style={{ padding: '16px 36px', fontSize: 'var(--text-md)', background: 'rgba(255,255,255,0.1)', color: '#fff', border: '1px solid rgba(255,255,255,0.2)', borderRadius: 'var(--radius-lg)' }}>Explore Platform</button>
              </a>
            </div>
          </RevealDiv>
        </div>
      </section>

      {/* ═══ FOOTER — ENHANCED ═══ */}
      <footer className="footer-medical" style={{ color: 'rgba(255,255,255,0.6)', padding: 'var(--sp-16) var(--sp-6) var(--sp-8)' }}>
        <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 'var(--sp-10)', marginBottom: 'var(--sp-12)' }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--sp-2)', marginBottom: 'var(--sp-4)' }}>
                <div style={{ width: '32px', height: '32px', borderRadius: 'var(--radius-md)', background: 'linear-gradient(135deg, var(--primary), #0A8E8A)', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 2px 8px rgba(11, 110, 107, 0.3)' }}>
                  <svg width="16" height="16" viewBox="0 0 80 80" fill="none">
                    <rect x="30" y="5" width="20" height="70" rx="4" fill="#fff" />
                    <rect x="5" y="30" width="70" height="20" rx="4" fill="#fff" />
                  </svg>
                </div>
                <span style={{ fontWeight: 700, fontSize: 'var(--text-lg)', color: '#fff' }}>I.P. &amp; M.D</span>
              </div>
              <p style={{ fontSize: 'var(--text-sm)', lineHeight: 1.6 }}>Intelligent Prescription &amp; Medicine Discovery Platform</p>
              <div style={{ display: 'flex', gap: 'var(--sp-3)', marginTop: 'var(--sp-4)' }}>
                {/* Social icons */}
                {[
                  <svg key="tw" width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" /></svg>,
                  <svg key="li" width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" /></svg>,
                  <svg key="em" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" /><polyline points="22,6 12,13 2,6" /></svg>,
                ].map((icon, i) => (
                  <a key={i} href="#" style={{ width: '32px', height: '32px', borderRadius: '50%', background: 'rgba(255,255,255,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'rgba(255,255,255,0.5)', transition: 'all 200ms', textDecoration: 'none' }}
                    onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = 'rgba(11, 110, 107, 0.3)'; (e.currentTarget as HTMLElement).style.color = '#fff'; }}
                    onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.08)'; (e.currentTarget as HTMLElement).style.color = 'rgba(255,255,255,0.5)'; }}
                  >
                    {icon}
                  </a>
                ))}
              </div>
            </div>

            {[
              { title: 'Platform', links: [
                { label: 'Prescription Intelligence', href: '#platform' },
                { label: 'Doctor Verification', href: '#doctors' },
                { label: 'Medicine Discovery', href: '#platform' },
                { label: 'Pharmacy Network', href: '#pharmacies' },
              ]},
              { title: 'For Patients', links: [
                { label: 'Upload Prescription', href: '/patient/register' },
                { label: 'Medicines', href: '#platform' },
                { label: 'Orders', href: '/patient/register' },
                { label: 'AI Assistant', href: '#ai' },
              ]},
              { title: 'For Doctors', links: [
                { label: 'Verification Queue', href: '#doctors' },
                { label: 'Reports', href: '#doctors' },
                { label: 'Audit Trail', href: '#doctors' },
              ]},
              { title: 'Company', links: [
                { label: 'About', href: '#platform' },
                { label: 'Privacy', href: '#' },
                { label: 'Terms', href: '#' },
                { label: 'Contact', href: '#' },
              ]},
            ].map((col, i) => (
              <div key={i}>
                <h4 style={{ fontWeight: 600, color: '#fff', fontSize: 'var(--text-sm)', marginBottom: 'var(--sp-4)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{col.title}</h4>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--sp-2)' }}>
                  {col.links.map((link) => (
                    <a key={link.label} href={link.href} style={{ fontSize: 'var(--text-sm)', color: 'rgba(255,255,255,0.5)', textDecoration: 'none', transition: 'color 150ms' }}
                      onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.color = '#fff'; }}
                      onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.color = 'rgba(255,255,255,0.5)'; }}
                    >
                      {link.label}
                    </a>
                  ))}
                </div>
              </div>
            ))}
          </div>

          {/* Medical disclaimer bar */}
          <div style={{ background: 'rgba(255,255,255,0.04)', borderRadius: 'var(--radius-md)', padding: 'var(--sp-3) var(--sp-5)', marginBottom: 'var(--sp-6)', display: 'flex', alignItems: 'center', gap: 'var(--sp-3)' }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.4)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}><circle cx="12" cy="12" r="10" /><path d="M12 16v-4" /><path d="M12 8h.01" /></svg>
            <p style={{ fontSize: 'var(--text-xs)', color: 'rgba(255,255,255,0.4)', lineHeight: 1.5 }}>
              AI-generated information is for educational assistance only and does not replace professional medical advice, diagnosis, or treatment. Always consult a qualified healthcare provider.
            </p>
          </div>

          <div style={{ borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: 'var(--sp-6)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 'var(--sp-4)' }}>
            <p style={{ fontSize: 'var(--text-xs)' }}>&copy; 2026 I.P. &amp; M.D Platform. Healthcare technology for prescription intelligence and medicine discovery.</p>
            <div style={{ display: 'flex', gap: 'var(--sp-4)' }}>
              <a href="#" style={{ fontSize: 'var(--text-xs)', color: 'rgba(255,255,255,0.4)', textDecoration: 'none' }}>Privacy Policy</a>
              <a href="#" style={{ fontSize: 'var(--text-xs)', color: 'rgba(255,255,255,0.4)', textDecoration: 'none' }}>Terms of Service</a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
