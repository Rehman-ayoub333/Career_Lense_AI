import React from 'react';

interface ProgressBarProps {
  value: number;
  label?: string;
}

export function ProgressBar({ value, label }: ProgressBarProps) {
  return (
    <div data-testid="shared-progress-bar">
      {label && <span>{label}</span>}
      <div>{value}%</div>
    </div>
  );
}
