'use client'

import { AlertTriangle, RotateCcw } from 'lucide-react'

import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { Container } from '@/components/ui/Container'

export default function ErrorPage({ reset }: { reset: () => void }) {
  return (
    <Container as="main" width="panel" className="flex min-h-[60vh] items-center justify-center py-12">
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
      </Card>
    </Container>
  )
}
