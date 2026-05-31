export async function generatePDFFromHTML(html: string): Promise<Uint8Array> {
  const apiKey = process.env.DOCUFORGE_API_KEY
  if (!apiKey) throw new Error('DOCUFORGE_API_KEY not set')

  const res = await fetch('https://api.getdocuforge.dev/v1/pdf', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ html }),
  })

  if (!res.ok) {
    const text = await res.text().catch(() => '')
    throw new Error(`DocuForge ${res.status}: ${text}`)
  }

  const buffer = await res.arrayBuffer()
  return new Uint8Array(buffer)
}
