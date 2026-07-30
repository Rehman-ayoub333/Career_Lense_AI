import { NextResponse } from 'next/server'

import { getProvider } from '@/lib/ai'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/**
 * Liveness and readiness probe.
 *
 * Reports whether the AI provider is *configured*, which is the one failure mode
 * that silently breaks every feature after a deploy with a missing environment
 * variable. It deliberately does not call the provider: a health check that
 * consumes model quota is a health check that causes outages.
 *
 * The provider's identity is not disclosed — only whether the app is ready.
 */
export async function GET() {
  let ready = false

  try {
    getProvider()
    ready = true
  } catch {
    ready = false
  }

  return NextResponse.json(
    {
      status: ready ? 'ok' : 'degraded',
      ready,
      timestamp: new Date().toISOString(),
    },
    {
      status: ready ? 200 : 503,
      headers: { 'Cache-Control': 'no-store' },
    }
  )
}
