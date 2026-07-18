import React from 'react';

interface BadgeProps {
  label: string;
  status: 'pass' | 'fail' | 'warn' | 'info';
}

export function Badge({ label, status }: BadgeProps) {
  return (
    <span data-testid="shared-badge" className={`badge-${status}`}>
      {label}
    </span>
  );
}
