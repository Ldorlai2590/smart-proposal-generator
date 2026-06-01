import {
  Document,
  Packer,
  Paragraph,
  TextRun,
  HeadingLevel,
  AlignmentType,
  BorderStyle,
  ShadingType,
} from 'docx'

const SECTION_META: { key: string; label: string }[] = [
  { key: 'portada', label: 'Portada' },
  { key: 'contextoCliente', label: 'Contexto del Cliente' },
  { key: 'diagnostico', label: 'Diagnóstico' },
  { key: 'oportunidad', label: 'Oportunidad Detectada' },
  { key: 'solucion', label: 'Solución Propuesta' },
  { key: 'alcance', label: 'Alcance Detallado' },
  { key: 'incluyeNoIncluye', label: 'Qué Incluye / No Incluye' },
  { key: 'metodologia', label: 'Metodología' },
  { key: 'cronograma', label: 'Cronograma' },
  { key: 'casosExito', label: 'Casos de Éxito' },
  { key: 'diferenciadores', label: 'Diferenciadores' },
  { key: 'inversion', label: 'Inversión' },
  { key: 'proximosPasos', label: 'Próximos Pasos' },
  { key: 'ctaFinal', label: 'Llamado a la Acción' },
]

// Parses TipTap HTML into a list of { type, text, runs } blocks.
// Handles: <p>, <h1-h3>, <li>, <strong>, <em>, <br>.
// Falls back to plain text for unknown tags.
function htmlToBlocks(html: string): Array<{ type: 'paragraph' | 'bullet'; runs: TextRun[] }> {
  // Decode HTML entities
  const decode = (s: string) =>
    s.replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&nbsp;/g, ' ')

  // Extract inline runs from a chunk of HTML (handles <strong>, <em>, <u>)
  function parseInline(chunk: string): TextRun[] {
    const runs: TextRun[] = []
    // Split on inline tags — simplified but covers TipTap output
    const parts = chunk.split(/(<\/?(?:strong|b|em|i|u|s|code)[^>]*>)/gi)
    let bold = false
    let italic = false
    let underline = false

    for (const part of parts) {
      if (/^<strong|^<b/i.test(part)) { bold = true; continue }
      if (/^<\/strong|^<\/b/i.test(part)) { bold = false; continue }
      if (/^<em|^<i/i.test(part)) { italic = true; continue }
      if (/^<\/em|^<\/i/i.test(part)) { italic = false; continue }
      if (/^<u/i.test(part)) { underline = true; continue }
      if (/^<\/u/i.test(part)) { underline = false; continue }
      if (/^<\/?[a-z]/i.test(part)) continue // skip other tags

      const text = decode(part.replace(/<br\s*\/?>/gi, '\n'))
      if (!text) continue
      runs.push(new TextRun({ text, bold, italics: italic, underline: underline ? {} : undefined }))
    }

    return runs.length > 0 ? runs : [new TextRun({ text: decode(chunk.replace(/<[^>]+>/g, '')) })]
  }

  const blocks: Array<{ type: 'paragraph' | 'bullet'; runs: TextRun[] }> = []

  // Extract block-level elements — order: lists first (so <li> inside <ul>/<ol> is matched)
  const blockPattern = /(<(?:p|h[1-6]|li|div)[^>]*>)([\s\S]*?)<\/(?:p|h[1-6]|li|div)>/gi
  let match: RegExpExecArray | null
  let lastIndex = 0
  let hasBlocks = false

  while ((match = blockPattern.exec(html)) !== null) {
    hasBlocks = true
    lastIndex = blockPattern.lastIndex

    const tag = match[1].replace(/<([a-z0-9]+).*/i, '$1').toLowerCase()
    const inner = match[2]
    const runs = parseInline(inner)
    const type = tag === 'li' ? 'bullet' : 'paragraph'
    if (runs.some(r => (r as any).options?.text?.trim())) {
      blocks.push({ type, runs })
    }
  }

  // Fallback: no block tags found — treat entire content as one paragraph
  if (!hasBlocks) {
    const text = html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim()
    if (text) blocks.push({ type: 'paragraph', runs: [new TextRun({ text })] })
  }

  return blocks
}

export async function generateDOCXFromSections(
  sections: Record<string, string>,
  companyName = 'Smart Proposal Generator',
  primaryColor = '1D9E75',
): Promise<Uint8Array> {
  const today = new Date().toLocaleDateString('es-ES', { year: 'numeric', month: 'long', day: 'numeric' })

  const children: Paragraph[] = [
    // Cover title
    new Paragraph({
      children: [new TextRun({ text: 'Propuesta Comercial', bold: true, size: 52, color: primaryColor.replace('#', '') })],
      alignment: AlignmentType.CENTER,
      spacing: { after: 200 },
    }),
    new Paragraph({
      children: [new TextRun({ text: `Preparada por ${companyName}`, size: 28, color: '6B7280' })],
      alignment: AlignmentType.CENTER,
      spacing: { after: 100 },
    }),
    new Paragraph({
      children: [new TextRun({ text: today, size: 24, color: '9CA3AF' })],
      alignment: AlignmentType.CENTER,
      spacing: { after: 600 },
    }),
  ]

  for (const { key, label } of SECTION_META) {
    const raw = sections[key]
    if (!raw) continue

    // Section heading with colored left border via shading
    children.push(
      new Paragraph({
        children: [new TextRun({ text: label.toUpperCase(), bold: true, size: 24, color: primaryColor.replace('#', '') })],
        heading: HeadingLevel.HEADING_2,
        spacing: { before: 400, after: 160 },
        border: {
          left: { style: BorderStyle.SINGLE, size: 24, color: primaryColor.replace('#', ''), space: 8 },
        },
      }),
    )

    // Section content
    const blocks = htmlToBlocks(raw)
    for (const block of blocks) {
      children.push(
        new Paragraph({
          children: block.runs,
          bullet: block.type === 'bullet' ? { level: 0 } : undefined,
          spacing: { after: 120 },
        }),
      )
    }
  }

  // Footer
  children.push(
    new Paragraph({
      children: [new TextRun({ text: `${companyName} · Documento confidencial · ${new Date().getFullYear()}`, size: 18, color: '9CA3AF' })],
      alignment: AlignmentType.CENTER,
      spacing: { before: 600 },
      border: {
        top: { style: BorderStyle.SINGLE, size: 4, color: 'E5E7EB', space: 8 },
      },
    }),
  )

  const doc = new Document({
    creator: companyName,
    title: 'Propuesta Comercial',
    description: `Generado por Smart Proposal Generator · ${today}`,
    styles: {
      default: {
        document: {
          run: { font: 'Calibri', size: 24 },
        },
      },
    },
    sections: [
      {
        properties: {
          page: {
            margin: { top: 1134, bottom: 1134, left: 1134, right: 1134 }, // ~2cm margins
          },
        },
        children,
      },
    ],
  })

  const buffer = await Packer.toBuffer(doc)
  return new Uint8Array(buffer)
}
