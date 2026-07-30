import { ArrowLeft } from 'lucide-react'
import Link from 'next/link'

import { buttonClasses } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { Container } from '@/components/ui/Container'

export default function NotFound() {
  return (
    <Container as="main" width="panel" className="flex min-h-[60vh] items-center justify-center py-12">
      <Card elevation="overlay" className="w-full p-8 text-center">
        <p className="tabular text-display font-bold text-text-muted">404</p>
        <h1 className="mt-3 text-xl font-semibold text-text-primary">Page not found</h1>
        <p className="mt-2 text-sm text-text-secondary">
          The page you are looking for does not exist.
        </p>

        {/* `next/link` rather than `LinkButton`: this is internal navigation, so
            it should stay client-side and prefetched. */}
        <Link href="/" className={buttonClasses({ className: 'mt-6' })}>
          <ArrowLeft className="h-4 w-4" aria-hidden="true" />
          Back to home
        </Link>
      </Card>
    </Container>
  )
}
