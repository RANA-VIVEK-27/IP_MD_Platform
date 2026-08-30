'use client';

import React from 'react';
import { ProtectedRoute } from '../../components/ProtectedRoute';

export default function PharmacyLayout({ children }: { children: React.ReactNode }) {
  return (
    <ProtectedRoute allowedRoles={['pharmacy_staff_owned', 'partner_pharmacy', 'pharmacist', 'pharmacy_admin']}>
      {children}
    </ProtectedRoute>
  );
}
