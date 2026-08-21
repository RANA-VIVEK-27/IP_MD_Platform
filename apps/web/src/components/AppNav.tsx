'use client';

import React from 'react';
import { usePathname } from 'next/navigation';
import { Navigation } from '../components/Navigation';
import { LandingNav } from '../components/landing/LandingNav';

export function AppNav() {
  const pathname = usePathname();
  const isLanding = pathname === '/';

  if (isLanding) {
    return <LandingNav />;
  }

  return <Navigation />;
}
