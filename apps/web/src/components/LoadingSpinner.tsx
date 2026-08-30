'use client';

import React from 'react';

interface LoadingSpinnerProps {
  size?: number;
  text?: string;
  fullPage?: boolean;
}

export function LoadingSpinner({ size = 40, text, fullPage = false }: LoadingSpinnerProps) {
  const spinner = (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 'var(--sp-3)' }}>
      <div style={{
        width: size, height: size, borderRadius: '50%',
        border: '3px solid var(--primary-light)',
        borderTopColor: 'var(--primary)',
        animation: 'spin 0.8s linear infinite',
      }} />
      {text && (
        <p style={{ fontSize: 'var(--text-sm)', color: 'var(--text-secondary)', fontWeight: 500 }}>
          {text}
        </p>
      )}
    </div>
  );

  if (fullPage) {
    return (
      <div style={{
        display: 'flex', justifyContent: 'center', alignItems: 'center',
        minHeight: 'calc(100vh - 60px)', background: 'var(--bg-page)',
      }}>
        {spinner}
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '60vh' }}>
      {spinner}
    </div>
  );
}
