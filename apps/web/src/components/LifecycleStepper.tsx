import React from 'react';
import { IconCheckCircle, IconClock } from './Icons';

export interface Step {
  id: string;
  label: string;
  sublabel?: string;
  icon?: React.ReactNode;
}

interface LifecycleStepperProps {
  steps: Step[];
  currentStepId: string;
  isFailed?: boolean;
}

export function LifecycleStepper({ steps, currentStepId, isFailed }: LifecycleStepperProps) {
  const currentIndex = steps.findIndex((s) => s.id === currentStepId);

  return (
    <div
      style={{
        width: '100%',
        padding: 'var(--sp-2) 0',
      }}
      role="progressbar"
      aria-valuenow={currentIndex >= 0 ? currentIndex + 1 : 1}
      aria-valuemin={1}
      aria-valuemax={steps.length}
    >
      <div style={{ display: 'flex', alignItems: 'flex-start', width: '100%', position: 'relative' }}>
        {steps.map((step, idx) => {
          const isCompleted = idx < currentIndex;
          const isCurrent = idx === currentIndex;
          const isPending = idx > currentIndex;

          let dotBg = 'var(--bg-muted)';
          let dotBorder = '2px solid var(--border)';
          let dotColor = 'var(--text-muted)';
          let labelColor = 'var(--text-secondary)';
          let labelWeight = 500;

          if (isCompleted) {
            dotBg = 'var(--success)';
            dotBorder = '2px solid var(--success)';
            dotColor = '#ffffff';
            labelColor = 'var(--text-primary)';
            labelWeight = 600;
          } else if (isCurrent) {
            dotBg = isFailed ? 'var(--danger)' : 'var(--primary)';
            dotBorder = isFailed ? '2px solid var(--danger)' : '2px solid var(--primary)';
            dotColor = '#ffffff';
            labelColor = isFailed ? 'var(--danger)' : 'var(--primary)';
            labelWeight = 700;
          }

          return (
            <div
              key={step.id}
              style={{
                flex: 1,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                position: 'relative',
                zIndex: 1,
              }}
            >
              {/* Connector Line before step (except first) */}
              {idx > 0 && (
                <div
                  style={{
                    position: 'absolute',
                    top: '14px',
                    right: '50%',
                    left: '-50%',
                    height: '3px',
                    backgroundColor: idx <= currentIndex ? 'var(--success)' : 'var(--border-light)',
                    zIndex: -1,
                    transition: 'background-color 200ms ease',
                    borderRadius: '2px',
                  }}
                  aria-hidden="true"
                />
              )}

              {/* Node Circle */}
              <div
                style={{
                  width: '28px',
                  height: '28px',
                  borderRadius: '50%',
                  backgroundColor: dotBg,
                  border: dotBorder,
                  color: dotColor,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '11px',
                  fontWeight: 700,
                  boxShadow: isCurrent
                    ? (isFailed ? '0 0 0 4px var(--danger-glow)' : '0 0 0 4px var(--primary-100)')
                    : (isCompleted ? '0 2px 4px rgba(24, 155, 106, 0.15)' : 'none'),
                  transition: 'all 200ms ease',
                }}
                aria-hidden="true"
              >
                {isCompleted ? (
                  <IconCheckCircle size={15} style={{ strokeWidth: 2.2 }} />
                ) : isCurrent ? (
                  idx + 1
                ) : (
                  <span style={{ color: 'var(--text-muted)', fontSize: '11px' }}>{idx + 1}</span>
                )}
              </div>

              {/* Label */}
              <div style={{ textAlign: 'center', marginTop: '6px' }}>
                <span
                  style={{
                    fontSize: 'var(--text-xs)',
                    fontWeight: labelWeight,
                    color: labelColor,
                    display: 'block',
                    lineHeight: 1.3,
                  }}
                >
                  {step.label}
                </span>
                {step.sublabel && (
                  <span style={{ fontSize: '10px', color: 'var(--text-muted)', display: 'block', marginTop: '2px' }}>
                    {step.sublabel}
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

