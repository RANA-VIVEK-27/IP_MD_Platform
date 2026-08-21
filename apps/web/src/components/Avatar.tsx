import React from 'react';

interface AvatarProps {
  name: string;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

function getInitials(name: string): string {
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() || '')
    .join('');
}

export function Avatar({ name, size = 'md', className = '' }: AvatarProps) {
  return (
    <div className={`avatar avatar-${size} ${className}`} title={name} aria-label={name}>
      {getInitials(name)}
    </div>
  );
}
