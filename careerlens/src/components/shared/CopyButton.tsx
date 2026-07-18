import React from 'react';

interface CopyButtonProps {
  textToCopy: string;
}

export function CopyButton({ textToCopy }: CopyButtonProps) {
  return (
    <button data-testid="shared-copy-button" type="button">
      Copy
    </button>
  );
}
