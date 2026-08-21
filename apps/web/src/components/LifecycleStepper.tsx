import React from 'react';
import { IconCheckCircle } from './Icons';

interface Step {
  id: string;
  label: string;
}

interface LifecycleStepperProps {
  steps: Step[];
  currentStepId: string;
  isFailed?: boolean;
}

export function LifecycleStepper({ steps, currentStepId, isFailed }: LifecycleStepperProps) {
  const currentIndex = steps.findIndex((s) => s.id === currentStepId);

  return (
    <div style={{ display: 'flex', alignItems: 'flex-start', width: '100%', padding: 'var(--sp-2) 0' }} role="progressbar" aria-valuenow={currentIndex + 1} aria-valuemin={1} aria-valuemax={steps.length}>
      {steps.map((step, idx) => {
        const isCompleted = idx < currentIndex;
        const isCurrent = idx === currentIndex;

        let dotBg = 'var(--border)';
        let textColor = 'var(--text-muted)';

        if (isCompleted) {
          dotBg = 'var(--success)';
          textColor = 'var(--text-primary)';
        } else if (isCurrent) {
          dotBg = isFailed ? 'var(--danger)' : 'var(--primary)';
          textColor = isFailed ? 'var(--danger)' : 'var(--primary)';
        }

        return (
          <React.Fragment key={step.id}>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px', flex: 1, minWidth: 0 }}>
              <div
                style={{
                  width: '28px',
                  height: '28px',
                  borderRadius: '50%',
                  backgroundColor: dotBg,
                  color: '#ffffff',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '12px',
                  fontWeight: 600,
                  transition: 'background-color 200ms ease-out',
                }}
                aria-hidden="true"
              >
                {isCompleted ? <IconCheckCircle size={16} /> : idx + 1}
              </div>
              <span
                style={{
                  fontSize: '11px',
                  fontWeight: isCurrent ? 600 : 400,
                  color: textColor,
                  textAlign: 'center',
                  lineHeight: 1.3,
                  maxWidth: '80px',
                }}
              >
                {step.label}
              </span>
            </div>
            {idx < steps.length - 1 && (
              <div
                style={{
                  flex: 1,
                  height: '2px',
                  backgroundColor: idx < currentIndex ? 'var(--success)' : 'var(--border)',
                  margin: '0 4px',
                  marginTop: '13px',
                  transition: 'background-color 200ms ease-out',
                }}
                aria-hidden="true"
              />
            )}
          </React.Fragment>
        );
      })}
    </div>
  );
}
