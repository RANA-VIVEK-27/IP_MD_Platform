import React from 'react';

interface PageHeaderProps {
  title: string;
  subtitle?: string;
  action?: React.ReactNode;
  icon?: React.ReactNode;
  breadcrumbs?: { label: string; href?: string }[];
}

export function PageHeader({ title, subtitle, action, icon, breadcrumbs }: PageHeaderProps) {
  return (
    <div style={{ marginBottom: 'var(--sp-6)' }}>
      {/* Breadcrumbs */}
      {breadcrumbs && breadcrumbs.length > 0 && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--sp-2)', marginBottom: 'var(--sp-3)' }}>
          {breadcrumbs.map((bc, i) => (
            <React.Fragment key={i}>
              {i > 0 && <span style={{ color: 'var(--text-muted)', fontSize: 'var(--text-xs)' }}>/</span>}
              <span style={{
                fontSize: 'var(--text-xs)',
                fontWeight: 500,
                color: bc.href ? 'var(--primary)' : 'var(--text-muted)',
                cursor: bc.href ? 'pointer' : 'default',
              }}>
                {bc.label}
              </span>
            </React.Fragment>
          ))}
        </div>
      )}

      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 'var(--sp-4)', flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--sp-3)' }}>
          {icon && (
            <div style={{
              width: '40px', height: '40px',
              borderRadius: 'var(--radius-md)',
              background: 'var(--primary-light)',
              color: 'var(--primary)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              flexShrink: 0,
            }}>
              {icon}
            </div>
          )}
          <div>
            <h1 style={{ fontSize: 'var(--text-2xl)', fontWeight: 700, color: 'var(--text-heading)', letterSpacing: '-0.02em', lineHeight: 1.2, marginBottom: subtitle ? 'var(--sp-1)' : 0 }}>
              {title}
            </h1>
            {subtitle && (
              <p style={{ fontSize: 'var(--text-sm)', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                {subtitle}
              </p>
            )}
          </div>
        </div>
        {action && <div>{action}</div>}
      </div>
    </div>
  );
}
