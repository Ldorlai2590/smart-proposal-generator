import type { NextConfig } from 'next'

/**
 * Content Security Policy.
 *
 * Next.js (App Router) needs 'unsafe-inline' for style-src because of its runtime
 * style injection and for script-src only in dev (Turbopack). In production we allow
 * 'unsafe-inline' on style-src; script-src stays strict with 'self' plus the Anthropic
 * SDK origin (only used from the server in this app, but documented here for clarity).
 *
 * connect-src is broad enough for our Anthropic API calls and our own origin.
 * frame-ancestors 'none' duplicates X-Frame-Options: DENY for browsers that only
 * honor one or the other.
 */
const CSP_DIRECTIVES: Array<[string, string]> = [
  ['default-src', "'self'"],
  ['base-uri', "'self'"],
  ['form-action', "'self'"],
  ['frame-ancestors', "'none'"],
  ['object-src', "'none'"],
  ['img-src', "'self' data: blob: https:"],
  ['font-src', "'self' data:"],
  ['style-src', "'self' 'unsafe-inline'"],
  [
    'script-src',
    process.env.NODE_ENV === 'production'
      ? "'self'"
      : "'self' 'unsafe-eval' 'unsafe-inline'",
  ],
  ['connect-src', "'self' https://api.anthropic.com"],
  ['worker-src', "'self' blob:"],
  ['manifest-src', "'self'"],
  ['upgrade-insecure-requests', ''],
]

const CSP_VALUE = CSP_DIRECTIVES.map(([k, v]) => (v ? `${k} ${v}` : k)).join('; ')

const SECURITY_HEADERS = [
  { key: 'Content-Security-Policy', value: CSP_VALUE },
  { key: 'X-Frame-Options', value: 'DENY' },
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  {
    key: 'Strict-Transport-Security',
    value: 'max-age=63072000; includeSubDomains; preload',
  },
  {
    key: 'Permissions-Policy',
    value: 'camera=(), microphone=(), geolocation=()',
  },
]

const nextConfig: NextConfig = {
  output: 'standalone',
  transpilePackages: ['@repo/ui'],
  async headers() {
    return [
      {
        source: '/:path*',
        headers: SECURITY_HEADERS,
      },
    ]
  },
}

export default nextConfig
