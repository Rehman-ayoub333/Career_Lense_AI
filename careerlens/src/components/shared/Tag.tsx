import React from 'react';

interface TagProps {
  label: string;
  variant?: 'green' | 'red' | 'amber' | 'blue' | 'default';
}

export function Tag({ label, variant = 'default' }: TagProps) {
  return (
    <span data-testid="shared-tag" className={`tag-${variant}`}>
      {label}
    </span>
  );
}
