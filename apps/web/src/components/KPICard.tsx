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
  accentColor?: string;
  onClick?: () => void;
}

export function KPICard({ title, value, subtitle, isWarning, isDanger, icon, trend, trendValue, accentColor, onClick }: KPICardProps) {
  let valueColor = 'var(--text-heading)';
  let accent = accentColor || 'var(--primary)';
  let iconBg = 'var(--primary-light)';
  let iconColor = 'var(--primary)';

  if (isDanger) {
    valueColor = 'var(--danger)';
    accent = 'var(--danger)';
    iconBg = 'var(--danger-bg)';
    iconColor = 'var(--danger)';
  } else if (isWarning) {
    valueColor = 'var(--warning)';
    accent = 'var(--warning)';
    iconBg = 'var(--warning-bg)';
    iconColor = 'var(--warning)';
  }

  return (
    <div
      onClick={onClick}
      style={{
        background: 'var(--bg-surface)',
        border: '1px solid var(--border-light)',
        borderRadius: 'var(--radius-xl)',
        padding: 'var(--sp-5) var(--sp-6)',
        position: 'relative',
        overflow: 'hidden',
        cursor: onClick ? 'pointer' : 'default',
        transition: 'all 280ms cubic-bezier(0.16, 1, 0.3, 1)',
        boxShadow: 'var(--shadow-xs)',
      }}
      onMouseEnter={(e) => {
        if (onClick) {
          e.currentTarget.style.boxShadow = 'var(--shadow-card-hover)';
          e.currentTarget.style.transform = 'translateY(-2px)';
          e.currentTarget.style.borderColor = 'var(--border-accent)';
        }
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.boxShadow = 'var(--shadow-xs)';
        e.currentTarget.style.transform = 'translateY(0)';
        e.currentTarget.style.borderColor = 'var(--border-light)';
      }}
    >
      {/* Top accent line */}
      <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '3px', background: `linear-gradient(90deg, ${accent}, ${accent}88)`, borderRadius: 'var(--radius-xl) var(--radius-xl) 0 0' }} />

      {/* Content */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 'var(--sp-3)' }}>
        <span style={{ fontSize: 'var(--text-xs)', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
          {title}
        </span>
        {icon && (
          <div style={{
            width: '36px', height: '36px',
            borderRadius: 'var(--radius-md)',
            background: iconBg,
            color: iconColor,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            flexShrink: 0,
          }}>
            {icon}
          </div>
        )}
      </div>

      {/* Value */}
      <div
        className="tabular-nums"
        style={{
          fontSize: 'var(--text-3xl)',
          fontWeight: 800,
          color: valueColor,
          lineHeight: 1.1,
          letterSpacing: '-0.03em',
          marginBottom: 'var(--sp-1)',
        }}
      >
        {value}
      </div>

      {/* Subtitle + Trend */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--sp-2)', flexWrap: 'wrap' }}>
        {subtitle && (
          <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>{subtitle}</span>
        )}
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

      {/* Decorative corner element */}
      <div style={{
        position: 'absolute',
        bottom: '-8px',
        right: '-8px',
        width: '48px',
        height: '48px',
        borderRadius: '50%',
        background: `${accent}08`,
        pointerEvents: 'none',
      }} />
    </div>
  );
}
