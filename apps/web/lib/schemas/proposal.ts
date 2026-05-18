/**
 * Single source of truth for the proposal section contract.
 *
 * The same 14-key schema is consumed in three places:
 *
 *   1. `app/api/proposals/stream/route.ts` — passed to AI SDK `streamObject`
 *      so Anthropic returns structured JSON.
 *   2. `components/wizard/Step3Generate.tsx` — passed to `experimental_useObject`
 *      on the client so progressive parsing matches the server contract.
 *   3. `app/p/[token]/page.tsx` + `lib/types/proposal-tracking.ts` — typed
 *      access when rendering the public proposal viewer.
 *
 * Keeping these in sync was previously a manual chore; any drift caused the
 * stream to either reject partial chunks or to land sections the viewer
 * couldn't render. Owning the schema in one place fixes that class of bug.
 *
 * The order in `SECTION_ORDER` is the canonical narrative flow used by the
 * progress bar and the viewer ToC.
 */
import { z } from 'zod/v4'

// ─── Zod schema (server + client) ────────────────────────────────────────────

export const ProposalSectionSchema = z.object({
  portada: z.string().describe('Portada con título atractivo, nombre del cliente y tagline en HTML'),
  contextoCliente: z.string().describe('Contexto del cliente: industria, tamaño, situación actual'),
  diagnostico: z.string().describe('Diagnóstico del problema con datos específicos en HTML (use <ul>)'),
  oportunidad: z.string().describe('Oportunidad detectada con métricas proyectadas'),
  solucion: z.string().describe('Solución propuesta concreta'),
  alcance: z.string().describe('Alcance detallado por servicio'),
  incluyeNoIncluye: z.string().describe('Lista clara de qué incluye y qué no en HTML'),
  metodologia: z.string().describe('Metodología de trabajo, sprints, comunicación'),
  cronograma: z.string().describe('Cronograma con hitos por mes/semana'),
  casosExito: z.string().describe('Caso de éxito relevante con resultados medibles'),
  diferenciadores: z.string().describe('Por qué nosotros — diferenciadores únicos'),
  inversion: z.string().describe('Inversión con tabla HTML de servicios y total'),
  proximosPasos: z.string().describe('Próximos pasos concretos numerados'),
  ctaFinal: z.string().describe('Call to action final motivador'),
})

// ─── Derived types ──────────────────────────────────────────────────────────

/** Fully-populated sections — what the stream produces on completion. */
export type ProposalSections = z.infer<typeof ProposalSectionSchema>

/** Partial sections — what arrives mid-stream and what legacy DB rows may have. */
export type PartialProposalSections = Partial<ProposalSections>

export type ProposalSectionKey = keyof ProposalSections

// ─── Display order + Spanish labels ─────────────────────────────────────────
//
// Update both in lockstep when adding/renaming sections; the type system will
// catch missing labels because `SECTION_LABELS` is `Record<keyof …, string>`.

export const SECTION_ORDER: ProposalSectionKey[] = [
  'portada',
  'contextoCliente',
  'diagnostico',
  'oportunidad',
  'solucion',
  'alcance',
  'incluyeNoIncluye',
  'metodologia',
  'cronograma',
  'casosExito',
  'diferenciadores',
  'inversion',
  'proximosPasos',
  'ctaFinal',
]

export const SECTION_LABELS: Record<ProposalSectionKey, string> = {
  portada: 'Portada',
  contextoCliente: 'Contexto del cliente',
  diagnostico: 'Diagnóstico',
  oportunidad: 'Oportunidad detectada',
  solucion: 'Solución propuesta',
  alcance: 'Alcance detallado',
  incluyeNoIncluye: 'Qué incluye / no incluye',
  metodologia: 'Metodología',
  cronograma: 'Cronograma',
  casosExito: 'Casos de éxito',
  diferenciadores: 'Diferenciadores',
  inversion: 'Inversión',
  proximosPasos: 'Próximos pasos',
  ctaFinal: 'CTA final',
}
