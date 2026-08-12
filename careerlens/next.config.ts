import type { NextConfig } from 'next'

/**
 * Content Security Policy.
 *
 * The app loads no third-party scripts, styles, fonts, images or analytics, so the
 * policy can be close to `'self'` throughout — the strongest position available
 * without per-request nonces.
 *
 * `'unsafe-inline'` is required in two places and nowhere else:
 *   - `script-src`: the framework emits inline bootstrap and hydration scripts.
 *     Removing this needs a nonce issued by middleware on every request; that is
 *     a worthwhile follow-up, but it must be validated in a real browser before
 *     shipping, because a mismatched nonce breaks hydration silently.
 *   - `style-src`: `next/font` injects a style block, and the animation library
 *     writes inline `style` attributes on every animated element.
 *
 * `connect-src 'self'` matters most here: even if a prompt injection convinced the
 * page to attempt an outbound request with the user's CV, the browser would block it.
 *
 * `'unsafe-eval'` is added in development only. React's development build calls
 * `eval()` to reconstruct call stacks and drive other debugging features; without
 * the allowance every `next dev` session logs a CSP error and those features are
 * silently degraded. Production never needs it, so the allowance is gated on
 * NODE_ENV rather than granted unconditionally — the shipped policy is unchanged.
 */
const isDevelopment = process.env.NODE_ENV === 'development'

const CONTENT_SECURITY_POLICY = [
  "default-src 'self'",
  `script-src 'self' 'unsafe-inline'${isDevelopment ? " 'unsafe-eval'" : ''}`,
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob:",
  "font-src 'self' data:",
  "connect-src 'self'",
  "form-action 'self'",
  "base-uri 'self'",
  "object-src 'none'",
  "frame-ancestors 'none'",
  'upgrade-insecure-requests',
].join('; ')

const SECURITY_HEADERS = [
  { key: 'Content-Security-Policy', value: CONTENT_SECURITY_POLICY },
  // Clickjacking protection for browsers predating frame-ancestors.
  { key: 'X-Frame-Options', value: 'DENY' },
  // Stops the browser guessing a content type and executing an upload as script.
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  // Leak only the origin cross-site: a results URL should not travel to third parties.
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  // The app needs none of these; deny them so a compromised script cannot ask.
  {
    key: 'Permissions-Policy',
    value: 'camera=(), microphone=(), geolocation=(), payment=(), usb=(), interest-cohort=()',
  },
  // Two years, subdomains included, preload-eligible.
  { key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains; preload' },
  // Isolates the browsing context group, mitigating cross-origin side channels.
  { key: 'Cross-Origin-Opener-Policy', value: 'same-origin' },
  { key: 'Cross-Origin-Resource-Policy', value: 'same-origin' },
]

const nextConfig: NextConfig = {
  reactCompiler: true,

  /**
   * Removes `X-Powered-By: Next.js`. Naming the framework and, by extension, its
   * patch cadence hands an attacker a free reconnaissance step.
   */
  poweredByHeader: false,

  /**
   * `pdf-parse` ships CommonJS with dynamic requires and its own worker assets.
   * Bundling it produces a broken build; leaving it external keeps it a plain
   * runtime `require` in the serverless function.
   */
  serverExternalPackages: ['pdf-parse'],

  experimental: {
    /**
     * Rewrites barrel imports to deep paths so an icon import pulls in one icon
     * rather than the whole set.
     */
    optimizePackageImports: ['lucide-react'],
  },

  async headers() {
    return [
      {
        // Everything, including API routes and static assets.
        source: '/:path*',
        headers: SECURITY_HEADERS,
      },
    ]
  },
}

export default nextConfig
