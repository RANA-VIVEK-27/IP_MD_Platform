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
  IconPrescription,
  IconHeartbeat,
  IconClipboardMedical,
  IconPackage,
  IconTruck,
  IconUser,
  IconMicroscope,
  IconCapsule,
  IconChevronDown,
} from './Icons';

export interface NavDropdownChild {
  label: string;
  href: string;
  description?: string;
  icon: React.ReactNode;
}

export interface NavItem {
  label: string;
  href?: string;
  icon: React.ReactNode;
  isAction?: boolean;
  children?: NavDropdownChild[];
}

const roleLabels: Record<UserRole, string> = {
  patient: 'Patient',
  doctor: 'Doctor',
  pharmacist: 'Pharmacist',
  pharmacy_admin: 'Pharmacy Admin',
  pharmacy_staff_owned: 'Pharmacy',
  partner_pharmacy: 'Partner',
  admin: 'Operations',
  user_admin: 'User Admin',
  super_admin: 'Super Admin',
};

const roleBadgeClass: Record<UserRole, string> = {
  patient: 'badge-teal',
  doctor: 'badge-info',
  pharmacist: 'badge-info',
  pharmacy_admin: 'badge-warning',
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
  const [activeDropdown, setActiveDropdown] = useState<string | null>(null);
  const [unreadCount, setUnreadCount] = useState(0);
  
  const userMenuRef = useRef<HTMLDivElement>(null);
  const navContainerRef = useRef<HTMLDivElement>(null);
  const dropdownTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const currentRole: UserRole = user?.role || 'patient';

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (userMenuRef.current && !userMenuRef.current.contains(e.target as Node)) {
        setUserMenuOpen(false);
      }
      if (navContainerRef.current && !navContainerRef.current.contains(e.target as Node)) {
        setActiveDropdown(null);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    setMobileOpen(false);
    setActiveDropdown(null);
    setUserMenuOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!user) return;
    let active = true;
    let interval: ReturnType<typeof setInterval> | null = null;

    async function fetchCount() {
      if (document.hidden) return;
      try {
        const res = await ApiClient.getUnreadCount();
        if (active) setUnreadCount(res.unread_count);
      } catch { /* ignore */ }
    }

    function startPolling() {
      if (interval) clearInterval(interval);
      interval = setInterval(fetchCount, 60000);
    }

    fetchCount();
    startPolling();

    function onVisibilityChange() {
      if (!document.hidden) {
        fetchCount();
        startPolling();
      } else if (interval) {
        clearInterval(interval);
        interval = null;
      }
    }

    document.addEventListener('visibilitychange', onVisibilityChange);
    return () => {
      active = false;
      if (interval) clearInterval(interval);
      document.removeEventListener('visibilitychange', onVisibilityChange);
    };
  }, [user]);

  if (!user) return null;

  const getNavItems = (role: UserRole): NavItem[] => {
    switch (role) {
      case 'patient':
        return [
          {
            label: 'Home',
            href: '/patient',
            icon: <IconActivity size={16} />,
          },
          {
            label: 'Upload Rx',
            href: '/patient/upload',
            icon: <IconUpload size={16} />,
            isAction: true,
          },
          {
            label: 'Health Records',
            icon: <IconClipboardMedical size={16} />,
            children: [
              {
                label: 'Prescriptions',
                href: '/patient/prescriptions',
                description: 'Digitized & active doctor prescriptions',
                icon: <IconPrescription size={18} />,
              },
              {
                label: 'Diagnostic Reports',
                href: '/patient/reports',
                description: 'Lab test results & clinical analysis',
                icon: <IconClipboardMedical size={18} />,
              },
              {
                label: 'Medical Documents',
                href: '/patient/documents',
                description: 'Discharge cards, bills & summaries',
                icon: <IconFileText size={18} />,
              },
            ],
          },
          {
            label: 'Pharmacy',
            icon: <IconCapsule size={16} />,
            children: [
              {
                label: 'Browse Medicines',
                href: '/patient/catalog',
                description: 'Search & buy verified medicines',
                icon: <IconCapsule size={18} />,
              },
              {
                label: 'My Orders',
                href: '/patient/orders',
                description: 'Track ongoing & past deliveries',
                icon: <IconPackage size={18} />,
              },
              {
                label: 'Shopping Cart',
                href: '/patient/cart',
                description: 'Review items & proceed to checkout',
                icon: <IconShoppingCart size={18} />,
              },
            ],
          },
          {
            label: 'AI Chat',
            href: '/patient/chat',
            icon: <IconSparkles size={16} />,
          },
        ];

      case 'doctor':
        return [
          { label: 'Queue', href: '/doctor', icon: <IconShieldCheck size={16} /> },
          { label: 'Reports', href: '/doctor/reports', icon: <IconClipboardMedical size={16} /> },
          { label: 'Audit', href: '/doctor/audit', icon: <IconMicroscope size={16} /> },
        ];

      case 'pharmacist':
        return [
          { label: 'Dashboard', href: '/pharmacy/pharmacist/dashboard', icon: <IconActivity size={16} /> },
          { label: 'Prescriptions', href: '/pharmacy/pharmacist/prescriptions', icon: <IconPrescription size={16} /> },
        ];

      case 'pharmacy_admin':
      case 'pharmacy_staff_owned':
      case 'partner_pharmacy':
        return [
          { label: 'Dashboard', href: '/pharmacy/dashboard', icon: <IconActivity size={16} /> },
          { label: 'Medicines', href: '/pharmacy/medicines', icon: <IconPrescription size={16} /> },
          { label: 'Inventory', href: '/pharmacy/inventory', icon: <IconPackage size={16} /> },
          { label: 'Orders', href: '/pharmacy/orders', icon: <IconTruck size={16} /> },
          { label: 'Fulfillment', href: '/pharmacy/fulfillment', icon: <IconSettings size={16} /> },
        ];

      case 'admin':
        return [
          { label: 'Dashboard', href: '/admin', icon: <IconActivity size={16} /> },
          { label: 'Partners', href: '/admin/partners', icon: <IconTruck size={16} /> },
          { label: 'Disputes', href: '/admin/disputes', icon: <IconShieldCheck size={16} /> },
          { label: 'SLA Queue', href: '/admin/verification', icon: <IconClipboardMedical size={16} /> },
        ];

      case 'user_admin':
        return [
          { label: 'Doctor KYC', href: '/user-admin', icon: <IconUserCheck size={16} /> },
          { label: 'Accounts', href: '/user-admin/accounts', icon: <IconSettings size={16} /> },
        ];

      case 'super_admin':
        return [
          { label: 'Admins', href: '/super-admin', icon: <IconUserCheck size={16} /> },
          { label: 'Settings', href: '/super-admin/settings', icon: <IconSettings size={16} /> },
          { label: 'Compliance', href: '/super-admin/compliance', icon: <IconShieldCheck size={16} /> },
          { label: 'Audit Logs', href: '/super-admin/audit', icon: <IconActivity size={16} /> },
        ];

      default:
        return [{ label: 'Home', href: '/patient', icon: <IconActivity size={16} /> }];
    }
  };

  const navItems = getNavItems(currentRole);

  const isLinkActive = (href: string) => {
    if (href === '/') return pathname === '/';
    return pathname === href || (pathname.startsWith(href) && !['/patient', '/doctor', '/admin', '/super-admin', '/user-admin'].includes(href));
  };

  const isItemActive = (item: NavItem) => {
    if (item.href) {
      return isLinkActive(item.href);
    }
    if (item.children) {
      return item.children.some(child => pathname === child.href || pathname.startsWith(child.href));
    }
    return false;
  };

  const handleDropdownEnter = (label: string) => {
    if (dropdownTimeoutRef.current) clearTimeout(dropdownTimeoutRef.current);
    setActiveDropdown(label);
  };

  const handleDropdownLeave = () => {
    if (dropdownTimeoutRef.current) clearTimeout(dropdownTimeoutRef.current);
    dropdownTimeoutRef.current = setTimeout(() => {
      setActiveDropdown(null);
    }, 150);
  };

  const handleSignOut = () => {
    logout();
    setUserMenuOpen(false);
    router.push('/');
  };

  return (
    <header
      style={{
        backgroundColor: 'rgba(255, 255, 255, 0.95)',
        borderBottom: '1px solid var(--border-light)',
        position: 'sticky',
        top: 0,
        zIndex: 200,
        backdropFilter: 'blur(10px)',
        WebkitBackdropFilter: 'blur(10px)',
        boxShadow: '0 1px 3px rgba(15, 43, 60, 0.03)',
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
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--sp-5)' }}>
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
                boxShadow: '0 2px 8px rgba(11, 110, 107, 0.25)',
              }}
            >
              <IconHeartbeat size={18} style={{ color: '#fff' }} />
            </div>
            <span className="hide-mobile" style={{ letterSpacing: '-0.01em', fontWeight: 800 }}>
              I.P. &amp; M.D Platform
            </span>
          </Link>

          {/* Desktop Nav - Clean, no horizontal scroll */}
          <nav
            ref={navContainerRef}
            className="hide-mobile"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 'var(--sp-1)',
            }}
            role="navigation"
            aria-label="Main navigation"
          >
            {navItems.map((item) => {
              const active = isItemActive(item);

              // Highlighted Action Button (e.g. "+ Upload Rx")
              if (item.isAction && item.href) {
                return (
                  <Link
                    key={item.label}
                    href={item.href}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '6px',
                      padding: '6px 14px',
                      borderRadius: 'var(--radius-pill)',
                      textDecoration: 'none',
                      fontSize: 'var(--text-xs)',
                      fontWeight: 650,
                      color: active ? '#ffffff' : 'var(--primary)',
                      backgroundColor: active ? 'var(--primary)' : 'var(--primary-light)',
                      border: active ? '1px solid var(--primary)' : '1px solid rgba(11, 110, 107, 0.2)',
                      boxShadow: active ? '0 2px 6px rgba(11, 110, 107, 0.25)' : 'none',
                      transition: 'all 180ms ease',
                      marginLeft: 'var(--sp-1)',
                    }}
                    onMouseEnter={(e) => {
                      if (!active) {
                        e.currentTarget.style.backgroundColor = 'var(--primary)';
                        e.currentTarget.style.color = '#ffffff';
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (!active) {
                        e.currentTarget.style.backgroundColor = 'var(--primary-light)';
                        e.currentTarget.style.color = 'var(--primary)';
                      }
                    }}
                  >
                    {item.icon}
                    <span>{item.label}</span>
                  </Link>
                );
              }

              // Dropdown Group (e.g., "Health Records ▾", "Pharmacy ▾")
              if (item.children) {
                const isDropdownOpen = activeDropdown === item.label;
                return (
                  <div
                    key={item.label}
                    style={{ position: 'relative' }}
                    onMouseEnter={() => handleDropdownEnter(item.label)}
                    onMouseLeave={handleDropdownLeave}
                  >
                    <button
                      type="button"
                      onClick={() => setActiveDropdown(isDropdownOpen ? null : item.label)}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '5px',
                        padding: '7px 11px',
                        borderRadius: 'var(--radius-md)',
                        border: 'none',
                        background: active ? 'var(--primary-light)' : (isDropdownOpen ? 'var(--bg-muted)' : 'transparent'),
                        fontSize: 'var(--text-xs)',
                        fontWeight: active ? 600 : 500,
                        color: active ? 'var(--primary)' : 'var(--text-secondary)',
                        cursor: 'pointer',
                        transition: 'all 150ms ease-out',
                        position: 'relative',
                      }}
                      aria-expanded={isDropdownOpen}
                      aria-haspopup="true"
                    >
                      {item.icon}
                      <span>{item.label}</span>
                      <IconChevronDown
                        size={14}
                        style={{
                          transform: isDropdownOpen ? 'rotate(180deg)' : 'rotate(0deg)',
                          transition: 'transform 180ms ease-out',
                          color: active ? 'var(--primary)' : 'var(--text-muted)',
                        }}
                      />
                      {active && (
                        <div
                          style={{
                            position: 'absolute',
                            bottom: '-10px',
                            left: '50%',
                            transform: 'translateX(-50%)',
                            width: '20px',
                            height: '2px',
                            borderRadius: 'var(--radius-pill)',
                            background: 'var(--primary)',
                          }}
                        />
                      )}
                    </button>

                    {/* Dropdown Menu Card */}
                    {isDropdownOpen && (
                      <div
                        style={{
                          position: 'absolute',
                          top: '100%',
                          left: 0,
                          marginTop: '6px',
                          backgroundColor: '#FFFFFF',
                          border: '1px solid var(--border-light)',
                          borderRadius: 'var(--radius-lg)',
                          boxShadow: '0 12px 32px rgba(15, 43, 60, 0.12), 0 2px 6px rgba(15, 43, 60, 0.04)',
                          minWidth: '260px',
                          padding: 'var(--sp-2)',
                          zIndex: 220,
                          animation: 'scaleIn 140ms cubic-bezier(0.16, 1, 0.3, 1)',
                        }}
                        role="menu"
                      >
                        {item.children.map((child) => {
                          const isChildActive = pathname === child.href || pathname.startsWith(child.href);
                          return (
                            <Link
                              key={child.href}
                              href={child.href}
                              role="menuitem"
                              style={{
                                display: 'flex',
                                alignItems: 'flex-start',
                                gap: 'var(--sp-3)',
                                padding: '8px 10px',
                                borderRadius: 'var(--radius-md)',
                                textDecoration: 'none',
                                backgroundColor: isChildActive ? 'var(--primary-light)' : 'transparent',
                                transition: 'background-color 140ms ease',
                                marginBottom: '2px',
                              }}
                              onMouseEnter={(e) => {
                                if (!isChildActive) e.currentTarget.style.backgroundColor = 'var(--bg-muted)';
                              }}
                              onMouseLeave={(e) => {
                                if (!isChildActive) e.currentTarget.style.backgroundColor = 'transparent';
                              }}
                              onClick={() => setActiveDropdown(null)}
                            >
                              <div
                                style={{
                                  width: '32px',
                                  height: '32px',
                                  borderRadius: 'var(--radius-md)',
                                  backgroundColor: isChildActive ? 'rgba(11, 110, 107, 0.15)' : 'var(--bg-muted)',
                                  color: isChildActive ? 'var(--primary)' : 'var(--text-secondary)',
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  flexShrink: 0,
                                  marginTop: '2px',
                                }}
                              >
                                {child.icon}
                              </div>
                              <div style={{ display: 'flex', flexDirection: 'column' }}>
                                <span
                                  style={{
                                    fontSize: 'var(--text-sm)',
                                    fontWeight: isChildActive ? 650 : 550,
                                    color: isChildActive ? 'var(--primary)' : 'var(--text-primary)',
                                    lineHeight: 1.3,
                                  }}
                                >
                                  {child.label}
                                </span>
                                {child.description && (
                                  <span
                                    style={{
                                      fontSize: '11px',
                                      color: 'var(--text-muted)',
                                      marginTop: '2px',
                                      lineHeight: 1.3,
                                    }}
                                  >
                                    {child.description}
                                  </span>
                                )}
                              </div>
                            </Link>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              }

              // Standard Link Item (Home, AI Chat, etc.)
              return (
                <Link
                  key={item.label}
                  href={item.href || '#'}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '5px',
                    padding: '7px 11px',
                    borderRadius: 'var(--radius-md)',
                    textDecoration: 'none',
                    fontSize: 'var(--text-xs)',
                    fontWeight: active ? 600 : 500,
                    color: active ? 'var(--primary)' : 'var(--text-secondary)',
                    backgroundColor: active ? 'var(--primary-light)' : 'transparent',
                    transition: 'all 150ms ease-out',
                    whiteSpace: 'nowrap',
                    position: 'relative',
                  }}
                  aria-current={active ? 'page' : undefined}
                >
                  {item.icon}
                  <span>{item.label}</span>
                  {active && (
                    <div
                      style={{
                        position: 'absolute',
                        bottom: '-10px',
                        left: '50%',
                        transform: 'translateX(-50%)',
                        width: '20px',
                        height: '2px',
                        borderRadius: 'var(--radius-pill)',
                        background: 'var(--primary)',
                      }}
                    />
                  )}
                </Link>
              );
            })}
          </nav>
        </div>

        {/* Right: Quick Action Controls & User Menu */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--sp-2)' }}>
          {/* Quick Cart Shortcut for Patients */}
          {currentRole === 'patient' && (
            <Link
              href="/patient/cart"
              className="btn btn-ghost btn-icon btn-sm"
              style={{
                position: 'relative',
                color: isLinkActive('/patient/cart') ? 'var(--primary)' : 'var(--text-secondary)',
                textDecoration: 'none',
              }}
              aria-label="Shopping Cart"
              title="Shopping Cart"
            >
              <IconShoppingCart size={18} />
            </Link>
          )}

          {/* Notifications Bell */}
          <Link
            href="/notifications"
            className="btn btn-ghost btn-icon btn-sm"
            style={{
              position: 'relative',
              color: isLinkActive('/notifications') ? 'var(--primary)' : 'var(--text-secondary)',
              textDecoration: 'none',
            }}
            aria-label={`Notifications${unreadCount > 0 ? ` (${unreadCount} unread)` : ''}`}
            title="Notifications"
          >
            <IconBell size={18} />
            {unreadCount > 0 && (
              <span
                style={{
                  position: 'absolute',
                  top: '2px',
                  right: '2px',
                  minWidth: '16px',
                  height: '16px',
                  borderRadius: 'var(--radius-pill)',
                  background: 'var(--danger)',
                  color: '#fff',
                  fontSize: '10px',
                  fontWeight: 700,
                  lineHeight: '16px',
                  textAlign: 'center',
                  padding: '0 4px',
                  border: '2px solid var(--bg-surface)',
                  animation: 'pulseGlow 2s ease-in-out infinite',
                }}
              >
                {unreadCount > 99 ? '99+' : unreadCount}
              </span>
            )}
          </Link>

          {/* Help button */}
          <button
            className="btn btn-ghost btn-icon btn-sm hide-mobile"
            style={{ color: 'var(--text-secondary)' }}
            aria-label="Help"
            title="Help & Support"
          >
            <IconHelpCircle size={18} />
          </button>

          {/* Role badge */}
          <span
            className={`badge ${roleBadgeClass[currentRole]} hide-mobile`}
            style={{
              fontSize: '10px',
              textTransform: 'uppercase',
              letterSpacing: '0.06em',
              fontWeight: 650,
              padding: '2px 8px',
            }}
          >
            {roleLabels[currentRole]}
          </span>

          {/* User profile dropdown */}
          <div ref={userMenuRef} style={{ position: 'relative' }}>
            <button
              onClick={() => setUserMenuOpen(!userMenuOpen)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 'var(--sp-2)',
                padding: '4px 8px',
                borderRadius: 'var(--radius-md)',
                border: '1px solid transparent',
                background: 'none',
                cursor: 'pointer',
                transition: 'background 120ms',
                color: 'var(--text-primary)',
              }}
              onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = 'var(--bg-muted)'; }}
              onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'transparent'; }}
              aria-expanded={userMenuOpen}
              aria-haspopup="true"
            >
              <Avatar name={user?.full_name || 'User'} size="sm" />
              <span className="hide-mobile" style={{ fontSize: 'var(--text-sm)', fontWeight: 550 }}>
                {user?.full_name?.split(' ')[0]}
              </span>
              <IconChevronDown
                size={14}
                className="hide-mobile"
                style={{
                  transform: userMenuOpen ? 'rotate(180deg)' : 'rotate(0deg)',
                  transition: 'transform 150ms ease-out',
                  color: 'var(--text-muted)',
                }}
              />
            </button>

            {userMenuOpen && (
              <div
                style={{
                  position: 'absolute',
                  top: '100%',
                  right: 0,
                  marginTop: 'var(--sp-2)',
                  backgroundColor: 'var(--bg-surface)',
                  border: '1px solid var(--border-light)',
                  borderRadius: 'var(--radius-lg)',
                  boxShadow: '0 12px 32px rgba(15, 43, 60, 0.12), 0 2px 6px rgba(15, 43, 60, 0.04)',
                  minWidth: '230px',
                  padding: 'var(--sp-2)',
                  zIndex: 220,
                  animation: 'scaleIn 150ms var(--ease)',
                }}
                role="menu"
              >
                <div style={{ padding: 'var(--sp-3)', borderBottom: '1px solid var(--border-light)', marginBottom: 'var(--sp-2)' }}>
                  <div style={{ fontSize: 'var(--text-sm)', fontWeight: 650, color: 'var(--text-primary)' }}>{user?.full_name}</div>
                  <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)', marginTop: '2px' }}>{user?.email}</div>
                  <span className={`badge ${roleBadgeClass[currentRole]}`} style={{ marginTop: 'var(--sp-2)', fontSize: '10px' }}>
                    {roleLabels[currentRole]}
                  </span>
                </div>

                {currentRole === 'patient' && (
                  <>
                    <Link
                      href="/patient/profile"
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 'var(--sp-2)',
                        padding: '7px 10px',
                        fontSize: 'var(--text-sm)',
                        color: 'var(--text-primary)',
                        textDecoration: 'none',
                        borderRadius: 'var(--radius-sm)',
                        fontWeight: 500,
                      }}
                      role="menuitem"
                      onClick={() => setUserMenuOpen(false)}
                      onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = 'var(--bg-muted)'; }}
                      onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'transparent'; }}
                    >
                      <IconUser size={15} style={{ color: 'var(--primary)' }} />
                      My Profile
                    </Link>

                    <Link
                      href="/patient/orders"
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 'var(--sp-2)',
                        padding: '7px 10px',
                        fontSize: 'var(--text-sm)',
                        color: 'var(--text-primary)',
                        textDecoration: 'none',
                        borderRadius: 'var(--radius-sm)',
                        fontWeight: 500,
                      }}
                      role="menuitem"
                      onClick={() => setUserMenuOpen(false)}
                      onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = 'var(--bg-muted)'; }}
                      onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'transparent'; }}
                    >
                      <IconPackage size={15} style={{ color: 'var(--primary)' }} />
                      My Orders
                    </Link>

                    <Link
                      href="/patient/upload"
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 'var(--sp-2)',
                        padding: '7px 10px',
                        fontSize: 'var(--text-sm)',
                        color: 'var(--text-primary)',
                        textDecoration: 'none',
                        borderRadius: 'var(--radius-sm)',
                        fontWeight: 500,
                      }}
                      role="menuitem"
                      onClick={() => setUserMenuOpen(false)}
                      onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = 'var(--bg-muted)'; }}
                      onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'transparent'; }}
                    >
                      <IconUpload size={15} style={{ color: 'var(--primary)' }} />
                      Upload Prescription
                    </Link>
                  </>
                )}

                <div style={{ borderTop: '1px solid var(--border-light)', marginTop: 'var(--sp-2)', paddingTop: 'var(--sp-2)' }}>
                  <button
                    onClick={handleSignOut}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 'var(--sp-2)',
                      width: '100%',
                      padding: '7px 10px',
                      fontSize: 'var(--text-sm)',
                      color: 'var(--danger)',
                      background: 'none',
                      border: 'none',
                      borderRadius: 'var(--radius-sm)',
                      cursor: 'pointer',
                      fontWeight: 550,
                      textAlign: 'left',
                    }}
                    role="menuitem"
                    onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = 'var(--danger-bg)'; }}
                    onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'transparent'; }}
                  >
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
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
            padding: 'var(--sp-4)',
            backgroundColor: 'var(--bg-surface)',
            animation: 'fadeIn 150ms ease',
            maxHeight: 'calc(100vh - 60px)',
            overflowY: 'auto',
          }}
          aria-label="Mobile navigation"
        >
          {navItems.map((item) => {
            if (item.children) {
              return (
                <div key={item.label} style={{ marginBottom: 'var(--sp-3)' }}>
                  <div
                    style={{
                      fontSize: '11px',
                      textTransform: 'uppercase',
                      fontWeight: 700,
                      letterSpacing: '0.06em',
                      color: 'var(--text-muted)',
                      padding: '4px var(--sp-2)',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                    }}
                  >
                    {item.icon}
                    {item.label}
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', marginTop: '4px' }}>
                    {item.children.map((child) => {
                      const active = isLinkActive(child.href);
                      return (
                        <Link
                          key={child.href}
                          href={child.href}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: 'var(--sp-3)',
                            padding: '8px 12px',
                            borderRadius: 'var(--radius-md)',
                            textDecoration: 'none',
                            fontSize: 'var(--text-sm)',
                            fontWeight: active ? 600 : 500,
                            color: active ? 'var(--primary)' : 'var(--text-primary)',
                            backgroundColor: active ? 'var(--primary-light)' : 'transparent',
                          }}
                          aria-current={active ? 'page' : undefined}
                          onClick={() => setMobileOpen(false)}
                        >
                          {child.icon}
                          <span>{child.label}</span>
                        </Link>
                      );
                    })}
                  </div>
                </div>
              );
            }

            if (item.href) {
              const active = isLinkActive(item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 'var(--sp-3)',
                    padding: '10px 12px',
                    borderRadius: 'var(--radius-md)',
                    textDecoration: 'none',
                    fontSize: 'var(--text-sm)',
                    fontWeight: active ? 600 : 500,
                    color: active ? 'var(--primary)' : (item.isAction ? 'var(--primary)' : 'var(--text-primary)'),
                    backgroundColor: active ? 'var(--primary-light)' : (item.isAction ? 'var(--primary-50)' : 'transparent'),
                    marginBottom: '4px',
                    border: item.isAction ? '1px dashed rgba(11, 110, 107, 0.3)' : 'none',
                  }}
                  aria-current={active ? 'page' : undefined}
                  onClick={() => setMobileOpen(false)}
                >
                  {item.icon}
                  <span>{item.label}</span>
                </Link>
              );
            }

            return null;
          })}

          <div style={{ borderTop: '1px solid var(--border-light)', marginTop: 'var(--sp-4)', paddingTop: 'var(--sp-3)' }}>
            <Link
              href="/patient/profile"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 'var(--sp-3)',
                padding: '10px 12px',
                borderRadius: 'var(--radius-md)',
                textDecoration: 'none',
                fontSize: 'var(--text-sm)',
                color: 'var(--text-primary)',
              }}
              onClick={() => setMobileOpen(false)}
            >
              <IconUser size={16} />
              <span>My Profile</span>
            </Link>
            <button
              onClick={handleSignOut}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 'var(--sp-3)',
                width: '100%',
                padding: '10px 12px',
                borderRadius: 'var(--radius-md)',
                border: 'none',
                background: 'none',
                fontSize: 'var(--text-sm)',
                color: 'var(--danger)',
                cursor: 'pointer',
                textAlign: 'left',
              }}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                <polyline points="16 17 21 12 16 7" />
                <line x1="21" y1="12" x2="9" y2="12" />
              </svg>
              <span>Sign Out</span>
            </button>
          </div>
        </nav>
      )}
    </header>
  );
}

