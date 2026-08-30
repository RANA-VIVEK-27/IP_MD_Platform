'use client';

import React, { useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../lib/auth-context';
import { UserRole } from '../lib/types';
import { LoadingSpinner } from './LoadingSpinner';

const ROLE_REDIRECTS: Record<string, string> = {
  patient: '/patient',
  doctor: '/doctor',
  pharmacist: '/pharmacy/pharmacist/dashboard',
  pharmacy_admin: '/pharmacy/dashboard',
  pharmacy_staff_owned: '/pharmacy/dashboard',
  partner_pharmacy: '/pharmacy/dashboard',
  admin: '/admin',
  user_admin: '/user-admin',
  super_admin: '/super-admin',
};

interface ProtectedRouteProps {
  children: React.ReactNode;
  allowedRoles: UserRole[];
}

export function ProtectedRoute({ children, allowedRoles }: ProtectedRouteProps) {
  const { user, isLoading } = useAuth();
  const router = useRouter();
  const redirected = useRef(false);

  // Determine authorization state synchronously (before any render)
  const isAuthorized = !isLoading && user !== null && allowedRoles.includes(user.role);
  const mustRedirect = !isLoading && (!user || !allowedRoles.includes(user.role));

  useEffect(() => {
    if (mustRedirect && !redirected.current) {
      redirected.current = true;
      if (!user) {
        router.replace('/patient/login');
      } else {
        const home = ROLE_REDIRECTS[user.role] || '/patient';
        router.replace(home);
      }
    }
  }, [mustRedirect, user, router]);

  // Reset redirect flag when auth state changes
  useEffect(() => {
    redirected.current = false;
  }, [user?.role]);

  // Still loading — show spinner
  if (isLoading) return <LoadingSpinner text="Verifying access..." />;

  // Not authorized — render nothing (redirect in progress)
  if (!isAuthorized) return null;

  // Authorized — render children
  return <>{children}</>;
}
