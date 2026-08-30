'use client';

import React from 'react';
import Link from 'next/link';
import { useAuth } from '../../lib/auth-context';
import { IconShieldMedical, IconStethoscope, IconPill, IconClipboardMedical, IconChevronRight, IconHeartbeat, IconCheckCircle } from '../../components/Icons';

const portals = [
  {
    title: 'Doctor Portal',
    description: 'Verify prescriptions, manage patient records, and access clinical workflows.',
    icon: IconStethoscope,
    href: '/professional/doctor/register',
    loggedHref: '/doctor',
    color: '#1E6FB5',
    bgLight: '#E8F2FC',
    features: ['Prescription verification', 'Patient management', 'Clinical analytics'],
  },
  {
    title: 'Pharmacist Portal',
    description: 'Manage prescriptions, verify medicines, and handle pharmaceutical workflows.',
    icon: IconPill,
    href: '/professional/pharmacist/register',
    loggedHref: '/pharmacy/dashboard',
    color: '#189B6A',
    bgLight: '#E5F7EF',
    features: ['Prescription dispensing', 'Medicine verification', 'Inventory alerts'],
  },
  {
    title: 'Pharmacy Portal',
    description: 'Register your pharmacy, manage staff, and join the connected pharmacy network.',
    icon: IconClipboardMedical,
    href: '/professional/pharmacy/register',
    loggedHref: '/pharmacy/dashboard',
    color: '#0B6E6B',
    bgLight: '#E8F5F4',
    features: ['Organization onboarding', 'Staff management', 'Network integration'],
  },
];

export default function ProfessionalPortalPage() {
  const { user, isLoading } = useAuth();

  return (
    <div style={{ minHeight: 'calc(100vh - 60px)', background: 'var(--bg-page)' }}>
      {/* Hero Section */}
      <div style={{
        background: 'linear-gradient(135deg, #0B6E6B 0%, #095A58 40%, #0F2B3C 100%)',
        padding: 'var(--sp-16) var(--sp-6)',
        position: 'relative',
        overflow: 'hidden',
      }}>
        <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(circle at 30% 40%, rgba(20, 163, 199, 0.15) 0%, transparent 50%)' }} />
        <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(circle at 70% 60%, rgba(24, 155, 106, 0.1) 0%, transparent 50%)' }} />
        <div style={{ position: 'absolute', top: '10%', left: '10%', width: '120px', height: '120px', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '50%', animation: 'floatSlow 6s ease-in-out infinite' }} />
        <div style={{ position: 'absolute', bottom: '15%', right: '15%', width: '80px', height: '80px', border: '1px solid rgba(255,255,255,0.04)', borderRadius: '50%', animation: 'floatSlow 8s ease-in-out infinite 1s' }} />
        <div style={{ position: 'absolute', top: '60%', left: '20%', fontSize: '180px', fontWeight: 200, color: 'rgba(255,255,255,0.03)', lineHeight: 1 }}>+</div>

        <div style={{ position: 'relative', zIndex: 1, maxWidth: '800px', margin: '0 auto', textAlign: 'center' }}>
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
          <h1 style={{ fontSize: 'var(--text-4xl)', fontWeight: 800, color: '#fff', letterSpacing: '-0.03em', lineHeight: 1.2, marginBottom: 'var(--sp-4)' }}>
            Healthcare Professional Portal
          </h1>
          <p style={{ fontSize: 'var(--text-lg)', color: 'rgba(255,255,255,0.65)', lineHeight: 1.7, maxWidth: '600px', margin: '0 auto var(--sp-6)' }}>
            Access clinical workflows, manage prescriptions, and connect with the healthcare network
          </p>
          <div style={{
            display: 'inline-flex', alignItems: 'center', gap: 'var(--sp-2)',
            padding: 'var(--sp-2) var(--sp-4)',
            background: 'rgba(255,255,255,0.08)',
            borderRadius: 'var(--radius-pill)',
            border: '1px solid rgba(255,255,255,0.12)',
            color: 'rgba(255,255,255,0.8)',
            fontSize: 'var(--text-sm)',
          }}>
            <IconHeartbeat size={14} />
            {user ? `Welcome, ${user.full_name}` : 'Verified healthcare professionals only'}
          </div>
        </div>
      </div>

      {/* Portal Cards Section */}
      <div style={{ maxWidth: '1100px', margin: '0 auto', padding: 'var(--sp-12) var(--sp-6)' }}>
        <div style={{ textAlign: 'center', marginBottom: 'var(--sp-10)' }}>
          <h2 style={{ fontSize: 'var(--text-2xl)', fontWeight: 700, color: 'var(--text-heading)', marginBottom: 'var(--sp-2)' }}>
            Select Your Portal
          </h2>
          <p style={{ fontSize: 'var(--text-md)', color: 'var(--text-secondary)' }}>
            Professional accounts require credential verification before access to protected healthcare workflows
          </p>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 'var(--sp-6)' }}>
          {portals.map((portal, i) => {
            const Icon = portal.icon;
            const targetHref = user ? portal.loggedHref : portal.href;
            return (
              <Link key={portal.title} href={targetHref} style={{ textDecoration: 'none' }}>
                <div
                  style={{
                    background: 'var(--bg-surface)',
                    border: '1px solid var(--border)',
                    borderRadius: 'var(--radius-xl)',
                    padding: 'var(--sp-8) var(--sp-6)',
                    transition: 'all 300ms var(--ease)',
                    cursor: 'pointer',
                    height: '100%',
                    display: 'flex',
                    flexDirection: 'column',
                    position: 'relative',
                    overflow: 'hidden',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.borderColor = portal.color;
                    e.currentTarget.style.boxShadow = `0 12px 32px ${portal.color}15, 0 4px 8px ${portal.color}08`;
                    e.currentTarget.style.transform = 'translateY(-4px)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.borderColor = 'var(--border)';
                    e.currentTarget.style.boxShadow = 'var(--shadow-xs)';
                    e.currentTarget.style.transform = 'translateY(0)';
                  }}
                >
                  {/* Top accent */}
                  <div style={{
                    position: 'absolute', top: 0, left: 0, right: 0, height: '3px',
                    background: `linear-gradient(90deg, ${portal.color}, ${portal.color}99)`,
                  }} />

                  <div style={{
                    width: '56px', height: '56px', borderRadius: 'var(--radius-lg)',
                    background: portal.bgLight,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    marginBottom: 'var(--sp-5)',
                  }}>
                    <Icon size={28} style={{ color: portal.color }} />
                  </div>

                  <h3 style={{ fontSize: 'var(--text-xl)', fontWeight: 700, color: 'var(--text-heading)', marginBottom: 'var(--sp-2)' }}>
                    {portal.title}
                  </h3>
                  <p style={{ fontSize: 'var(--text-base)', color: 'var(--text-secondary)', lineHeight: 1.6, marginBottom: 'var(--sp-5)', flex: 1 }}>
                    {portal.description}
                  </p>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--sp-2)', marginBottom: 'var(--sp-5)' }}>
                    {portal.features.map((f) => (
                      <div key={f} style={{ display: 'flex', alignItems: 'center', gap: 'var(--sp-2)', fontSize: 'var(--text-sm)', color: 'var(--text-secondary)' }}>
                        <IconCheckCircle size={14} style={{ color: portal.color, flexShrink: 0 }} />
                        {f}
                      </div>
                    ))}
                  </div>

                  <div style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    padding: 'var(--sp-3) var(--sp-4)',
                    background: 'var(--bg-soft)',
                    borderRadius: 'var(--radius-md)',
                    color: portal.color,
                    fontWeight: 600,
                    fontSize: 'var(--text-sm)',
                  }}>
                    {user ? 'Go to Dashboard' : 'Begin Registration'}
                    <IconChevronRight size={16} />
                  </div>
                </div>
              </Link>
            );
          })}
        </div>

        {/* Verification notice */}
        <div style={{
          marginTop: 'var(--sp-10)',
          padding: 'var(--sp-5) var(--sp-6)',
          background: 'var(--info-bg)',
          border: '1px solid var(--info-border)',
          borderRadius: 'var(--radius-lg)',
          display: 'flex',
          alignItems: 'flex-start',
          gap: 'var(--sp-4)',
        }}>
          <IconShieldMedical size={20} style={{ color: 'var(--info)', flexShrink: 0, marginTop: '2px' }} />
          <div>
            <h4 style={{ fontSize: 'var(--text-base)', fontWeight: 600, color: 'var(--info)', marginBottom: 'var(--sp-1)' }}>
              Credential Verification Required
            </h4>
            <p style={{ fontSize: 'var(--text-sm)', color: 'var(--text-secondary)', lineHeight: 1.6 }}>
              All healthcare professionals must complete identity and credential verification before gaining access to clinical workflows. This process typically takes 2-5 business days. You will receive email notifications on your verification status.
            </p>
          </div>
        </div>

        {/* Login/Register links */}
        <div style={{ textAlign: 'center', marginTop: 'var(--sp-8)' }}>
          <p style={{ fontSize: 'var(--text-sm)', color: 'var(--text-muted)', marginBottom: 'var(--sp-2)' }}>
            Already have a professional account?
          </p>
          <Link href="/professional/login" style={{ color: 'var(--primary)', fontWeight: 600, textDecoration: 'none', fontSize: 'var(--text-base)' }}>
            Sign in as Professional
          </Link>
        </div>
        <div style={{ textAlign: 'center', marginTop: 'var(--sp-3)' }}>
          <p style={{ fontSize: 'var(--text-sm)', color: 'var(--text-muted)', marginBottom: 'var(--sp-2)' }}>
            Are you a patient?
          </p>
          <Link href="/patient/login" style={{ color: 'var(--text-secondary)', fontWeight: 500, textDecoration: 'none', fontSize: 'var(--text-sm)' }}>
            Sign in as Patient
          </Link>
        </div>
      </div>
    </div>
  );
}
