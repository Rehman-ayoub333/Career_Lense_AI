import React from 'react'

export function Footer() {
  return (
    <footer className="border-t border-[hsl(var(--card-border))] px-4 py-6 text-center text-sm text-text-muted">
      <div>Built by Rehman Ayoub · Pakistan · 2026</div>
      <div className="mt-1">Free forever. No VC funding. No paywalls.</div>
      <div className="mt-3 flex flex-wrap items-center justify-center gap-3 text-xs">
        <a href="https://github.com" className="hover:text-text-primary">GitHub</a>
        <a href="https://linkedin.com" className="hover:text-text-primary">LinkedIn</a>
        <a href="/privacy" className="hover:text-text-primary">Privacy Policy</a>
      </div>
    </footer>
  )
}
