import React from 'react';

interface KPICardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  isWarning?: boolean;
  isDanger?: boolean;
  icon?: React.ReactNode;
  trend?: 'up' | 'down' | 'neutral';
  trendValue?: string;
}

export function KPICard({ title, value, subtitle, isWarning, isDanger, icon, trend, trendValue }: KPICardProps) {
  let valueColor = 'var(--text-primary)';
  let borderColor = 'var(--border-light)';

  if (isDanger) {
    valueColor = 'var(--danger)';
    borderColor = 'var(--danger)';
  } else if (isWarning) {
    valueColor = 'var(--warning)';
    borderColor = 'var(--warning)';
  }

  return (
    <div className="card" style={{ borderTop: `3px solid ${borderColor}`, padding: 'var(--sp-5)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 'var(--sp-3)' }}>
        <span className="text-overline">{title}</span>
        {icon && (
          <div style={{ color: isDanger ? 'var(--danger)' : isWarning ? 'var(--warning)' : 'var(--primary)', opacity: 0.7 }}>
            {icon}
          </div>
        )}
      </div>
      <div
        className="tabular-nums"
        style={{
          fontSize: 'var(--text-3xl)',
          fontWeight: 700,
          color: valueColor,
          lineHeight: 1.1,
          letterSpacing: '-0.03em',
          marginBottom: 'var(--sp-1)',
        }}
      >
        {value}
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--sp-2)', flexWrap: 'wrap' }}>
        {subtitle && <span className="text-caption">{subtitle}</span>}
        {trend && trendValue && (
          <span
            style={{
              fontSize: 'var(--text-xs)',
              fontWeight: 600,
              color: trend === 'up' ? 'var(--success)' : trend === 'down' ? 'var(--danger)' : 'var(--text-muted)',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '2px',
            }}
          >
            {trend === 'up' ? '↑' : trend === 'down' ? '↓' : '→'} {trendValue}
          </span>
        )}
      </div>
    </div>
  );
}
