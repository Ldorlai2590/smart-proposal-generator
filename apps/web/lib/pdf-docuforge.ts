// PDF generation via Deckle — https://getdeckle.dev
// Free tier: 1000 PDFs/month, no credit card.
// Register at https://app.getdeckle.dev/sign-up → get key at https://app.getdeckle.dev/keys
// Key format: dk_live_sk_...  Set as DECKLE_API_KEY in Vercel.
export async function generatePDFFromHTML(html: string): Promise<Uint8Array> {
  const apiKey = process.env.DECKLE_API_KEY
  if (!apiKey) throw new Error('DECKLE_API_KEY not set')

  const res = await fetch('https://api.getdeckle.dev/v1/generate', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      html,
      options: { format: 'A4', margin: '0.5in' },
      output: 'url',
    }),
  })

  if (!res.ok) {
    const text = await res.text().catch(() => '')
    throw new Error(`Deckle ${res.status}: ${text}`)
  }

  const json = (await res.json()) as { url?: string }
  if (!json.url) throw new Error('Deckle returned no PDF URL')

  const pdfRes = await fetch(json.url)
  if (!pdfRes.ok) throw new Error(`Deckle PDF fetch failed: ${pdfRes.status}`)

  const buffer = await pdfRes.arrayBuffer()
  return new Uint8Array(buffer)
}
