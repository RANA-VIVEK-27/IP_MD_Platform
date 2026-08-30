'use client';

import React from 'react';
import { ProtectedRoute } from '../../components/ProtectedRoute';

export default function UserAdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <ProtectedRoute allowedRoles={['user_admin', 'super_admin']}>
      {children}
    </ProtectedRoute>
  );
}
