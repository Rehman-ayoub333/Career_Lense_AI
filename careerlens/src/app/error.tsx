'use client'

import { AlertTriangle, RotateCcw } from 'lucide-react'
import { useEffect } from 'react'

import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { Container } from '@/components/ui/Container'
import { logger } from '@/lib/logger'

/**
 * Route-level error boundary.
 *
 * The `error` prop was previously not even destructured, so a failure that
 * reached this boundary was rendered and then forgotten — nothing recorded what
 * had actually gone wrong.
 *
 * Two disciplines apply here, and they pull in opposite directions:
 *   - the operator needs detail, so the error goes through `logger`, which owns
 *     the redaction rules; this module never touches `console` itself
 *   - the visitor gets user-safe copy only, the same `publicMessage`-only rule
 *     the API's error serialisation follows — `error.message` is never rendered,
 *     because in a production build it is a minified internal string at best and
 *     an information leak at worst
 *
 * `digest` is the exception, and deliberately so: Next replaces the real message
 * with an opaque hash in production precisely so it *can* be shown. It carries no
 * detail on its own and is the only thing that lets a visitor's report be
 * correlated with the server log entry — the same job `requestId` does for a
 * failed API response.
 */

// `Container as="div"`: `layout.tsx` already renders the page's one `<main>`,
// and this boundary renders inside it.
export default function ErrorPage({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    logger.error('Unhandled client error reached the route error boundary', {
      digest: error.digest,
      error,
    })
  }, [error])

  return (
    <Container as="div" width="panel" className="flex min-h-[60vh] items-center justify-center py-12">
      <Card elevation="overlay" className="w-full p-8 text-center">
        <div className="mx-auto mb-4 inline-flex rounded-full bg-[hsl(var(--red)/0.12)] p-3">
          <AlertTriangle className="h-8 w-8 text-red-text" strokeWidth={1.5} aria-hidden="true" />
        </div>

        <h1 className="text-xl font-semibold text-text-primary">Something went wrong</h1>
        <p className="mt-2 text-sm text-text-secondary">
          An unexpected error occurred. Please try again.
        </p>

        <Button className="mt-6" onClick={() => reset()}>
          <RotateCcw className="h-4 w-4" aria-hidden="true" />
          Try again
        </Button>

        {error.digest ? (
          <p className="mt-6 font-mono text-xs text-text-muted">
            Reference <span className="text-text-secondary">{error.digest}</span>
          </p>
        ) : null}
      </Card>
    </Container>
  )
}
