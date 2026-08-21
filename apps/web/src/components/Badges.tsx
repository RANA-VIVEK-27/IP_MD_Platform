import React from 'react';
import { IconShieldCheck, IconAlertTriangle, IconSparkles, IconAlertCircle, IconCheckCircle } from './Icons';

interface StatusBadgeProps {
  status: string;
}

const statusConfig: Record<string, { className: string; prefix?: React.ReactNode }> = {
  active: { className: 'badge-success', prefix: <IconCheckCircle size={12} /> },
  approved: { className: 'badge-success', prefix: <IconCheckCircle size={12} /> },
  doctor_verified: { className: 'badge-success', prefix: <IconShieldCheck size={12} /> },
  delivered: { className: 'badge-success', prefix: <IconCheckCircle size={12} /> },
  captured: { className: 'badge-success', prefix: <IconCheckCircle size={12} /> },
  settled: { className: 'badge-success', prefix: <IconCheckCircle size={12} /> },
  pending: { className: 'badge-warning', prefix: <IconAlertCircle size={12} /> },
  pending_review: { className: 'badge-warning', prefix: <IconAlertCircle size={12} /> },
  pending_activation: { className: 'badge-warning', prefix: <IconAlertCircle size={12} /> },
  processing: { className: 'badge-warning', prefix: <IconAlertCircle size={12} /> },
  needs_review: { className: 'badge-warning', prefix: <IconAlertTriangle size={12} /> },
  placed: { className: 'badge-info', prefix: <IconAlertCircle size={12} /> },
  dispatched: { className: 'badge-info', prefix: <IconAlertCircle size={12} /> },
  suspended: { className: 'badge-danger', prefix: <IconAlertTriangle size={12} /> },
  rejected: { className: 'badge-danger', prefix: <IconAlertTriangle size={12} /> },
  failed: { className: 'badge-danger', prefix: <IconAlertTriangle size={12} /> },
  cancelled: { className: 'badge-danger', prefix: <IconAlertTriangle size={12} /> },
  delisted: { className: 'badge-danger', prefix: <IconAlertTriangle size={12} /> },
};

export function StatusBadge({ status }: StatusBadgeProps) {
  const config = statusConfig[status.toLowerCase()];
  if (config) {
    return (
      <span className={`badge ${config.className}`} role="status">
        {config.prefix}
        {status.replace(/_/g, ' ')}
      </span>
    );
  }
  return <span className="badge badge-neutral" role="status">{status.replace(/_/g, ' ')}</span>;
}

interface ScheduleBadgeProps {
  schedule: 'otc' | 'h' | 'h1' | 'x' | string;
}

export function ScheduleBadge({ schedule }: ScheduleBadgeProps) {
  const sched = schedule.toLowerCase();
  switch (sched) {
    case 'otc':
      return <span className="badge sched-badge-otc">OTC</span>;
    case 'h':
      return <span className="badge sched-badge-h">Schedule H</span>;
    case 'h1':
      return <span className="badge sched-badge-h1">Schedule H1</span>;
    case 'x':
      return <span className="badge sched-badge-x">Schedule X</span>;
    default:
      return <span className="badge badge-neutral">{schedule}</span>;
  }
}

interface ConfidenceIndicatorProps {
  score: number;
  showBar?: boolean;
}

export function ConfidenceIndicator({ score, showBar = false }: ConfidenceIndicatorProps) {
  const pct = Math.round(score > 1 ? score : score * 100);
  let level: 'high' | 'medium' | 'low';
  let className: string;

  if (pct >= 85) {
    level = 'high';
    className = 'badge-success';
  } else if (pct >= 60) {
    level = 'medium';
    className = 'badge-warning';
  } else {
    level = 'low';
    className = 'badge-danger';
  }

  return (
    <div className="flex items-center gap-2">
      <span className={`badge ${className}`} title={`Confidence score: ${pct}%`}>
        {pct}%
      </span>
      {showBar && (
        <div className="confidence-bar">
          <div className="confidence-bar-track">
            <div
              className={`confidence-bar-fill ${level}`}
              style={{ width: `${pct}%` }}
            />
          </div>
        </div>
      )}
    </div>
  );
}

export function AIDisclosureBanner() {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 'var(--sp-2)',
        padding: 'var(--sp-2) var(--sp-3)',
        background: 'var(--info-bg)',
        color: 'var(--info)',
        borderRadius: 'var(--radius-md)',
        fontSize: 'var(--text-xs)',
        fontWeight: 500,
      }}
      role="note"
      aria-label="AI disclosure"
    >
      <IconSparkles size={14} />
      <span>AI-generated extraction — informational only, not a medical diagnosis</span>
    </div>
  );
}

interface ComplianceGateBannerProps {
  itemNames: string[];
}

export function ComplianceGateBanner({ itemNames }: ComplianceGateBannerProps) {
  return (
    <div
      style={{
        background: 'var(--danger-bg)',
        border: '1px solid var(--danger-border)',
        borderRadius: 'var(--radius-lg)',
        padding: 'var(--sp-4)',
        display: 'flex',
        alignItems: 'flex-start',
        gap: 'var(--sp-3)',
      }}
      role="alert"
    >
      <IconAlertTriangle size={20} style={{ color: 'var(--danger)', flexShrink: 0, marginTop: '2px' }} />
      <div>
        <h4 style={{ fontSize: 'var(--text-sm)', fontWeight: 600, color: 'var(--danger)', marginBottom: 'var(--sp-1)' }}>
          Prescription Required — Regulatory Compliance Gate
        </h4>
        <p style={{ fontSize: 'var(--text-sm)', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
          Checkout is locked for <strong>{itemNames.join(', ')}</strong> under the Drugs & Cosmetics Act.
          A doctor-verified prescription linkage is mandatory to dispense these regulated items.
        </p>
      </div>
    </div>
  );
}
