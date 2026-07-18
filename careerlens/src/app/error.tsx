'use client'

export default function ErrorPage({ reset }: { reset: () => void }) {
  return (
    <main className="mx-auto flex min-h-screen max-w-3xl items-center justify-center px-4 py-12">
      <div className="rounded-lg border border-red bg-card p-8 text-center">
        <h1 className="text-2xl font-semibold text-text-primary">Something went wrong</h1>
        <p className="mt-3 text-text-muted">An unexpected error occurred while loading this page.</p>
        <button
          type="button"
          onClick={() => reset()}
          className="mt-6 rounded-md border border-violet px-4 py-2 text-sm text-violet"
        >
          Try again
        </button>
      </div>
    </main>
  )
}
