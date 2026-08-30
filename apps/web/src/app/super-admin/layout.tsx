'use client';

import React from 'react';
import { ProtectedRoute } from '../../components/ProtectedRoute';

export default function SuperAdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <ProtectedRoute allowedRoles={['super_admin']}>
      {children}
    </ProtectedRoute>
  );
}
