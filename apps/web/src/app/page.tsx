'use client';

import React, { useState } from 'react';
import Link from 'next/link';

/* ─── Reusable tiny helpers ─── */
function Section({ id, children, style }: { id?: string; children: React.ReactNode; style?: React.CSSProperties }) {
  return <section id={id} style={{ padding: 'var(--sp-20) var(--sp-6)', maxWidth: '1200px', margin: '0 auto', ...style }}>{children}</section>;
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
        transform: hov ? 'translateY(-2px)' : 'none',
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

/* ═══════════════════════════════════════════════
   LANDING PAGE
   ═══════════════════════════════════════════════ */
export default function LandingPage() {
  const [faqOpen, setFaqOpen] = useState<number | null>(null);

  return (
    <div style={{ overflow: 'hidden' }}>
      {/* ═══ HERO ═══ */}
      <section style={{ position: 'relative', padding: '140px var(--sp-6) 80px', background: 'linear-gradient(165deg, #F0FAFA 0%, #EDF5FB 40%, #F4F8FA 100%)', overflow: 'hidden' }}>
        {/* Decorative */}
        <div style={{ position: 'absolute', top: '10%', right: '8%', width: '300px', height: '300px', borderRadius: '50%', background: 'radial-gradient(circle, rgba(8,127,123,0.06) 0%, transparent 70%)', pointerEvents: 'none' }} />
        <div style={{ position: 'absolute', bottom: '5%', left: '5%', width: '200px', height: '200px', borderRadius: '50%', background: 'radial-gradient(circle, rgba(37,99,166,0.05) 0%, transparent 70%)', pointerEvents: 'none' }} />

        <div style={{ maxWidth: '1200px', margin: '0 auto', position: 'relative', zIndex: 1 }}>
          <div style={{ maxWidth: '720px' }}>
            <p className="animate-fade-in-up" style={{ display: 'inline-block', padding: '6px 16px', borderRadius: 'var(--radius-pill)', background: 'var(--primary-light)', color: 'var(--primary)', fontWeight: 600, fontSize: 'var(--text-xs)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 'var(--sp-6)' }}>
              Intelligent Healthcare Platform
            </p>

            <h1 className="animate-fade-in-up delay-1" style={{ fontSize: 'clamp(36px, 6vw, 64px)', fontWeight: 800, color: 'var(--navy)', letterSpacing: '-0.04em', lineHeight: 1.1, marginBottom: 'var(--sp-6)' }}>
              From Prescription to Medicine,<br />
              <span style={{ color: 'var(--primary)' }}>Made Smarter.</span>
            </h1>

            <p className="animate-fade-in-up delay-2" style={{ fontSize: 'clamp(16px, 2vw, 20px)', color: 'var(--text-secondary)', lineHeight: 1.7, marginBottom: 'var(--sp-8)', maxWidth: '560px' }}>
              I.P. & M.D connects patients, doctors and pharmacies through intelligent prescription processing, medicine discovery and secure healthcare workflows.
            </p>

            <div className="animate-fade-in-up delay-3" style={{ display: 'flex', gap: 'var(--sp-3)', flexWrap: 'wrap', marginBottom: 'var(--sp-8)' }}>
              <Link href="/register" style={{ textDecoration: 'none' }}>
                <button className="btn btn-primary" style={{ padding: '12px 28px', fontSize: 'var(--text-md)', fontWeight: 600 }}>Get Started</button>
              </Link>
              <a href="#platform" style={{ textDecoration: 'none' }}>
                <button className="btn btn-secondary" style={{ padding: '12px 28px', fontSize: 'var(--text-md)' }}>Explore the Platform</button>
              </a>
            </div>

            <div className="animate-fade-in-up delay-4" style={{ display: 'flex', gap: 'var(--sp-6)', flexWrap: 'wrap', color: 'var(--text-muted)', fontSize: 'var(--text-sm)' }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--success)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>
                AI-Powered Extractions
              </span>
              <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--success)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>
                Doctor Verified
              </span>
              <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--success)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>
                Secure Health Data
              </span>
            </div>
          </div>

          {/* Hero Visual — Prescription Pipeline */}
          <div className="hide-mobile animate-fade-in-up delay-5" style={{ position: 'absolute', top: '50%', right: '0', transform: 'translateY(-50%)', width: '380px', display: 'none' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--sp-3)' }}>
              {[
                { icon: '📄', label: 'Prescription', sub: 'Upload document', color: 'var(--primary-light)', border: 'var(--primary)' },
                { icon: '🤖', label: 'AI Extraction', sub: 'OCR + NLP processing', color: 'var(--blue-light)', border: 'var(--blue)' },
                { icon: '👨‍⚕️', label: 'Doctor Verified', sub: 'Clinical review', color: 'var(--green-light)', border: 'var(--green)' },
                { icon: '💊', label: 'Medicine Matched', sub: 'Discovery + pricing', color: 'var(--warning-bg)', border: 'var(--warning)' },
                { icon: '📦', label: 'Order Ready', sub: 'Pharmacy fulfillment', color: 'var(--success-bg)', border: 'var(--success)' },
              ].map((step, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 'var(--sp-3)', padding: 'var(--sp-3) var(--sp-4)', background: step.color, border: `1px solid ${step.border}20`, borderRadius: 'var(--radius-md)', animationDelay: `${i * 100}ms` }}>
                  <span style={{ fontSize: '20px' }}>{step.icon}</span>
                  <div>
                    <div style={{ fontWeight: 600, fontSize: 'var(--text-sm)', color: 'var(--text-primary)' }}>{step.label}</div>
                    <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>{step.sub}</div>
                  </div>
                  {i < 4 && (
                    <div style={{ position: 'absolute', left: '24px', marginTop: '60px', color: 'var(--border)', fontSize: '14px' }}>↓</div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ═══ TRUST STRIP ═══ */}
      <section style={{ padding: 'var(--sp-6) var(--sp-6)', background: 'var(--bg-surface)', borderBottom: '1px solid var(--border-light)' }}>
        <div style={{ maxWidth: '1200px', margin: '0 auto', display: 'flex', justifyContent: 'center', gap: 'var(--sp-10)', flexWrap: 'wrap' }}>
          {['Prescription Intelligence', 'Doctor Verification', 'Medicine Discovery', 'Secure Workflow', 'Pharmacy Network'].map((item) => (
            <span key={item} style={{ fontSize: 'var(--text-sm)', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{item}</span>
          ))}
        </div>
      </section>

      {/* ═══ PROBLEM SECTION ═══ */}
      <Section id="problem" style={{ textAlign: 'center' }}>
        <Overline>The Problem</Overline>
        <SectionHeading>Healthcare shouldn&rsquo;t feel disconnected.</SectionHeading>
        <SectionSub style={{ margin: '0 auto var(--sp-12)' }}>
          Patients juggle multiple apps, pharmacies lack context, and doctors review prescriptions without structured data. The journey from prescription to medicine is fragmented.
        </SectionSub>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 'var(--sp-8)', maxWidth: '900px', margin: '0 auto' }}>
          <Card style={{ borderLeft: '3px solid var(--danger)', textAlign: 'left' }}>
            <p className="text-overline" style={{ color: 'var(--danger)', marginBottom: 'var(--sp-3)' }}>Before</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--sp-2)', fontSize: 'var(--text-sm)', color: 'var(--text-secondary)' }}>
              <span>Patient → prescription paper</span>
              <span>Manual medicine search</span>
              <span>Fragmented pharmacy calls</span>
              <span>No tracking or visibility</span>
            </div>
          </Card>
          <Card style={{ borderLeft: '3px solid var(--success)', textAlign: 'left' }}>
            <p className="text-overline" style={{ color: 'var(--success)', marginBottom: 'var(--sp-3)' }}>After — I.P. & M.D</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--sp-2)', fontSize: 'var(--text-sm)', color: 'var(--text-secondary)' }}>
              <span>Upload → AI extracts data</span>
              <span>Doctor verifies clinically</span>
              <span>Medicine discovery + ordering</span>
              <span>Full order tracking</span>
            </div>
          </Card>
        </div>
      </Section>

      {/* ═══ PLATFORM OVERVIEW ═══ */}
      <Section id="platform" style={{ background: 'var(--bg-surface)', maxWidth: '100%', padding: 'var(--sp-20) var(--sp-6)' }}>
        <div style={{ maxWidth: '1200px', margin: '0 auto', textAlign: 'center' }}>
          <Overline>Platform</Overline>
          <SectionHeading>One platform. Every step connected.</SectionHeading>
          <SectionSub style={{ margin: '0 auto var(--sp-12)' }}>
            From the moment a prescription is uploaded to the final medicine delivery, every step is intelligent, connected and transparent.
          </SectionSub>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 'var(--sp-5)' }}>
            {[
              { icon: <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--primary)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>, title: 'Prescription Intelligence', desc: 'AI-powered OCR extracts medicine data from uploaded prescriptions with high accuracy.' },
              { icon: <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--blue)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 11.08V12a10 10 0 11-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>, title: 'Doctor Verification', desc: 'Licensed doctors review and verify extracted prescription data before fulfillment.' },
              { icon: <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--green)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>, title: 'Medicine Discovery', desc: 'Search, compare and discover medicines with availability and pricing information.' },
              { icon: <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--warning)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="1" y="3" width="15" height="13"/><polygon points="16 8 20 8 23 11 23 16 16 16 16 8"/><circle cx="5.5" cy="18.5" r="2.5"/><circle cx="18.5" cy="18.5" r="2.5"/></svg>, title: 'Pharmacy & Ordering', desc: 'Connected pharmacy network for seamless prescription fulfillment and delivery.' },
              { icon: <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--navy)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2a10 10 0 1010 10A10 10 0 0012 2z"/><path d="M12 6v6l4 2"/></svg>, title: 'Order Tracking', desc: 'Real-time visibility from order placement through pharmacy processing to delivery.' },
            ].map((item, i) => (
              <Card key={i} hover style={{ textAlign: 'left' }}>
                <IconBox color="var(--primary-lighter)">{item.icon}</IconBox>
                <h3 style={{ fontSize: 'var(--text-lg)', fontWeight: 700, color: 'var(--navy)', marginBottom: 'var(--sp-2)' }}>{item.title}</h3>
                <p style={{ fontSize: 'var(--text-sm)', color: 'var(--text-secondary)', lineHeight: 1.6 }}>{item.desc}</p>
              </Card>
            ))}
          </div>
        </div>
      </Section>

      {/* ═══ PRESCRIPTION INTELLIGENCE ═══ */}
      <Section>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 'var(--sp-12)', alignItems: 'center' }}>
          <div>
            <Overline>Prescription Intelligence</Overline>
            <SectionHeading>Turn prescriptions into structured intelligence.</SectionHeading>
            <SectionSub>
              Patients upload a prescription photograph. Our AI-powered OCR extracts medicine names, dosages, frequencies and durations — structuring unstructured medical data into actionable information.
            </SectionSub>
            <div style={{ marginTop: 'var(--sp-6)', padding: 'var(--sp-4)', background: 'var(--warning-bg)', borderRadius: 'var(--radius-md)', border: '1px solid var(--warning-border)' }}>
              <p style={{ fontSize: 'var(--text-sm)', color: 'var(--warning)', fontWeight: 600 }}>AI-assisted extraction. Doctor verification remains part of the workflow.</p>
            </div>
          </div>

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
        </div>
      </Section>

      {/* ═══ DOCTOR SECTION ═══ */}
      <Section id="doctors" style={{ background: 'var(--bg-surface)', maxWidth: '100%', padding: 'var(--sp-20) var(--sp-6)' }}>
        <div style={{ maxWidth: '1200px', margin: '0 auto', textAlign: 'center' }}>
          <Overline>For Doctors</Overline>
          <SectionHeading>Give doctors the information they need to review with confidence.</SectionHeading>
          <SectionSub style={{ margin: '0 auto var(--sp-10)' }}>
            AI assists the workflow. Doctors remain in control of verification. Every prescription goes through clinical review before medicines can be ordered.
          </SectionSub>

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
        </div>
      </Section>

      {/* ═══ PATIENT SECTION ═══ */}
      <Section id="patients">
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 'var(--sp-12)', alignItems: 'center' }}>
          <div>
            <Overline>For Patients</Overline>
            <SectionHeading>A simpler experience for patients.</SectionHeading>
            <SectionSub>
              Upload your prescription, track processing in real-time, discover verified medicines, and manage your healthcare journey — all in one place.
            </SectionSub>
            <div style={{ marginTop: 'var(--sp-6)', display: 'flex', flexDirection: 'column', gap: 'var(--sp-3)' }}>
              {['Upload prescription', 'Track processing', 'Discover medicines', 'Order & pay', 'Track delivery'].map((step, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 'var(--sp-3)' }}>
                  <div style={{ width: '28px', height: '28px', borderRadius: '50%', background: 'var(--primary)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 'var(--text-xs)', fontWeight: 700, flexShrink: 0 }}>{i + 1}</div>
                  <span style={{ fontSize: 'var(--text-md)', color: 'var(--text-primary)' }}>{step}</span>
                </div>
              ))}
            </div>
          </div>

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
        </div>
      </Section>

      {/* ═══ MEDICINE DISCOVERY ═══ */}
      <Section style={{ background: 'var(--bg-surface)', maxWidth: '100%', padding: 'var(--sp-20) var(--sp-6)' }}>
        <div style={{ maxWidth: '1200px', margin: '0 auto', textAlign: 'center' }}>
          <Overline>Medicine Discovery</Overline>
          <SectionHeading>Find the medicines you need, with clarity.</SectionHeading>
          <SectionSub style={{ margin: '0 auto var(--sp-10)' }}>
            Search across a comprehensive medicine catalog with real-time availability, pricing and prescription requirements.
          </SectionSub>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 'var(--sp-4)', maxWidth: '900px', margin: '0 auto' }}>
            {[
              { name: 'Amoxicillin 500mg', generic: 'Amoxicillin', type: 'Prescription', price: '₹45', available: true },
              { name: 'Paracetamol 650mg', generic: 'Paracetamol', type: 'OTC', price: '₹12', available: true },
              { name: 'Cetirizine 10mg', generic: 'Cetirizine', type: 'OTC', price: '₹8', available: true },
              { name: 'Metformin 500mg', generic: 'Metformin', type: 'Prescription', price: '₹28', available: false },
            ].map((med, i) => (
              <Card key={i} hover style={{ textAlign: 'left' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 'var(--sp-2)' }}>
                  <span className={`badge ${med.type === 'OTC' ? 'badge-success' : 'badge-warning'}`} style={{ fontSize: '10px' }}>{med.type}</span>
                  <span style={{ fontWeight: 700, color: 'var(--navy)', fontSize: 'var(--text-lg)' }}>{med.price}</span>
                </div>
                <h4 style={{ fontSize: 'var(--text-md)', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '2px' }}>{med.name}</h4>
                <p style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)', marginBottom: 'var(--sp-3)' }}>{med.generic}</p>
                <span style={{ fontSize: 'var(--text-xs)', fontWeight: 600, color: med.available ? 'var(--success)' : 'var(--danger)' }}>
                  {med.available ? '● In Stock' : '○ Out of Stock'}
                </span>
              </Card>
            ))}
          </div>
        </div>
      </Section>

      {/* ═══ PHARMACY SECTION ═══ */}
      <Section id="pharmacies">
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 'var(--sp-12)', alignItems: 'center' }}>
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

          <div>
            <Overline>For Pharmacies</Overline>
            <SectionHeading>Connect pharmacies to a smarter fulfillment workflow.</SectionHeading>
            <SectionSub>
              Receive orders with full prescription context, manage inventory, process verified prescriptions and update status in real-time.
            </SectionSub>
            <Link href="/register" style={{ textDecoration: 'none', display: 'inline-block', marginTop: 'var(--sp-6)' }}>
              <button className="btn btn-primary">Partner With Us</button>
            </Link>
          </div>
        </div>
      </Section>

      {/* ═══ AI ASSISTANT ═══ */}
      <Section id="ai" style={{ background: 'var(--bg-surface)', maxWidth: '100%', padding: 'var(--sp-20) var(--sp-6)' }}>
        <div style={{ maxWidth: '1200px', margin: '0 auto', textAlign: 'center' }}>
          <Overline>AI Intelligence</Overline>
          <SectionHeading>Healthcare information, when you need it.</SectionHeading>
          <SectionSub style={{ margin: '0 auto var(--sp-10)' }}>
            AI-powered assistance helps patients understand their prescriptions, medicines and healthcare journey — always with appropriate disclaimers.
          </SectionSub>

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
        </div>
      </Section>

      {/* ═══ HOW IT WORKS ═══ */}
      <Section id="how-it-works">
        <div style={{ textAlign: 'center', marginBottom: 'var(--sp-12)' }}>
          <Overline>How It Works</Overline>
          <SectionHeading>From prescription to delivery, in six steps.</SectionHeading>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 'var(--sp-6)', maxWidth: '1000px', margin: '0 auto' }}>
          {[
            { num: '01', title: 'Upload Prescription', desc: 'Photograph or scan your prescription' },
            { num: '02', title: 'AI Extraction', desc: 'OCR extracts medicine data automatically' },
            { num: '03', title: 'Doctor Verification', desc: 'Licensed doctor reviews and approves' },
            { num: '04', title: 'Discover Medicines', desc: 'Search, compare and select medicines' },
            { num: '05', title: 'Order & Pay', desc: 'Secure checkout with multiple options' },
            { num: '06', title: 'Track Fulfillment', desc: 'Real-time order tracking to delivery' },
          ].map((step, i) => (
            <div key={i} style={{ textAlign: 'center', position: 'relative' }}>
              <div style={{ width: '48px', height: '48px', borderRadius: '50%', background: 'var(--primary)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto var(--sp-3)', fontSize: 'var(--text-sm)', fontWeight: 700 }}>
                {step.num}
              </div>
              <h4 style={{ fontSize: 'var(--text-sm)', fontWeight: 600, color: 'var(--navy)', marginBottom: '4px' }}>{step.title}</h4>
              <p style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)', lineHeight: 1.5 }}>{step.desc}</p>
            </div>
          ))}
        </div>
      </Section>

      {/* ═══ WHY I.P. & M.D ═══ */}
      <Section style={{ background: 'var(--navy)', maxWidth: '100%', padding: 'var(--sp-20) var(--sp-6)', color: '#fff' }}>
        <div style={{ maxWidth: '1200px', margin: '0 auto', textAlign: 'center' }}>
          <p className="text-overline" style={{ color: 'rgba(255,255,255,0.5)', marginBottom: 'var(--sp-3)' }}>Why I.P. & M.D</p>
          <h2 style={{ fontSize: 'clamp(28px, 4vw, 40px)', fontWeight: 800, color: '#fff', letterSpacing: '-0.03em', lineHeight: 1.2, marginBottom: 'var(--sp-10)' }}>
            One connected experience, built around the prescription.
          </h2>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 'var(--sp-6)' }}>
            {[
              { num: '01', title: 'Prescription-first workflow', desc: 'Built around the clinical document that starts every healthcare journey.' },
              { num: '02', title: 'AI-assisted intelligence', desc: 'OCR and NLP extract structured data from unstructured prescriptions.' },
              { num: '03', title: 'Doctor-centered verification', desc: 'Licensed doctors review AI extractions before clinical use.' },
              { num: '04', title: 'Connected discovery & ordering', desc: 'From verified prescription to medicine delivery in one platform.' },
            ].map((item, i) => (
              <div key={i} style={{ textAlign: 'left', padding: 'var(--sp-5)', borderRadius: 'var(--radius-lg)', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.08)' }}>
                <span style={{ fontSize: 'var(--text-3xl)', fontWeight: 800, color: 'var(--primary)', opacity: 0.6 }}>{item.num}</span>
                <h3 style={{ fontSize: 'var(--text-lg)', fontWeight: 700, color: '#fff', margin: 'var(--sp-3) 0 var(--sp-2)' }}>{item.title}</h3>
                <p style={{ fontSize: 'var(--text-sm)', color: 'rgba(255,255,255,0.6)', lineHeight: 1.6 }}>{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </Section>

      {/* ═══ SECURITY / TRUST ═══ */}
      <Section>
        <div style={{ textAlign: 'center', marginBottom: 'var(--sp-10)' }}>
          <Overline>Trust & Security</Overline>
          <SectionHeading>Designed with healthcare workflows in mind.</SectionHeading>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 'var(--sp-5)', maxWidth: '900px', margin: '0 auto' }}>
          {[
            { title: 'Role-Based Access', desc: 'Every user sees only what their role permits.' },
            { title: 'Secure Authentication', desc: 'JWT-based access with token refresh and session management.' },
            { title: 'Audit Logging', desc: 'Every privileged action is recorded for compliance.' },
            { title: 'Data Protection', desc: 'Encrypted data in transit and at rest.' },
          ].map((item, i) => (
            <Card key={i} hover style={{ textAlign: 'center' }}>
              <div style={{ width: '40px', height: '40px', borderRadius: '50%', background: 'var(--primary-light)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto var(--sp-3)' }}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--primary)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
              </div>
              <h4 style={{ fontSize: 'var(--text-sm)', fontWeight: 600, color: 'var(--navy)', marginBottom: '4px' }}>{item.title}</h4>
              <p style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)', lineHeight: 1.5 }}>{item.desc}</p>
            </Card>
          ))}
        </div>
      </Section>

      {/* ═══ FAQ ═══ */}
      <Section id="faq" style={{ background: 'var(--bg-surface)', maxWidth: '100%', padding: 'var(--sp-20) var(--sp-6)' }}>
        <div style={{ maxWidth: '720px', margin: '0 auto', textAlign: 'center' }}>
          <Overline>FAQ</Overline>
          <SectionHeading>Frequently asked questions.</SectionHeading>

          <div style={{ marginTop: 'var(--sp-8)', textAlign: 'left' }}>
            {[
              { q: 'What is I.P. & M.D?', a: 'I.P. & M.D stands for Intelligent Prescription & Medicine Discovery. It is a healthcare platform that connects patients, doctors and pharmacies through intelligent prescription processing, medicine discovery and connected healthcare workflows.' },
              { q: 'How does prescription upload work?', a: 'Patients photograph or scan their prescription and upload it to the platform. Our AI-powered OCR technology extracts medicine names, dosages, frequencies and other relevant information from the document.' },
              { q: 'Does AI replace a doctor?', a: 'No. AI assists with data extraction and structuring, but licensed doctors review and verify every prescription before it can be used for medicine ordering. Doctor verification is a mandatory clinical step.' },
              { q: 'Can I discover medicines through the platform?', a: 'Yes. After prescription verification, patients can search the medicine catalog, compare options, check availability and pricing, and add verified medicines to their cart.' },
              { q: 'Is my information secure?', a: 'The platform implements role-based access control, secure authentication, audit logging and data encryption to protect healthcare information.' },
            ].map((item, i) => (
              <div key={i} style={{ borderBottom: '1px solid var(--border-light)' }}>
                <button
                  onClick={() => setFaqOpen(faqOpen === i ? null : i)}
                  style={{ width: '100%', display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: 'var(--sp-4) 0', background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left' }}
                >
                  <span style={{ fontWeight: 600, fontSize: 'var(--text-md)', color: 'var(--text-primary)' }}>{item.q}</span>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--text-muted)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ transform: faqOpen === i ? 'rotate(180deg)' : 'rotate(0)', transition: 'transform 200ms', flexShrink: 0, marginLeft: 'var(--sp-3)' }}>
                    <polyline points="6 9 12 15 18 9" />
                  </svg>
                </button>
                {faqOpen === i && (
                  <p style={{ fontSize: 'var(--text-sm)', color: 'var(--text-secondary)', lineHeight: 1.7, paddingBottom: 'var(--sp-4)' }}>{item.a}</p>
                )}
              </div>
            ))}
          </div>
        </div>
      </Section>

      {/* ═══ FINAL CTA ═══ */}
      <Section style={{ textAlign: 'center' }}>
        <SectionHeading>Healthcare, connected from prescription to delivery.</SectionHeading>
        <SectionSub style={{ margin: '0 auto var(--sp-8)' }}>
          Experience a smarter way to manage prescriptions, discover medicines and move through the healthcare journey.
        </SectionSub>
        <div style={{ display: 'flex', gap: 'var(--sp-3)', justifyContent: 'center', flexWrap: 'wrap' }}>
          <Link href="/register" style={{ textDecoration: 'none' }}>
            <button className="btn btn-primary" style={{ padding: '14px 32px', fontSize: 'var(--text-md)', fontWeight: 600 }}>Get Started</button>
          </Link>
          <a href="#platform" style={{ textDecoration: 'none' }}>
            <button className="btn btn-secondary" style={{ padding: '14px 32px', fontSize: 'var(--text-md)' }}>Explore the Platform</button>
          </a>
        </div>
      </Section>

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
              { title: 'Platform', links: [{ label: 'Patients', href: '#patients' }, { label: 'Doctors', href: '#doctors' }, { label: 'Pharmacies', href: '#pharmacies' }, { label: 'AI Assistant', href: '#ai' }] },
              { title: 'Resources', links: [{ label: 'How It Works', href: '#how-it-works' }, { label: 'FAQ', href: '#faq' }, { label: 'Platform', href: '#platform' }] },
              { title: 'Account', links: [{ label: 'Login', href: '/login' }, { label: 'Register', href: '/register' }] },
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
