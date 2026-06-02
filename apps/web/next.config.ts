import type { NextConfig } from 'next'

/**
 * Content Security Policy.
 *
 * Next.js (App Router) needs:
 *  - 'unsafe-inline' for style-src (runtime style injection by React + Tailwind JIT)
 *  - 'unsafe-inline' for script-src (inline bootstrap scripts for hydration +
 *    framer-motion dynamic styles). Without this, the page ships but client JS
 *    never hydrates and components stuck at initial opacity:0 stay invisible.
 *  - 'unsafe-eval' in dev for Turbopack HMR; NOT needed in production.
 *
 * Future hardening: migrate to nonce-based CSP (middleware generates nonce per
 * request, Next.js inlines it into script tags via generateMetadata + headers).
 * That would let us drop 'unsafe-inline' on script-src.
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
      ? "'self' 'unsafe-inline'"
      : "'self' 'unsafe-eval' 'unsafe-inline'",
  ],
  // Anthropic API se llama solo server-side vía AI SDK; no permitimos
  // requests directos desde el cliente para prevenir leak de keys.
  ['connect-src', "'self' https://*.supabase.co wss://*.supabase.co"],
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
  serverExternalPackages: ['puppeteer-core', '@sparticuz/chromium-min'],
  // No exponer "Next.js" en X-Powered-By
  poweredByHeader: false,
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
