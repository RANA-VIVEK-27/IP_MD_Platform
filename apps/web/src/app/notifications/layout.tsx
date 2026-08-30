'use client';

import React from 'react';
import { ProtectedRoute } from '../../components/ProtectedRoute';
import { UserRole } from '../../lib/types';

const ALL_AUTHENTICATED_ROLES: UserRole[] = [
  'patient', 'doctor', 'admin', 'user_admin', 'super_admin',
  'pharmacy_staff_owned', 'partner_pharmacy',
];

export default function NotificationsLayout({ children }: { children: React.ReactNode }) {
  return (
    <ProtectedRoute allowedRoles={ALL_AUTHENTICATED_ROLES}>
      {children}
    </ProtectedRoute>
  );
}
