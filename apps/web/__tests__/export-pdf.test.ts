import { describe, it, expect, vi, beforeEach } from 'vitest'

const mockFetch = vi.fn()
vi.stubGlobal('fetch', mockFetch)
vi.stubEnv('DOCUFORGE_API_KEY', 'test-key-123')

describe('PDF export via DocuForge', () => {
  beforeEach(() => {
    mockFetch.mockReset()
    vi.resetModules()
  })

  it('calls DocuForge API with HTML body and returns PDF binary', async () => {
    const fakePdfBytes = new Uint8Array([0x25, 0x50, 0x44, 0x46]) // %PDF magic bytes
    mockFetch.mockResolvedValueOnce(
      new Response(fakePdfBytes.buffer, {
        status: 200,
        headers: { 'Content-Type': 'application/pdf' },
      })
    )

    const { generatePDFFromHTML } = await import('@/lib/pdf-docuforge')
    const result = await generatePDFFromHTML('<html><body>Test</body></html>')

    expect(mockFetch).toHaveBeenCalledOnce()
    const [url, options] = mockFetch.mock.calls[0] as [string, RequestInit]
    expect(url).toBe('https://api.getdocuforge.dev/v1/pdf')
    expect(options.method).toBe('POST')
    const body = JSON.parse(options.body as string)
    expect(body.html).toContain('<html>')
    expect(result).toBeInstanceOf(Uint8Array)
    expect(result[0]).toBe(0x25) // %
  })

  it('throws Error when DocuForge returns non-2xx', async () => {
    mockFetch.mockResolvedValueOnce(
      new Response('{"error":"invalid key"}', { status: 401 })
    )

    const { generatePDFFromHTML } = await import('@/lib/pdf-docuforge')
    await expect(generatePDFFromHTML('<html>test</html>')).rejects.toThrow('DocuForge 401')
  })
})
