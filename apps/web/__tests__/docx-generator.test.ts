import { describe, it, expect } from 'vitest'
import { htmlToBlocks, generateDOCXFromSections } from '@/lib/docx-generator'

// Regression: htmlToBlocks used to filter on TextRun.options (which docx v9 does
// not expose), so the predicate was always false and EVERY body block was dropped —
// DOCX exports contained only headings. These tests lock in the fix.
describe('htmlToBlocks', () => {
  it('extracts paragraphs and list items from TipTap HTML', () => {
    const blocks = htmlToBlocks(
      '<p>Implementaremos <strong>Fase 1</strong>.</p><ul><li>Punto A</li><li>Punto B</li></ul>',
    )
    expect(blocks.length).toBe(3) // 1 paragraph + 2 bullets
    expect(blocks.filter((b) => b.type === 'bullet').length).toBe(2)
    expect(blocks.every((b) => b.runs.length > 0)).toBe(true)
  })

  it('skips empty block-level elements', () => {
    expect(htmlToBlocks('<p></p><p>   </p>').length).toBe(0)
  })

  it('falls back to a single paragraph when there are no block tags', () => {
    const blocks = htmlToBlocks('texto plano sin etiquetas')
    expect(blocks.length).toBe(1)
    expect(blocks[0].type).toBe('paragraph')
  })
})

describe('generateDOCXFromSections', () => {
  it('produces a non-empty .docx buffer', async () => {
    const bytes = await generateDOCXFromSections(
      { solucion: '<p>Contenido real de la propuesta.</p>' },
      'ACME',
      '1D9E75',
      { heading: 'Poppins', body: 'Inter' },
    )
    expect(bytes.byteLength).toBeGreaterThan(1000)
  })
})
