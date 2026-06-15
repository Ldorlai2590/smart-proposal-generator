// PDF generation via headless Chromium — no external API or registration needed.
// Uses @sparticuz/chromium-min (no bundled binary) + puppeteer-core.
// On Vercel/Lambda: Chromium is downloaded to /tmp on first cold start (~50 MB, cached).
// In local dev: set CHROMIUM_EXECUTABLE_PATH to your local Chrome binary.
import chromium from '@sparticuz/chromium-min'
import puppeteer from 'puppeteer-core'

// Stable Chromium build compatible with this version of puppeteer-core.
const CHROMIUM_REMOTE_URL =
  'https://github.com/Sparticuz/chromium/releases/download/v131.0.1/chromium-v131.0.1-pack.tar'

// Overall render budget, kept safely under the route's maxDuration=60s so we
// fall back to HTML instead of being hard-killed by the Vercel function limit.
const PDF_RENDER_TIMEOUT_MS = 45_000

async function renderPDF(html: string): Promise<Uint8Array> {
  const executablePath =
    process.env.CHROMIUM_EXECUTABLE_PATH ||
    (await chromium.executablePath(CHROMIUM_REMOTE_URL))

  const browser = await puppeteer.launch({
    args: chromium.args,
    executablePath,
    headless: true,
  })

  try {
    const page = await browser.newPage()
    await page.setContent(html, { waitUntil: 'load', timeout: PDF_RENDER_TIMEOUT_MS })
    const pdf = await page.pdf({
      format: 'A4',
      margin: { top: '0.5in', right: '0.5in', bottom: '0.5in', left: '0.5in' },
      printBackground: true,
      timeout: PDF_RENDER_TIMEOUT_MS,
    })
    return new Uint8Array(pdf)
  } finally {
    await browser.close()
  }
}

export async function generatePDFFromHTML(html: string): Promise<Uint8Array> {
  let timer: ReturnType<typeof setTimeout> | undefined
  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(
      () => reject(new Error(`PDF render timed out after ${PDF_RENDER_TIMEOUT_MS}ms`)),
      PDF_RENDER_TIMEOUT_MS,
    )
  })

  try {
    return await Promise.race([renderPDF(html), timeout])
  } finally {
    if (timer) clearTimeout(timer)
  }
}
