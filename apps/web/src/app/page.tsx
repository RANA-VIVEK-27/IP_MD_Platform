'use client';

import React, { useState, useEffect, useRef, Suspense, lazy } from 'react';
import Link from 'next/link';

const HealthcareScene = lazy(() =>
  import('../components/home/HealthcareScene').then(m => ({ default: m.HealthcareScene }))
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

/* ─── Reusable tiny helpers ─── */
function Section({ id, children, style, className }: { id?: string; children: React.ReactNode; style?: React.CSSProperties; className?: string }) {
  return <section id={id} className={className} style={{ padding: 'var(--sp-20) var(--sp-6)', maxWidth: '1200px', margin: '0 auto', ...style }}>{children}</section>;
}

function FullSection({ children, className, style, id }: { children: React.ReactNode; className?: string; style?: React.CSSProperties; id?: string }) {
  return <section id={id} className={className} style={{ padding: 'var(--sp-20) var(--sp-6)', ...style }}>{children}</section>;
}

function RevealDiv({ children, className, style, delay }: { children: React.ReactNode; className?: string; style?: React.CSSProperties; delay?: number }) {
  const ref = useReveal();
  return <div ref={ref} className={`reveal ${delay ? `reveal-delay-${delay}` : ''} ${className || ''}`} style={style}>{children}</div>;
}

function Overline({ children }: { children: React.ReactNode }) {
  return <p className="text-overline" style={{ marginBottom: 'var(--sp-3)', color: 'var(--primary)', letterSpacing: '0.08em' }}>{children}</p>;
}

function SectionHeading({ children }: { children: React.ReactNode }) {
  return <h2 style={{ fontSize: 'clamp(28px, 4vw, 40px)', fontWeight: 800, color: 'var(--navy)', letterSpacing: '-0.03em', lineHeight: 1.2, marginBottom: 'var(--sp-4)' }}>{children}</h2>;
}

function SectionSub({ children, style }: { children: React.ReactNode; style?: React.CSSProperties }) {
  return <p style={{ fontSize: 'var(--text-lg)', color: 'var(--text-secondary)', lineHeight: 1.7, maxWidth: '640px', ...style }}>{children}</p>;
}

function Card({ children, style, hover }: { children: React.ReactNode; style?: React.CSSProperties; hover?: boolean }) {
  const [hov, setHov] = useState(false);
  return (
    <div
      onMouseEnter={() => hover && setHov(true)}
      onMouseLeave={() => hover && setHov(false)}
      style={{
        background: 'var(--bg-surface)',
        border: '1px solid var(--border-light)',
        borderRadius: 'var(--radius-lg)',
        padding: 'var(--sp-6)',
        transition: 'all 250ms var(--ease)',
        transform: hov ? 'translateY(-3px)' : 'none',
        boxShadow: hov ? 'var(--shadow-lg)' : 'var(--shadow-sm)',
        ...style,
      }}
    >
      {children}
    </div>
  );
}

function IconBox({ color, children }: { color: string; children: React.ReactNode }) {
  return (
    <div style={{ width: '48px', height: '48px', borderRadius: 'var(--radius-md)', background: color, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginBottom: 'var(--sp-4)' }}>
      {children}
    </div>
  );
}

function CheckIcon() {
  return <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--success)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>;
}

/* ═══════════════════════════════════════════════
   LANDING PAGE
   ═══════════════════════════════════════════════ */
export default function LandingPage() {
  const [faqOpen, setFaqOpen] = useState<number | null>(null);

  return (
    <div style={{ overflow: 'hidden' }}>
      {/* ═══ HERO ═══ */}
      <section style={{ position: 'relative', padding: '120px var(--sp-6) 80px', background: 'linear-gradient(165deg, #F0FAFA 0%, #EDF5FB 40%, #F4F8FA 100%)', overflow: 'hidden', minHeight: '85vh', display: 'flex', alignItems: 'center' }}>
        <div style={{ position: 'absolute', top: '10%', right: '8%', width: '400px', height: '400px', borderRadius: '50%', background: 'radial-gradient(circle, rgba(8,127,123,0.06) 0%, transparent 70%)', pointerEvents: 'none' }} />
        <div style={{ position: 'absolute', bottom: '5%', left: '5%', width: '250px', height: '250px', borderRadius: '50%', background: 'radial-gradient(circle, rgba(37,99,166,0.05) 0%, transparent 70%)', pointerEvents: 'none' }} />

        <div className="hero-grid" style={{ maxWidth: '1280px', margin: '0 auto', position: 'relative', zIndex: 1, width: '100%', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--sp-12)', alignItems: 'center' }}>
          {/* Left: Text + CTA */}
          <div>
            <RevealDiv>
              <p style={{ display: 'inline-block', padding: '6px 16px', borderRadius: 'var(--radius-pill)', background: 'var(--primary-light)', color: 'var(--primary)', fontWeight: 600, fontSize: 'var(--text-xs)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 'var(--sp-6)' }}>
                Intelligent Healthcare Platform
              </p>
            </RevealDiv>

            <RevealDiv delay={1}>
              <h1 style={{ fontSize: 'clamp(36px, 5vw, 56px)', fontWeight: 800, color: 'var(--navy)', letterSpacing: '-0.04em', lineHeight: 1.08, marginBottom: 'var(--sp-6)' }}>
                From Prescription to Medicine,<br />
                <span style={{ color: 'var(--primary)' }}>Made Smarter.</span>
              </h1>
            </RevealDiv>

            <RevealDiv delay={2}>
              <p style={{ fontSize: 'clamp(16px, 2vw, 19px)', color: 'var(--text-secondary)', lineHeight: 1.7, marginBottom: 'var(--sp-8)', maxWidth: '520px' }}>
                I.P. & M.D connects patients, doctors and pharmacies through intelligent prescription processing, medicine discovery and secure healthcare workflows.
              </p>
            </RevealDiv>

            <RevealDiv delay={3}>
              <div style={{ display: 'flex', gap: 'var(--sp-3)', flexWrap: 'wrap', marginBottom: 'var(--sp-8)' }}>
                <Link href="/register" style={{ textDecoration: 'none' }}>
                  <button className="btn btn-primary" style={{ padding: '14px 32px', fontSize: 'var(--text-md)', fontWeight: 600, borderRadius: 'var(--radius-md)' }}>Get Started</button>
                </Link>
                <a href="#platform" style={{ textDecoration: 'none' }}>
                  <button className="btn btn-secondary" style={{ padding: '14px 32px', fontSize: 'var(--text-md)', borderRadius: 'var(--radius-md)' }}>Explore the Platform</button>
                </a>
              </div>
            </RevealDiv>

            <RevealDiv delay={4}>
              <div style={{ display: 'flex', gap: 'var(--sp-6)', flexWrap: 'wrap', color: 'var(--text-muted)', fontSize: 'var(--text-sm)' }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><CheckIcon /> AI-Powered Extractions</span>
                <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><CheckIcon /> Doctor Verified</span>
                <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><CheckIcon /> Secure Health Data</span>
                <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><CheckIcon /> Pharmacy Network</span>
              </div>
            </RevealDiv>
          </div>

          {/* Right: 3D Scene */}
          <RevealDiv delay={2} style={{ height: '500px', position: 'relative' }}>
            <Suspense fallback={
              <div style={{ width: '100%', height: '100%', borderRadius: 'var(--radius-xl)', background: 'linear-gradient(165deg, #F0FAFA 0%, #EDF5FB 40%, #F4F8FA 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <div style={{ textAlign: 'center', color: 'var(--text-muted)' }}>
                  <div style={{ width: 40, height: 40, borderRadius: '50%', border: '3px solid var(--primary-light)', borderTopColor: 'var(--primary)', animation: 'spin 0.8s linear infinite', margin: '0 auto var(--sp-3)' }} />
                  <p style={{ fontSize: 'var(--text-sm)' }}>Loading visualization...</p>
                </div>
              </div>
            }>
              <HealthcareScene />
            </Suspense>
          </RevealDiv>
        </div>
      </section>

      {/* ═══ TRUST STRIP ═══ */}
      <section style={{ padding: 'var(--sp-5) var(--sp-6)', background: 'var(--bg-surface)', borderBottom: '1px solid var(--border-light)' }}>
        <div style={{ maxWidth: '1200px', margin: '0 auto', display: 'flex', justifyContent: 'center', gap: 'var(--sp-10)', flexWrap: 'wrap' }}>
          {['Prescription Intelligence', 'Doctor Verification', 'Medicine Discovery', 'Secure Workflow', 'Pharmacy Network'].map((item) => (
            <span key={item} style={{ fontSize: 'var(--text-sm)', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{item}</span>
          ))}
        </div>
      </section>

      {/* ═══ TRUST / PLATFORM INTRO ═══ */}
      <FullSection>
        <div style={{ maxWidth: '1200px', margin: '0 auto', textAlign: 'center' }}>
          <RevealDiv>
            <Overline>The Platform</Overline>
            <SectionHeading>Healthcare shouldn&rsquo;t feel disconnected.</SectionHeading>
            <SectionSub style={{ margin: '0 auto var(--sp-12)' }}>
              I.P. & M.D brings the entire prescription-to-medicine journey into one connected platform. Patients, doctors and pharmacies work together seamlessly.
            </SectionSub>
          </RevealDiv>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 'var(--sp-8)', maxWidth: '1000px', margin: '0 auto' }}>
            {[
              { role: 'PATIENT', icon: <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#087F7B" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>, desc: 'Simple access to prescriptions and medicines.', color: '#087F7B' },
              { role: 'DOCTOR', icon: <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#2563A6" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>, desc: 'Reliable prescription review and verification.', color: '#2563A6' },
              { role: 'PHARMACY', icon: <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#22A06B" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><rect x="1" y="3" width="15" height="13"/><polygon points="16 8 20 8 23 11 23 16 16 16 16 8"/><circle cx="5.5" cy="18.5" r="2.5"/><circle cx="18.5" cy="18.5" r="2.5"/></svg>, desc: 'Structured fulfillment and order workflows.', color: '#22A06B' },
            ].map((item, i) => (
              <RevealDiv key={i} delay={i + 1 as any}>
                <Card hover style={{ textAlign: 'center', padding: 'var(--sp-8)' }}>
                  <div style={{ width: '56px', height: '56px', borderRadius: '50%', background: `${item.color}10`, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto var(--sp-4)' }}>
                    {item.icon}
                  </div>
                  <p style={{ fontSize: 'var(--text-xs)', fontWeight: 700, color: item.color, letterSpacing: '0.1em', marginBottom: 'var(--sp-2)' }}>{item.role}</p>
                  <p style={{ fontSize: 'var(--text-sm)', color: 'var(--text-secondary)', lineHeight: 1.6 }}>{item.desc}</p>
                </Card>
              </RevealDiv>
            ))}
          </div>
        </div>
      </FullSection>

      {/* ═══ PLATFORM OVERVIEW ═══ */}
      <FullSection className="section-soft" id="platform">
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
              { icon: <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--primary)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>, title: 'Prescription Intelligence', desc: 'AI-powered OCR extracts medicine data from uploaded prescriptions with high accuracy.' },
              { icon: <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--blue)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 11.08V12a10 10 0 11-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>, title: 'Doctor Verification', desc: 'Licensed doctors review and verify extracted prescription data before fulfillment.' },
              { icon: <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--green)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>, title: 'Medicine Discovery', desc: 'Search, compare and discover medicines with availability and pricing information.' },
              { icon: <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--warning)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="1" y="3" width="15" height="13"/><polygon points="16 8 20 8 23 11 23 16 16 16 16 8"/><circle cx="5.5" cy="18.5" r="2.5"/><circle cx="18.5" cy="18.5" r="2.5"/></svg>, title: 'Pharmacy & Ordering', desc: 'Connected pharmacy network for seamless prescription fulfillment and delivery.' },
              { icon: <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--navy)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2a10 10 0 1010 10A10 10 0 0012 2z"/><path d="M12 6v6l4 2"/></svg>, title: 'Order Tracking', desc: 'Real-time visibility from order placement through pharmacy processing to delivery.' },
            ].map((item, i) => (
              <RevealDiv key={i} delay={(i + 1) as any}>
                <Card hover style={{ textAlign: 'left', height: '100%' }}>
                  <IconBox color="var(--primary-lighter)">{item.icon}</IconBox>
                  <h3 style={{ fontSize: 'var(--text-lg)', fontWeight: 700, color: 'var(--navy)', marginBottom: 'var(--sp-2)' }}>{item.title}</h3>
                  <p style={{ fontSize: 'var(--text-sm)', color: 'var(--text-secondary)', lineHeight: 1.6 }}>{item.desc}</p>
                </Card>
              </RevealDiv>
            ))}
          </div>
        </div>
      </FullSection>

      {/* ═══ PRESCRIPTION INTELLIGENCE ═══ */}
      <FullSection>
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
              <Card style={{ padding: 0, overflow: 'hidden' }}>
                <div style={{ padding: 'var(--sp-4) var(--sp-5)', background: 'var(--bg-muted)', borderBottom: '1px solid var(--border-light)', display: 'flex', alignItems: 'center', gap: 'var(--sp-3)' }}>
                  <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: 'var(--danger)' }} />
                  <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: 'var(--warning)' }} />
                  <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: 'var(--success)' }} />
                  <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)', marginLeft: 'var(--sp-2)' }}>AI Extraction Results</span>
                </div>
                <div style={{ padding: 'var(--sp-5)' }}>
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
              </Card>
            </RevealDiv>
          </div>
        </div>
      </FullSection>

      {/* ═══ DOCTOR SECTION ═══ */}
      <FullSection className="section-soft" id="doctors">
        <div style={{ maxWidth: '1200px', margin: '0 auto', textAlign: 'center' }}>
          <RevealDiv>
            <Overline>For Doctors</Overline>
            <SectionHeading>Give doctors the information they need to review with confidence.</SectionHeading>
            <SectionSub style={{ margin: '0 auto var(--sp-10)' }}>
              AI assists the workflow. Doctors remain in control of verification. Every prescription goes through clinical review before medicines can be ordered.
            </SectionSub>
          </RevealDiv>

          <RevealDiv delay={2}>
            <Card style={{ maxWidth: '800px', margin: '0 auto', padding: 0, overflow: 'hidden' }}>
              <div style={{ padding: 'var(--sp-4) var(--sp-5)', background: 'var(--bg-muted)', borderBottom: '1px solid var(--border-light)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontWeight: 600, fontSize: 'var(--text-sm)' }}>Verification Queue</span>
                <span className="badge badge-warning">2 Pending</span>
              </div>
              <div style={{ padding: 'var(--sp-4) var(--sp-5)', display: 'flex', flexDirection: 'column', gap: 'var(--sp-3)' }}>
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
            </Card>
          </RevealDiv>
        </div>
      </FullSection>

      {/* ═══ PATIENT SECTION ═══ */}
      <FullSection id="patients">
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
                    <div style={{ width: '28px', height: '28px', borderRadius: '50%', background: 'var(--primary)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 'var(--text-xs)', fontWeight: 700, flexShrink: 0 }}>{i + 1}</div>
                    <span style={{ fontSize: 'var(--text-md)', color: 'var(--text-primary)' }}>{step}</span>
                  </div>
                ))}
              </div>
            </RevealDiv>

            <RevealDiv delay={2}>
              <Card style={{ padding: 0, overflow: 'hidden' }}>
                <div style={{ padding: 'var(--sp-4) var(--sp-5)', background: 'var(--primary-light)', borderBottom: '1px solid var(--border-light)' }}>
                  <span style={{ fontWeight: 600, fontSize: 'var(--text-sm)', color: 'var(--primary-dark)' }}>Patient Dashboard</span>
                </div>
                <div style={{ padding: 'var(--sp-5)' }}>
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
              </Card>
            </RevealDiv>
          </div>
        </div>
      </FullSection>

      {/* ═══ MEDICINE DISCOVERY ═══ */}
      <FullSection className="section-soft">
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
                <Card hover style={{ textAlign: 'left' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 'var(--sp-2)' }}>
                    <span className={`badge ${med.type === 'OTC' ? 'badge-success' : 'badge-warning'}`} style={{ fontSize: '10px' }}>{med.type}</span>
                    <span style={{ fontWeight: 700, color: 'var(--navy)', fontSize: 'var(--text-lg)' }}>{med.price}</span>
                  </div>
                  <h4 style={{ fontSize: 'var(--text-md)', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '2px' }}>{med.name}</h4>
                  <p style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)', marginBottom: 'var(--sp-3)' }}>{med.generic}</p>
                  <span style={{ fontSize: 'var(--text-xs)', fontWeight: 600, color: med.available ? 'var(--success)' : 'var(--danger)' }}>
                    {med.available ? '\u25CF In Stock' : '\u25CB Out of Stock'}
                  </span>
                </Card>
              </RevealDiv>
            ))}
          </div>
        </div>
      </FullSection>

      {/* ═══ PHARMACY SECTION ═══ */}
      <FullSection id="pharmacies">
        <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 'var(--sp-12)', alignItems: 'center' }}>
            <RevealDiv>
              <Card style={{ padding: 0, overflow: 'hidden' }}>
                <div style={{ padding: 'var(--sp-4) var(--sp-5)', background: 'var(--bg-muted)', borderBottom: '1px solid var(--border-light)' }}>
                  <span style={{ fontWeight: 600, fontSize: 'var(--text-sm)' }}>Order Fulfillment</span>
                </div>
                <div style={{ padding: 'var(--sp-5)' }}>
                  {[
                    { step: 'Order Received', done: true },
                    { step: 'Accepted by Pharmacy', done: true },
                    { step: 'Processing', done: true },
                    { step: 'Ready for Dispatch', done: false },
                    { step: 'Delivered', done: false },
                  ].map((s, i) => (
                    <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 'var(--sp-3)', padding: 'var(--sp-2) 0' }}>
                      <div style={{ width: '20px', height: '20px', borderRadius: '50%', background: s.done ? 'var(--success)' : i === 3 ? 'var(--primary)' : 'var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                        {s.done && <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>}
                        {!s.done && i === 3 && <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#fff' }} />}
                      </div>
                      <span style={{ fontSize: 'var(--text-sm)', color: s.done ? 'var(--text-primary)' : 'var(--text-muted)', fontWeight: s.done ? 600 : 400 }}>{s.step}</span>
                    </div>
                  ))}
                </div>
              </Card>
            </RevealDiv>

            <RevealDiv delay={2}>
              <Overline>For Pharmacies</Overline>
              <SectionHeading>Connect pharmacies to a smarter fulfillment workflow.</SectionHeading>
              <SectionSub>
                Receive orders with full prescription context, manage inventory, process verified prescriptions and update status in real-time.
              </SectionSub>
              <Link href="/register" style={{ textDecoration: 'none', display: 'inline-block', marginTop: 'var(--sp-6)' }}>
                <button className="btn btn-primary">Partner With Us</button>
              </Link>
            </RevealDiv>
          </div>
        </div>
      </FullSection>

      {/* ═══ AI ASSISTANT ═══ */}
      <FullSection className="section-soft" id="ai">
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
            <Card style={{ maxWidth: '600px', margin: '0 auto', padding: 0, overflow: 'hidden' }}>
              <div style={{ padding: 'var(--sp-4) var(--sp-5)', background: 'var(--navy)', color: '#fff', display: 'flex', alignItems: 'center', gap: 'var(--sp-3)' }}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2a10 10 0 1010 10A10 10 0 0012 2z"/><path d="M12 6v6l4 2"/></svg>
                <span style={{ fontWeight: 600, fontSize: 'var(--text-sm)' }}>AI Healthcare Assistant</span>
              </div>
              <div style={{ padding: 'var(--sp-5)', display: 'flex', flexDirection: 'column', gap: 'var(--sp-4)' }}>
                <div style={{ alignSelf: 'flex-end', background: 'var(--primary)', color: '#fff', padding: 'var(--sp-3) var(--sp-4)', borderRadius: 'var(--radius-lg) var(--radius-lg) 4px var(--radius-lg)', maxWidth: '80%', fontSize: 'var(--text-sm)' }}>
                  What is Amoxicillin used for?
                </div>
                <div style={{ alignSelf: 'flex-start', background: 'var(--bg-page)', padding: 'var(--sp-3) var(--sp-4)', borderRadius: 'var(--radius-lg) var(--radius-lg) var(--radius-lg) 4px', maxWidth: '85%', fontSize: 'var(--text-sm)', color: 'var(--text-secondary)' }}>
                  Amoxicillin is an antibiotic used to treat bacterial infections. It belongs to the penicillin group of antibiotics. Always follow your doctor&apos;s prescription for dosage and duration.
                </div>
                <p style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)', textAlign: 'center', marginTop: 'var(--sp-2)' }}>
                  AI-generated information is for assistance and does not replace professional medical advice.
                </p>
              </div>
            </Card>
          </RevealDiv>
        </div>
      </FullSection>

      {/* ═══ HOW IT WORKS ═══ */}
      <FullSection id="how-it-works">
        <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
          <RevealDiv>
            <div style={{ textAlign: 'center', marginBottom: 'var(--sp-12)' }}>
              <Overline>How It Works</Overline>
              <SectionHeading>From prescription to delivery, in six steps.</SectionHeading>
            </div>
          </RevealDiv>

          <div className="how-it-works-grid">
            {[
              { num: '01', title: 'Upload Prescription', desc: 'Photograph or scan your prescription' },
              { num: '02', title: 'AI Extraction', desc: 'OCR extracts medicine data automatically' },
              { num: '03', title: 'Doctor Verification', desc: 'Licensed doctor reviews and approves' },
              { num: '04', title: 'Discover Medicines', desc: 'Search, compare and select medicines' },
              { num: '05', title: 'Order & Pay', desc: 'Secure checkout with multiple options' },
              { num: '06', title: 'Track Fulfillment', desc: 'Real-time order tracking to delivery' },
            ].map((step, i) => (
              <RevealDiv key={i} delay={(i + 1) as any}>
                <div style={{
                  textAlign: 'center',
                  padding: 'var(--sp-5) var(--sp-3)',
                  background: 'var(--bg-surface)',
                  borderRadius: 'var(--radius-lg)',
                  border: '1px solid var(--border-light)',
                  boxShadow: 'var(--shadow-sm)',
                  height: '100%',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                }}>
                  <div style={{
                    width: '48px',
                    height: '48px',
                    borderRadius: '50%',
                    background: 'var(--primary)',
                    color: '#fff',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    marginBottom: 'var(--sp-3)',
                    fontSize: 'var(--text-sm)',
                    fontWeight: 700,
                    boxShadow: '0 4px 10px rgba(8,127,123,0.25)'
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
      </FullSection>

      {/* ═══ ROLE-BASED PLATFORM ═══ */}
      <FullSection className="section-soft">
        <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
          <RevealDiv>
            <div style={{ textAlign: 'center', marginBottom: 'var(--sp-12)' }}>
              <Overline>Built for Everyone</Overline>
              <SectionHeading>One platform. Built for every healthcare participant.</SectionHeading>
            </div>
          </RevealDiv>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 'var(--sp-5)' }}>
            {[
              { role: 'Patients', items: ['Upload prescriptions', 'Find medicines', 'Manage orders', 'Access AI assistance'], color: '#087F7B' },
              { role: 'Doctors', items: ['Review prescriptions', 'Verify AI extraction', 'Correct medical information', 'Maintain audit trail'], color: '#2563A6' },
              { role: 'Pharmacies', items: ['Manage medicine availability', 'Process orders', 'Manage fulfillment', 'Track operations'], color: '#22A06B' },
              { role: 'Operations', items: ['Monitor platform activity', 'Manage partners', 'Resolve disputes', 'Monitor SLA workflows'], color: '#D98A00' },
              { role: 'Admin', items: ['Manage users', 'Manage KYC', 'Manage permissions', 'Monitor configuration'], color: '#D64545' },
            ].map((r, i) => (
              <RevealDiv key={i} delay={(i + 1) as any}>
                <Card hover style={{ height: '100%' }}>
                  <p style={{ fontSize: 'var(--text-xs)', fontWeight: 700, color: r.color, letterSpacing: '0.1em', marginBottom: 'var(--sp-3)' }}>{r.role.toUpperCase()}</p>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--sp-2)' }}>
                    {r.items.map((item) => (
                      <div key={item} style={{ display: 'flex', alignItems: 'center', gap: 'var(--sp-2)', fontSize: 'var(--text-sm)', color: 'var(--text-secondary)' }}>
                        <CheckIcon /> {item}
                      </div>
                    ))}
                  </div>
                </Card>
              </RevealDiv>
            ))}
          </div>
        </div>
      </FullSection>

      {/* ═══ SECURITY / TRUST ═══ */}
      <FullSection>
        <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
          <RevealDiv>
            <div style={{ textAlign: 'center', marginBottom: 'var(--sp-10)' }}>
              <Overline>Trust & Security</Overline>
              <SectionHeading>Healthcare information, when you need it.</SectionHeading>
            </div>
          </RevealDiv>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 'var(--sp-5)', maxWidth: '900px', margin: '0 auto' }}>
            {[
              { title: 'Role-Based Access', desc: 'Every user sees only what their role permits.' },
              { title: 'Secure Authentication', desc: 'JWT-based access with token refresh and session management.' },
              { title: 'Audit Logging', desc: 'Every privileged action is recorded for compliance.' },
              { title: 'Data Protection', desc: 'Encrypted data in transit and at rest.' },
            ].map((item, i) => (
              <RevealDiv key={i} delay={(i + 1) as any}>
                <Card hover style={{ textAlign: 'center' }}>
                  <div style={{ width: '40px', height: '40px', borderRadius: '50%', background: 'var(--primary-light)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto var(--sp-3)' }}>
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--primary)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
                  </div>
                  <h4 style={{ fontSize: 'var(--text-sm)', fontWeight: 600, color: 'var(--navy)', marginBottom: '4px' }}>{item.title}</h4>
                  <p style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)', lineHeight: 1.5 }}>{item.desc}</p>
                </Card>
              </RevealDiv>
            ))}
          </div>
        </div>
      </FullSection>

      {/* ═══ FAQ ═══ */}
      <FullSection className="section-soft" id="faq">
        <div style={{ maxWidth: '720px', margin: '0 auto', textAlign: 'center' }}>
          <RevealDiv>
            <Overline>FAQ</Overline>
            <SectionHeading>Frequently asked questions.</SectionHeading>
          </RevealDiv>

          <RevealDiv delay={1}>
            <div style={{ marginTop: 'var(--sp-8)', textAlign: 'left' }}>
              {[
                { q: 'What is I.P. & M.D?', a: 'I.P. & M.D stands for Intelligent Prescription & Medicine Discovery. It is a healthcare platform that connects patients, doctors and pharmacies through intelligent prescription processing, medicine discovery and connected healthcare workflows.' },
                { q: 'How does prescription upload work?', a: 'Patients photograph or scan their prescription and upload it to the platform. Our AI-powered OCR technology extracts medicine names, dosages, frequencies and other relevant information from the document.' },
                { q: 'Does AI replace a doctor?', a: 'No. AI assists with data extraction and structuring, but licensed doctors review and verify every prescription before it can be used for medicine ordering. Doctor verification is a mandatory clinical step.' },
                { q: 'How does medicine discovery work?', a: 'After prescription verification, patients can search the medicine catalog, compare options, check availability and pricing, and add verified medicines to their cart.' },
                { q: 'How do pharmacies participate?', a: 'Pharmacies receive orders with full prescription context, manage inventory, process verified prescriptions and update fulfillment status in real-time.' },
                { q: 'How is healthcare data handled?', a: 'The platform implements role-based access control, secure authentication, audit logging and data encryption to protect healthcare information.' },
                { q: 'What can the AI assistant help with?', a: 'The AI assistant provides information about prescriptions, medicines and healthcare topics. It is designed for informational support and does not replace professional medical advice.' },
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
      </FullSection>

      {/* ═══ FINAL CTA ═══ */}
      <FullSection className="section-navy" style={{ position: 'relative', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(ellipse at 30% 50%, rgba(8,127,123,0.15) 0%, transparent 60%)', pointerEvents: 'none' }} />
        <div style={{ maxWidth: '1200px', margin: '0 auto', textAlign: 'center', position: 'relative', zIndex: 1 }}>
          <RevealDiv>
            <h2 style={{ fontSize: 'clamp(28px, 4vw, 40px)', fontWeight: 800, color: '#fff', letterSpacing: '-0.03em', lineHeight: 1.2, marginBottom: 'var(--sp-4)' }}>
              One connected experience, built around the prescription.
            </h2>
            <SectionSub style={{ margin: '0 auto var(--sp-8)', color: 'rgba(255,255,255,0.6)' }}>
              From intelligent prescription processing to verified medicine fulfillment, I.P. & M.D brings healthcare workflows together.
            </SectionSub>
          </RevealDiv>

          <RevealDiv delay={2}>
            <div style={{ display: 'flex', gap: 'var(--sp-3)', justifyContent: 'center', flexWrap: 'wrap' }}>
              <Link href="/register" style={{ textDecoration: 'none' }}>
                <button className="btn btn-primary" style={{ padding: '14px 32px', fontSize: 'var(--text-md)', fontWeight: 600, background: '#087F7B' }}>Get Started</button>
              </Link>
              <a href="#platform" style={{ textDecoration: 'none' }}>
                <button className="btn" style={{ padding: '14px 32px', fontSize: 'var(--text-md)', background: 'rgba(255,255,255,0.1)', color: '#fff', border: '1px solid rgba(255,255,255,0.2)' }}>Explore Platform</button>
              </a>
            </div>
          </RevealDiv>
        </div>
      </FullSection>

      {/* ═══ FOOTER ═══ */}
      <footer style={{ background: 'var(--navy)', color: 'rgba(255,255,255,0.6)', padding: 'var(--sp-16) var(--sp-6) var(--sp-8)' }}>
        <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 'var(--sp-10)', marginBottom: 'var(--sp-12)' }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--sp-2)', marginBottom: 'var(--sp-4)' }}>
                <div style={{ width: '28px', height: '28px', borderRadius: 'var(--radius-sm)', background: 'var(--primary)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M8.5 14.5A2.5 2.5 0 0011 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 11-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 002.5 2.5z" /></svg>
                </div>
                <span style={{ fontWeight: 700, fontSize: 'var(--text-md)', color: '#fff' }}>I.P. & M.D</span>
              </div>
              <p style={{ fontSize: 'var(--text-sm)', lineHeight: 1.6 }}>Intelligent Prescription & Medicine Discovery Platform</p>
            </div>

            {[
              { title: 'Platform', links: [
                { label: 'Prescription Intelligence', href: '#platform' },
                { label: 'Doctor Verification', href: '#doctors' },
                { label: 'Medicine Discovery', href: '#platform' },
                { label: 'Pharmacy Network', href: '#pharmacies' },
              ]},
              { title: 'For Patients', links: [
                { label: 'Upload Prescription', href: '/register' },
                { label: 'Medicines', href: '#platform' },
                { label: 'Orders', href: '/register' },
                { label: 'AI Assistant', href: '#ai' },
              ]},
              { title: 'For Doctors', links: [
                { label: 'Verification Queue', href: '#doctors' },
                { label: 'Reports', href: '#doctors' },
                { label: 'Audit Trail', href: '#doctors' },
              ]},
              { title: 'For Pharmacies', links: [
                { label: 'Partner Network', href: '#pharmacies' },
                { label: 'Orders', href: '#pharmacies' },
                { label: 'Fulfillment', href: '#pharmacies' },
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

          <div style={{ borderTop: '1px solid rgba(255,255,255,0.08)', paddingTop: 'var(--sp-6)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 'var(--sp-4)' }}>
            <p style={{ fontSize: 'var(--text-xs)' }}>I.P. & M.D Platform. Healthcare technology for prescription intelligence and medicine discovery.</p>
            <p style={{ fontSize: 'var(--text-xs)' }}>AI-generated information does not replace professional medical advice.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
