import React from 'react';

interface EmptyStateProps {
  message: string;
}

export function EmptyState({ message }: EmptyStateProps) {
  return (
    <div data-testid="shared-empty-state">
      <p>{message}</p>
    </div>
  );
}
