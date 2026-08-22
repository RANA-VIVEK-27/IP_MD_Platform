'use client';

import React, { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useAuth } from '../lib/auth-context';
import { ApiClient } from '../lib/api';
import { UserRole } from '../lib/types';
import { Avatar } from './Avatar';
import {
  IconFileText,
  IconUpload,
  IconShoppingCart,
  IconShieldCheck,
  IconSettings,
  IconActivity,
  IconSparkles,
  IconUserCheck,
  IconBell,
  IconHelpCircle,
} from './Icons';

interface NavItem {
  label: string;
  href: string;
  icon: React.ReactNode;
}

const roleLabels: Record<UserRole, string> = {
  patient: 'Patient',
  doctor: 'Doctor',
  pharmacy_staff_owned: 'Pharmacy',
  partner_pharmacy: 'Partner',
  admin: 'Operations',
  user_admin: 'User Admin',
  super_admin: 'Super Admin',
};

const roleBadgeClass: Record<UserRole, string> = {
  patient: 'badge-teal',
  doctor: 'badge-info',
  pharmacy_staff_owned: 'badge-neutral',
  partner_pharmacy: 'badge-neutral',
  admin: 'badge-warning',
  user_admin: 'badge-warning',
  super_admin: 'badge-danger',
};

export function Navigation() {
  const pathname = usePathname();
  const router = useRouter();
  const { user, logout } = useAuth();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const userMenuRef = useRef<HTMLDivElement>(null);

  const currentRole: UserRole = user?.role || 'patient';

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (userMenuRef.current && !userMenuRef.current.contains(e.target as Node)) {
        setUserMenuOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => { setMobileOpen(false); }, [pathname]);

  // Poll unread notification count every 30 seconds
  useEffect(() => {
    if (!user) return;
    let active = true;
    async function fetchCount() {
      try {
        const res = await ApiClient.getUnreadCount();
        if (active) setUnreadCount(res.unread_count);
      } catch { /* ignore */ }
    }
    fetchCount();
    const interval = setInterval(fetchCount, 30000);
    return () => { active = false; clearInterval(interval); };
  }, [user]);

  const getNavItems = (role: UserRole): NavItem[] => {
    const notifItem: NavItem = { label: 'Notifications', href: '/notifications', icon: <IconBell size={16} /> };
    switch (role) {
      case 'patient':
        return [
          { label: 'Home', href: '/patient', icon: <IconActivity size={16} /> },
          { label: 'Upload Rx', href: '/patient/upload', icon: <IconUpload size={16} /> },
          { label: 'AI Chat', href: '/patient/chat', icon: <IconSparkles size={16} /> },
          { label: 'Medicines', href: '/patient/catalog', icon: <IconFileText size={16} /> },
          { label: 'Cart', href: '/patient/cart', icon: <IconShoppingCart size={16} /> },
          { label: 'My Orders', href: '/patient/orders', icon: <IconFileText size={16} /> },
          notifItem,
        ];
      case 'doctor':
        return [
          { label: 'Queue', href: '/doctor', icon: <IconShieldCheck size={16} /> },
          { label: 'Reports', href: '/doctor/reports', icon: <IconFileText size={16} /> },
          { label: 'Audit', href: '/doctor/audit', icon: <IconActivity size={16} /> },
          notifItem,
        ];
      case 'admin':
        return [
          { label: 'Dashboard', href: '/admin', icon: <IconActivity size={16} /> },
          { label: 'Partners', href: '/admin/partners', icon: <IconFileText size={16} /> },
          { label: 'Disputes', href: '/admin/disputes', icon: <IconShieldCheck size={16} /> },
          { label: 'SLA Queue', href: '/admin/verification', icon: <IconShieldCheck size={16} /> },
          notifItem,
        ];
      case 'pharmacy_staff_owned':
        return [
          { label: 'Dashboard', href: '/admin', icon: <IconActivity size={16} /> },
          { label: 'Orders', href: '/patient/orders', icon: <IconFileText size={16} /> },
          { label: 'Catalog', href: '/patient/catalog', icon: <IconFileText size={16} /> },
          notifItem,
        ];
      case 'partner_pharmacy':
        return [
          { label: 'Dashboard', href: '/admin', icon: <IconActivity size={16} /> },
          { label: 'Orders', href: '/patient/orders', icon: <IconFileText size={16} /> },
          { label: 'Catalog', href: '/patient/catalog', icon: <IconFileText size={16} /> },
          notifItem,
        ];
      case 'user_admin':
        return [
          { label: 'Doctor KYC', href: '/user-admin', icon: <IconUserCheck size={16} /> },
          { label: 'Accounts', href: '/user-admin/accounts', icon: <IconSettings size={16} /> },
          notifItem,
        ];
      case 'super_admin':
        return [
          { label: 'Admins', href: '/super-admin', icon: <IconUserCheck size={16} /> },
          { label: 'Settings', href: '/super-admin/settings', icon: <IconSettings size={16} /> },
          { label: 'Compliance', href: '/super-admin/compliance', icon: <IconShieldCheck size={16} /> },
          { label: 'Audit Logs', href: '/super-admin/audit', icon: <IconActivity size={16} /> },
          notifItem,
        ];
      default:
        return [{ label: 'Home', href: '/patient', icon: <IconActivity size={16} /> }];
    }
  };

  const navItems = getNavItems(currentRole);

  const isActive = (href: string) => {
    if (href === '/') return pathname === '/';
    return pathname === href || (pathname.startsWith(href) && !['/patient', '/doctor', '/admin', '/super-admin', '/user-admin'].includes(href));
  };

  const handleSignOut = () => {
    logout();
    setUserMenuOpen(false);
    router.push('/');
  };

  return (
    <header
      style={{
        backgroundColor: 'var(--bg-surface)',
        borderBottom: '1px solid var(--border-light)',
        position: 'sticky',
        top: 0,
        zIndex: 100,
      }}
      role="banner"
    >
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: '0 var(--sp-6)',
          height: '60px',
          maxWidth: '1440px',
          margin: '0 auto',
        }}
      >
        {/* Left: Brand + Nav */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--sp-6)' }}>
          <Link
            href="/"
            style={{
              textDecoration: 'none',
              color: 'var(--primary)',
              fontWeight: 700,
              fontSize: 'var(--text-lg)',
              display: 'flex',
              alignItems: 'center',
              gap: 'var(--sp-2)',
              flexShrink: 0,
            }}
            aria-label="I.P. & M.D Platform Home"
          >
            <div
              style={{
                width: '34px',
                height: '34px',
                borderRadius: 'var(--radius-md)',
                background: 'linear-gradient(135deg, var(--primary) 0%, #0A8E8A 100%)',
                color: '#ffffff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                position: 'relative',
                boxShadow: '0 2px 8px rgba(8, 127, 123, 0.25)',
              }}
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M8.5 14.5A2.5 2.5 0 0011 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 11-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 002.5 2.5z" />
              </svg>
            </div>
            <span className="hide-mobile" style={{ letterSpacing: '-0.01em' }}>
              I.P. & M.D Platform
            </span>
          </Link>

          {/* Desktop Nav */}
          <nav
            className="hide-mobile"
            style={{ display: 'flex', alignItems: 'center', gap: 'var(--sp-1)' }}
            role="navigation"
            aria-label="Main navigation"
          >
            {navItems.map((item) => {
              const active = isActive(item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    padding: '6px 12px',
                    borderRadius: 'var(--radius-md)',
                    textDecoration: 'none',
                    fontSize: 'var(--text-sm)',
                    fontWeight: active ? 600 : 450,
                    color: active ? 'var(--primary)' : 'var(--text-secondary)',
                    backgroundColor: active ? 'var(--primary-light)' : 'transparent',
                    transition: 'all 120ms ease-out',
                    whiteSpace: 'nowrap',
                  }}
                  aria-current={active ? 'page' : undefined}
                >
                  {item.icon}
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </nav>
        </div>

        {/* Right: Controls */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--sp-2)' }}>
          <Link
            href="/notifications"
            className="btn btn-ghost btn-icon btn-sm"
            style={{ position: 'relative', color: 'var(--text-secondary)', textDecoration: 'none' }}
            aria-label={`Notifications${unreadCount > 0 ? ` (${unreadCount} unread)` : ''}`}
          >
            <IconBell size={18} />
            {unreadCount > 0 && (
              <span
                style={{
                  position: 'absolute', top: '2px', right: '2px',
                  minWidth: '16px', height: '16px', borderRadius: 'var(--radius-pill)',
                  background: 'var(--danger)', color: '#fff',
                  fontSize: '10px', fontWeight: 700, lineHeight: '16px',
                  textAlign: 'center', padding: '0 4px',
                  border: '2px solid var(--bg-surface)',
                }}
              >
                {unreadCount > 99 ? '99+' : unreadCount}
              </span>
            )}
          </Link>

          <button
            className="btn btn-ghost btn-icon btn-sm hide-mobile"
            style={{ color: 'var(--text-secondary)' }}
            aria-label="Help"
          >
            <IconHelpCircle size={18} />
          </button>

          <span
            className={`badge ${roleBadgeClass[currentRole]} hide-mobile`}
            style={{ fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 600 }}
          >
            {roleLabels[currentRole]}
          </span>

          {/* User menu */}
          <div ref={userMenuRef} style={{ position: 'relative' }}>
            <button
              onClick={() => setUserMenuOpen(!userMenuOpen)}
              style={{
                display: 'flex', alignItems: 'center', gap: 'var(--sp-2)',
                padding: '4px 8px', borderRadius: 'var(--radius-md)',
                border: '1px solid transparent', background: 'none', cursor: 'pointer',
                transition: 'background 120ms', color: 'var(--text-primary)',
              }}
              onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.backgroundColor = 'var(--bg-muted)'; }}
              onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.backgroundColor = 'transparent'; }}
              aria-expanded={userMenuOpen}
              aria-haspopup="true"
            >
              <Avatar name={user?.full_name || 'User'} size="sm" />
              <span className="hide-mobile" style={{ fontSize: 'var(--text-sm)', fontWeight: 500 }}>
                {user?.full_name?.split(' ')[0]}
              </span>
              <svg
                width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
                className="hide-mobile"
                style={{
                  transform: userMenuOpen ? 'rotate(180deg)' : 'rotate(0deg)',
                  transition: 'transform 150ms ease-out',
                  color: 'var(--text-muted)',
                }}
              >
                <polyline points="6 9 12 15 18 9" />
              </svg>
            </button>

            {userMenuOpen && (
              <div
                style={{
                  position: 'absolute', top: '100%', right: 0,
                  marginTop: 'var(--sp-2)',
                  backgroundColor: 'var(--bg-surface)',
                  border: '1px solid var(--border-light)',
                  borderRadius: 'var(--radius-lg)',
                  boxShadow: 'var(--shadow-lg)',
                  minWidth: '220px', padding: 'var(--sp-2)', zIndex: 200,
                }}
                role="menu"
              >
                <div style={{ padding: 'var(--sp-3)', borderBottom: '1px solid var(--border-light)', marginBottom: 'var(--sp-2)' }}>
                  <div style={{ fontSize: 'var(--text-sm)', fontWeight: 600, color: 'var(--text-primary)' }}>{user?.full_name}</div>
                  <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)', marginTop: '2px' }}>{user?.email}</div>
                  <span className={`badge ${roleBadgeClass[currentRole]}`} style={{ marginTop: 'var(--sp-2)', fontSize: '10px' }}>
                    {roleLabels[currentRole]}
                  </span>
                </div>

                <div style={{ borderTop: '1px solid var(--border-light)', marginTop: 'var(--sp-2)', paddingTop: 'var(--sp-2)' }}>
                  <button
                    onClick={handleSignOut}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 'var(--sp-2)',
                      width: '100%', padding: '6px 8px', fontSize: 'var(--text-sm)',
                      color: 'var(--danger)', background: 'none', border: 'none',
                      borderRadius: 'var(--radius-sm)', cursor: 'pointer', fontWeight: 500,
                    }}
                    role="menuitem"
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                      <polyline points="16 17 21 12 16 7" />
                      <line x1="21" y1="12" x2="9" y2="12" />
                    </svg>
                    Sign Out
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Mobile hamburger */}
          <button
            className="btn btn-ghost btn-icon btn-sm hide-desktop"
            onClick={() => setMobileOpen(!mobileOpen)}
            aria-label={mobileOpen ? 'Close menu' : 'Open menu'}
            aria-expanded={mobileOpen}
            style={{ color: 'var(--text-primary)' }}
          >
            {mobileOpen ? (
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            ) : (
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="3" y1="6" x2="21" y2="6" />
                <line x1="3" y1="12" x2="21" y2="12" />
                <line x1="3" y1="18" x2="21" y2="18" />
              </svg>
            )}
          </button>
        </div>
      </div>

      {/* Mobile nav drawer */}
      {mobileOpen && (
        <nav
          className="hide-desktop"
          style={{
            borderTop: '1px solid var(--border-light)',
            padding: 'var(--sp-3) var(--sp-4)',
            backgroundColor: 'var(--bg-surface)',
          }}
          aria-label="Mobile navigation"
        >
          {navItems.map((item) => {
            const active = isActive(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                style={{
                  display: 'flex', alignItems: 'center', gap: 'var(--sp-3)',
                  padding: 'var(--sp-3)', borderRadius: 'var(--radius-md)',
                  textDecoration: 'none', fontSize: 'var(--text-md)',
                  fontWeight: active ? 600 : 450,
                  color: active ? 'var(--primary)' : 'var(--text-primary)',
                  backgroundColor: active ? 'var(--primary-light)' : 'transparent',
                  marginBottom: '2px',
                }}
                aria-current={active ? 'page' : undefined}
              >
                {item.icon}
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>
      )}
    </header>
  );
}
