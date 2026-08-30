'use client';
import React from 'react';
import { usePathname } from 'next/navigation';
import { ProtectedRoute } from '../../components/ProtectedRoute';

const PUBLIC_PATHS = ['/professional', '/professional/login', '/professional/doctor/register', '/professional/pharmacist/register', '/professional/pharmacy/register'];

export default function ProfessionalLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  if (PUBLIC_PATHS.includes(pathname)) {
    return <>{children}</>;
  }

  return (
    <ProtectedRoute allowedRoles={['doctor', 'pharmacist', 'pharmacy_admin', 'pharmacy_staff_owned']}>
      {children}
    </ProtectedRoute>
  );
}
