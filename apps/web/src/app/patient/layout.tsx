'use client';

import React from 'react';
import { usePathname } from 'next/navigation';
import { ProtectedRoute } from '../../components/ProtectedRoute';

const PUBLIC_PATHS = ['/patient/login', '/patient/register'];

export default function PatientLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  if (PUBLIC_PATHS.includes(pathname)) {
    return <>{children}</>;
  }

  return (
    <ProtectedRoute allowedRoles={['patient']}>
      {children}
    </ProtectedRoute>
  );
}
