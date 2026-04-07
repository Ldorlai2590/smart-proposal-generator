import { streamObject } from 'ai'
import { anthropic } from '@ai-sdk/anthropic'
import { auth } from '@clerk/nextjs/server'
import { z } from 'zod/v4'

const ProposalSectionSchema = z.object({
  resumenEjecutivo: z.string().describe('Resumen ejecutivo de la propuesta'),
  problema: z.string().describe('Descripción del problema del cliente'),
  solucion: z.string().describe('Solución propuesta'),
  alcance: z.string().describe('Alcance del proyecto'),
  timeline: z.string().describe('Cronograma estimado'),
  inversion: z.string().describe('Inversión requerida y estructura de precios'),
  proximosPasos: z.string().describe('Próximos pasos concretos'),
})

const RequestSchema = z.object({
  clientId: z.string(),
  clientName: z.string(),
  company: z.string(),
  industry: z.string(),
  problema: z.string(),
  budget: z.string().optional(),
  timeline: z.string().optional(),
  tono: z.enum(['formal', 'consultivo', 'directo']).default('consultivo'),
})

export async function POST(req: Request) {
  const { userId, orgId } = await auth()
  if (!userId || !orgId) {
    return new Response('Unauthorized', { status: 401 })
  }

  const body = await req.json()
  const input = RequestSchema.parse(body)

  const system = `Eres un experto consultor de negocios que genera propuestas comerciales profesionales en español para el mercado LATAM.

Genera propuestas persuasivas, estructuradas y personalizadas. Usa un tono ${input.tono}.
Cada sección debe ser concisa pero completa. Usa el contexto del cliente para personalizar cada parte.
Empresa: ${input.company} | Industria: ${input.industry}`

  const prompt = `Genera una propuesta comercial completa para ${input.clientName} de ${input.company}.

Problema a resolver: ${input.problema}
${input.budget ? `Presupuesto estimado: ${input.budget}` : ''}
${input.timeline ? `Timeline deseado: ${input.timeline}` : ''}`

  const result = streamObject({
    model: anthropic('claude-sonnet-4-5'),
    schema: ProposalSectionSchema,
    system,
    prompt,
  })

  // Save to PostgreSQL after streaming completes (non-blocking)
  const apiUrl = process.env.API_URL ?? 'http://localhost:8000'
  result.object.then(async (sections) => {
    try {
      const createRes = await fetch(`${apiUrl}/proposals/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-Tenant-ID': orgId },
        body: JSON.stringify({
          client_id: input.clientId,
          title: `Propuesta para ${input.company}`,
          context: {
            problema: input.problema,
            budget: input.budget,
            timeline: input.timeline,
            tono: input.tono,
          },
        }),
      })
      if (createRes.ok) {
        const { id } = await createRes.json()
        await fetch(`${apiUrl}/proposals/${id}/sections`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json', 'X-Tenant-ID': orgId },
          body: JSON.stringify({ sections, model: 'claude-sonnet-4-5' }),
        })
      }
    } catch {
      // Non-blocking — log only, don't fail the stream
      console.error('[stream] Failed to save proposal to DB')
    }
  })

  return result.toTextStreamResponse()
}
