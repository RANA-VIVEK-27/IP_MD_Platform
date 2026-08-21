import React from 'react';
import { IconFileText, IconShieldCheck, IconAlertCircle } from './Icons';

type EmptyIcon = 'prescription' | 'shield' | 'info';

interface EmptyStateProps {
  icon?: EmptyIcon;
  title: string;
  description: string;
  action?: React.ReactNode;
}

const iconComponents: Record<EmptyIcon, React.ReactNode> = {
  prescription: <IconFileText size={28} />,
  shield: <IconShieldCheck size={28} />,
  info: <IconAlertCircle size={28} />,
};

export function EmptyState({ icon = 'prescription', title, description, action }: EmptyStateProps) {
  return (
    <div className="empty-state">
      <div className="empty-state-icon">
        {iconComponents[icon]}
      </div>
      <h3>{title}</h3>
      <p>{description}</p>
      {action}
    </div>
  );
}
