import { describe, it, expect, vi, beforeEach } from 'vitest'

const mockFetch = vi.fn()
vi.stubGlobal('fetch', mockFetch)
vi.stubEnv('DECKLE_API_KEY', 'dk_live_test-key-123')

describe('PDF export via Deckle', () => {
  beforeEach(() => {
    mockFetch.mockReset()
    vi.resetModules()
  })

  it('calls Deckle API with HTML body and returns PDF binary', async () => {
    const fakePdfBytes = new Uint8Array([0x25, 0x50, 0x44, 0x46]) // %PDF magic bytes
    // First call: POST /v1/generate → returns URL
    mockFetch.mockResolvedValueOnce(
      new Response(JSON.stringify({ url: 'https://cdn.getdeckle.dev/pdfs/test.pdf' }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      })
    )
    // Second call: fetch PDF from URL
    mockFetch.mockResolvedValueOnce(
      new Response(fakePdfBytes.buffer, {
        status: 200,
        headers: { 'Content-Type': 'application/pdf' },
      })
    )

    const { generatePDFFromHTML } = await import('@/lib/pdf-docuforge')
    const result = await generatePDFFromHTML('<html><body>Test</body></html>')

    expect(mockFetch).toHaveBeenCalledTimes(2)
    const [url, options] = mockFetch.mock.calls[0] as [string, RequestInit]
    expect(url).toBe('https://api.getdeckle.dev/v1/generate')
    expect(options.method).toBe('POST')
    const body = JSON.parse(options.body as string)
    expect(body.html).toContain('<html>')
    expect(result).toBeInstanceOf(Uint8Array)
    expect(result[0]).toBe(0x25) // %
  })

  it('throws Error when Deckle returns non-2xx', async () => {
    mockFetch.mockResolvedValueOnce(
      new Response('{"error":"invalid key"}', { status: 401 })
    )

    const { generatePDFFromHTML } = await import('@/lib/pdf-docuforge')
    await expect(generatePDFFromHTML('<html>test</html>')).rejects.toThrow('Deckle 401')
  })
})
