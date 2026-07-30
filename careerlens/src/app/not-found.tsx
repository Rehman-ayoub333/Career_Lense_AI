import { ArrowLeft } from 'lucide-react'
import Link from 'next/link'

export default function NotFound() {
  return (
    <main className="mx-auto flex min-h-[60vh] max-w-md items-center justify-center px-4 py-12">
      <div className="w-full rounded-[var(--radius-lg)] border border-[hsl(var(--card-border))] bg-[hsl(var(--card))] p-8 text-center shadow-[var(--shadow-card)]">
        <div className="text-[72px] font-black leading-none text-text-subtle">404</div>
        <h1 className="mt-3 text-xl font-bold text-text-primary">Page not found</h1>
        <p className="mt-2 text-sm text-text-muted">The page you are looking for does not exist.</p>
        <Link
          href="/"
          className="mt-6 inline-flex items-center gap-2 rounded-full bg-[hsl(var(--violet))] px-6 py-2.5 text-sm font-semibold text-white transition-all duration-200 hover:shadow-[0_0_20px_hsl(var(--violet)/0.3)] active:scale-[0.98]"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to home
        </Link>
      </div>
    </main>
  )
}
