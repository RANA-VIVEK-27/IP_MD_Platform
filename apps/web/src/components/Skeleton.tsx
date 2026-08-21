import React from 'react';

interface SkeletonProps {
  className?: string;
  style?: React.CSSProperties;
}

export function Skeleton({ className = '', style }: SkeletonProps) {
  return <div className={`skeleton ${className}`} style={style} aria-hidden="true" />;
}

export function SkeletonText({ width, lines = 1 }: { width?: string; lines?: number }) {
  return (
    <div aria-hidden="true">
      {Array.from({ length: lines }).map((_, i) => (
        <div
          key={i}
          className="skeleton skeleton-text"
          style={{ width: i === lines - 1 ? '70%' : (width || '100%') }}
        />
      ))}
    </div>
  );
}

export function SkeletonCard() {
  return (
    <div className="card skeleton-card" aria-hidden="true">
      <div style={{ display: 'flex', gap: '16px', marginBottom: '16px' }}>
        <Skeleton className="skeleton-circle" style={{ width: 44, height: 44 }} />
        <div style={{ flex: 1 }}>
          <Skeleton className="skeleton-text" style={{ width: '50%', height: 16 }} />
          <Skeleton className="skeleton-text skeleton-text-sm" style={{ width: '30%' }} />
        </div>
      </div>
      <SkeletonText lines={2} />
    </div>
  );
}

export function SkeletonTable({ rows = 5, cols = 4 }: { rows?: number; cols?: number }) {
  return (
    <div className="card skeleton-card" aria-hidden="true">
      <div style={{ display: 'flex', gap: '16px', marginBottom: '20px' }}>
        {Array.from({ length: cols }).map((_, c) => (
          <Skeleton key={c} style={{ flex: c === 0 ? 2 : 1, height: 14 }} />
        ))}
      </div>
      {Array.from({ length: rows }).map((_, r) => (
        <div key={r} style={{ display: 'flex', gap: '16px', marginBottom: '16px' }}>
          {Array.from({ length: cols }).map((_, c) => (
            <Skeleton key={c} style={{ flex: c === 0 ? 2 : 1, height: 14 }} />
          ))}
        </div>
      ))}
    </div>
  );
}

export function SkeletonDashboard() {
  return (
    <div aria-hidden="true">
      <div className="grid-4" style={{ marginBottom: '24px' }}>
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="card skeleton-card">
            <Skeleton className="skeleton-text skeleton-text-sm" style={{ width: '40%', marginBottom: 12 }} />
            <Skeleton style={{ width: '60%', height: 28, marginBottom: 8 }} />
            <Skeleton className="skeleton-text skeleton-text-sm" style={{ width: '50%' }} />
          </div>
        ))}
      </div>
      <div className="card skeleton-card">
        <SkeletonText lines={4} />
      </div>
    </div>
  );
}
