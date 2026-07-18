import Link from 'next/link'

export default function NotFound() {
  return (
    <main className="mx-auto flex min-h-screen max-w-3xl items-center justify-center px-4 py-12">
      <div className="rounded-lg border border-card-border bg-card p-8 text-center">
        <h1 className="text-2xl font-semibold text-text-primary">Page not found</h1>
        <p className="mt-3 text-text-muted">The requested page does not exist yet.</p>
        <Link href="/" className="mt-6 inline-flex rounded-md border border-violet px-4 py-2 text-sm text-violet">
          Back to home
        </Link>
      </div>
    </main>
  )
}
