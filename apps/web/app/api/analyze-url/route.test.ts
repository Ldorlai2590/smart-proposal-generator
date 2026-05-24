/**
 * Unit tests for POST /api/analyze-url
 *
 * Mocks:
 *  - @/lib/auth       → requireAuth
 *  - ai               → generateObject
 *  - global fetch     → page content retrieval
 *  - @/lib/logger     → silences log output
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'

// ---------------------------------------------------------------------------
// Module mocks — declared before any imports so Vitest hoists them correctly
// ---------------------------------------------------------------------------

vi.mock('@/lib/auth', () => ({
  requireAuth: vi.fn(),
}))

vi.mock('ai', () => ({
  generateObject: vi.fn(),
  jsonSchema: vi.fn((schema: unknown) => schema),
  // Error subclasses used in the route's catch block — must be present so
  // .isInstance() calls don't throw "no export defined" at runtime.
  APICallError: { isInstance: vi.fn(() => false) },
  NoObjectGeneratedError: { isInstance: vi.fn(() => false) },
  TypeValidationError: { isInstance: vi.fn(() => false) },
}))

vi.mock('@ai-sdk/anthropic', () => ({
  anthropic: vi.fn(() => 'mock-anthropic-model'),
}))

vi.mock('@/lib/rate-limit', () => ({
  checkLimit: vi.fn(() => ({ allowed: true, retryAfter: 0, resetAt: new Date() })),
  getClientIp: vi.fn(() => '127.0.0.1'),
}))

vi.mock('@/lib/logger', () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    child: vi.fn().mockReturnThis(),
    withRequestId: vi.fn().mockReturnThis(),
  },
  withRequestId: vi.fn().mockReturnValue({
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    child: vi.fn().mockReturnThis(),
    withRequestId: vi.fn().mockReturnThis(),
  }),
}))

// ---------------------------------------------------------------------------
// Imports (after mocks)
// ---------------------------------------------------------------------------
import { POST } from './route'
import { requireAuth } from '@/lib/auth'
import { generateObject } from 'ai'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const FAKE_AUTH = { userId: 'user-1', tenantId: 'tenant-1', email: 'test@test.com' }

const FAKE_ANALYSIS = {
  business_model: 'SaaS B2B',
  value_proposition: 'Automatiza propuestas con IA',
  target_audience: 'PYMEs LATAM',
  key_differentiators: ['Velocidad', 'Personalización'],
  pain_points: ['Propuestas manuales lentas', 'Sin personalización'],
  opportunities: ['Escalar ventas', 'Integrar CRM'],
  communication_tone: 'formal' as const,
  executive_summary: 'Empresa de software que automatiza propuestas B2B.',
}

function makeRequest(body: unknown): Request {
  return new Request('http://localhost/api/analyze-url', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
}

function mockFetchSuccess(html: string = '<html><body>Company info</body></html>') {
  vi.stubGlobal('fetch', vi.fn().mockResolvedValueOnce({
    ok: true,
    status: 200,
    headers: { get: (h: string) => h === 'content-type' ? 'text/html; charset=utf-8' : null },
    text: async () => html,
  }))
}

function mockFetchFailure(message = 'Network error') {
  vi.stubGlobal('fetch', vi.fn().mockRejectedValueOnce(new Error(message)))
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('POST /api/analyze-url', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    // Default: authenticated
    vi.mocked(requireAuth).mockResolvedValue(FAKE_AUTH)
  })

  // -------------------------------------------------------------------------
  // Auth
  // -------------------------------------------------------------------------

  it('returns 401 when not authenticated', async () => {
    vi.mocked(requireAuth).mockRejectedValueOnce(new Error('Unauthenticated'))

    const res = await POST(makeRequest({ url: 'https://example.com' }))

    expect(res.status).toBe(401)
  })

  // -------------------------------------------------------------------------
  // URL validation — 400 cases
  // -------------------------------------------------------------------------

  it('returns 400 when url field is missing', async () => {
    const res = await POST(makeRequest({}))

    expect(res.status).toBe(400)
    const body = await res.json()
    expect(body.error).toBe('invalid_request')
  })

  it('returns 400 when url has no protocol', async () => {
    // e.g. "example.com" — zod url() validator requires a valid URL
    const res = await POST(makeRequest({ url: 'example.com' }))

    expect(res.status).toBe(400)
    const body = await res.json()
    expect(body.error).toBe('invalid_request')
  })

  it('returns 400 for private IP 192.168.1.1', async () => {
    const res = await POST(makeRequest({ url: 'http://192.168.1.1' }))

    expect(res.status).toBe(400)
    const body = await res.json()
    expect(body.error).toBe('host_not_allowed')
  })

  it('returns 400 for localhost', async () => {
    const res = await POST(makeRequest({ url: 'http://localhost/admin' }))

    expect(res.status).toBe(400)
    const body = await res.json()
    expect(body.error).toBe('host_not_allowed')
  })

  it('returns 400 for 127.0.0.1', async () => {
    const res = await POST(makeRequest({ url: 'http://127.0.0.1:8080' }))

    expect(res.status).toBe(400)
    const body = await res.json()
    expect(body.error).toBe('host_not_allowed')
  })

  it('returns 400 for 10.0.0.1 (private range)', async () => {
    const res = await POST(makeRequest({ url: 'http://10.0.0.1' }))

    expect(res.status).toBe(400)
    const body = await res.json()
    expect(body.error).toBe('host_not_allowed')
  })

  it('returns 400 for 169.254.1.1 (link-local)', async () => {
    const res = await POST(makeRequest({ url: 'http://169.254.1.1' }))

    expect(res.status).toBe(400)
    const body = await res.json()
    expect(body.error).toBe('host_not_allowed')
  })

  it('returns 400 when protocol is file://', async () => {
    // zod url() may accept file:// — the protocol guard must block it
    const res = await POST(makeRequest({ url: 'file:///etc/passwd' }))

    // Could be invalid_request (zod) or protocol_not_allowed — either is a 400
    expect(res.status).toBe(400)
    const body = await res.json()
    expect(['invalid_request', 'protocol_not_allowed', 'invalid_url']).toContain(body.error)
  })

  // -------------------------------------------------------------------------
  // Fetch failures — 422
  // -------------------------------------------------------------------------

  it('returns 422 when fetching the URL fails with a network error', async () => {
    mockFetchFailure('ECONNREFUSED')

    const res = await POST(makeRequest({ url: 'https://down.example.com' }))

    expect(res.status).toBe(422)
    const body = await res.json()
    expect(body.error).toBe('fetch_failed')
    expect(body.message).toBeTruthy()
  })

  it('returns 422 when the remote server returns a non-ok status', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValueOnce({
      ok: false,
      status: 404,
      headers: { get: () => null },
      text: async () => 'Not Found',
    }))

    const res = await POST(makeRequest({ url: 'https://example.com/404' }))

    expect(res.status).toBe(422)
    const body = await res.json()
    expect(body.error).toBe('fetch_failed')
  })

  // -------------------------------------------------------------------------
  // Happy path — 200
  // -------------------------------------------------------------------------

  it('returns 200 with analysis object on success', async () => {
    mockFetchSuccess('<html><body><h1>Acme Corp</h1><p>We build software.</p></body></html>')
    vi.mocked(generateObject).mockResolvedValueOnce({ object: FAKE_ANALYSIS } as never)

    const res = await POST(makeRequest({
      url: 'https://acme.com',
      company: 'Acme Corp',
      industry: 'Tecnología',
    }))

    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.business_model).toBe(FAKE_ANALYSIS.business_model)
    expect(body.executive_summary).toBe(FAKE_ANALYSIS.executive_summary)
    expect(Array.isArray(body.key_differentiators)).toBe(true)
    expect(Array.isArray(body.opportunities)).toBe(true)
  })

  it('calls generateObject with the page content stripped of HTML tags', async () => {
    const htmlWithScript = `
      <html>
        <head><script>alert('xss')</script><style>body{color:red}</style></head>
        <body><p>Real content</p></body>
      </html>
    `
    mockFetchSuccess(htmlWithScript)
    vi.mocked(generateObject).mockResolvedValueOnce({ object: FAKE_ANALYSIS } as never)

    await POST(makeRequest({ url: 'https://example.com' }))

    const callArg = vi.mocked(generateObject).mock.calls[0][0] as { prompt: string }
    // script and style content should not appear in the prompt
    expect(callArg.prompt).not.toContain("alert('xss')")
    expect(callArg.prompt).not.toContain('body{color:red}')
    // real text content should be present
    expect(callArg.prompt).toContain('Real content')
  })

  it('works when optional company and industry are omitted', async () => {
    mockFetchSuccess('<html><body>Hello world</body></html>')
    vi.mocked(generateObject).mockResolvedValueOnce({ object: FAKE_ANALYSIS } as never)

    const res = await POST(makeRequest({ url: 'https://minimal.example.com' }))

    expect(res.status).toBe(200)
  })

  // -------------------------------------------------------------------------
  // AI failure — 502
  // -------------------------------------------------------------------------

  it('returns 502 when AI analysis throws', async () => {
    mockFetchSuccess()
    vi.mocked(generateObject).mockRejectedValueOnce(new Error('Anthropic overloaded'))

    const res = await POST(makeRequest({ url: 'https://example.com' }))

    expect(res.status).toBe(502)
    const body = await res.json()
    expect(body.error).toBe('analysis_failed')
  })
})
