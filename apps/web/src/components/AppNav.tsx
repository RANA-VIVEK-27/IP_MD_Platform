'use client';

import React from 'react';
import { usePathname } from 'next/navigation';
import { Navigation } from '../components/Navigation';
import { LandingNav } from '../components/landing/LandingNav';

const PUBLIC_PATHS = [
  '/',
  '/login',
  '/patient/login',
  '/patient/register',
  '/professional',
  '/professional/login',
  '/professional/doctor/register',
  '/professional/pharmacist/register',
  '/professional/pharmacy/register',
];

export function AppNav() {
  const pathname = usePathname();
  const isPublic = PUBLIC_PATHS.includes(pathname);

  if (isPublic) {
    return <LandingNav />;
  }

  return <Navigation />;
}
