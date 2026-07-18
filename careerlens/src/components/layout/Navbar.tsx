import React from 'react';

export function Navbar() {
  return (
    <nav className="sticky top-0 z-50 w-full border-b border-card-border bg-background/80 backdrop-blur">
      <div className="flex h-16 items-center px-4">
        <span className="font-bold text-text-primary">CareerLens AI 🎯</span>
      </div>
    </nav>
  );
}
