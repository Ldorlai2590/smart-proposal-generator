import { describe, it, expect, vi, beforeEach } from 'vitest'

const fakePdfBytes = Buffer.from([0x25, 0x50, 0x44, 0x46]) // %PDF magic bytes

const mockPage = {
  setContent: vi.fn().mockResolvedValue(undefined),
  pdf: vi.fn().mockResolvedValue(fakePdfBytes),
}

const mockBrowser = {
  newPage: vi.fn().mockResolvedValue(mockPage),
  close: vi.fn().mockResolvedValue(undefined),
}

vi.mock('puppeteer-core', () => ({
  default: {
    launch: vi.fn().mockResolvedValue(mockBrowser),
  },
}))

vi.mock('@sparticuz/chromium-min', () => ({
  default: {
    args: ['--no-sandbox'],
    defaultViewport: { width: 1280, height: 720 },
    executablePath: vi.fn().mockResolvedValue('/usr/bin/chromium'),
    headless: true,
  },
}))

describe('PDF export via headless Chromium', () => {
  beforeEach(() => {
    vi.resetModules()
    mockPage.setContent.mockClear()
    mockPage.pdf.mockClear()
    mockBrowser.newPage.mockClear()
    mockBrowser.close.mockClear()
  })

  it('launches Chromium, renders HTML, and returns PDF binary', async () => {
    const { generatePDFFromHTML } = await import('@/lib/pdf-docuforge')
    const result = await generatePDFFromHTML('<html><body>Test</body></html>')

    expect(mockPage.setContent).toHaveBeenCalledWith(
      '<html><body>Test</body></html>',
      { waitUntil: 'load', timeout: 45_000 },
    )
    expect(mockPage.pdf).toHaveBeenCalledWith({
      format: 'A4',
      margin: { top: '0.5in', right: '0.5in', bottom: '0.5in', left: '0.5in' },
      printBackground: true,
      timeout: 45_000,
    })
    expect(result).toBeInstanceOf(Uint8Array)
    expect(result[0]).toBe(0x25) // % — first byte of %PDF
  })

  it('always closes the browser even when pdf() throws', async () => {
    mockPage.pdf.mockRejectedValueOnce(new Error('render failed'))

    const { generatePDFFromHTML } = await import('@/lib/pdf-docuforge')
    await expect(generatePDFFromHTML('<html>test</html>')).rejects.toThrow('render failed')

    expect(mockBrowser.close).toHaveBeenCalledTimes(1)
  })
})
