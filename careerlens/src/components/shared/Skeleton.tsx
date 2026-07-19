import React from 'react';

export function ScoreGaugeSkeleton() {
  return (
    <div className="flex flex-col items-center gap-4 p-6">
      <div className="w-44 h-22 rounded-full bg-card animate-skeleton" />
      <div className="w-16 h-8 rounded bg-card animate-skeleton" />
      <div className="w-24 h-4 rounded bg-card animate-skeleton" />
    </div>
  );
}

export function SkillTagsSkeleton() {
  return (
    <div className="flex flex-wrap gap-2">
      {Array.from({ length: 8 }).map((_, i) => (
        <div
          key={i}
          className="h-6 rounded-full bg-card animate-skeleton"
          style={{ width: `${60 + i * 12}px` }}
        />
      ))}
    </div>
  );
}

export function ATSCheckSkeleton() {
  return (
    <div className="flex flex-col gap-2">
      {Array.from({ length: 8 }).map((_, i) => (
        <div key={i} className="h-10 rounded bg-card animate-skeleton" />
      ))}
    </div>
  );
}
