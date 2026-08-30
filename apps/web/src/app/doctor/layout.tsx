'use client';

import React from 'react';
import { ProtectedRoute } from '../../components/ProtectedRoute';

export default function DoctorLayout({ children }: { children: React.ReactNode }) {
  return (
    <ProtectedRoute allowedRoles={['doctor']}>
      {children}
    </ProtectedRoute>
  );
}
