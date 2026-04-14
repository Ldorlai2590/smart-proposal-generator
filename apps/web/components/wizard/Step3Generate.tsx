'use client'

import { useEffect, useRef, useState } from 'react'
import { experimental_useObject as useObject } from 'ai/react'
import { z } from 'zod/v4'
import { motion } from 'framer-motion'
import { CheckCircle2, Loader2, Sparkles } from 'lucide-react'
import { useAuth } from '@clerk/nextjs'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { fetchWithTenant } from '@/lib/api'
import type { ClientData } from './Step1Client'
import type { ContextData } from './Step2Context'

export interface ProposalSections {
  resumenEjecutivo: string
  problema: string
  serviciosPropuestos: string
  alcancePorServicio: string
  timeline: string
  inversion: string
  casoDeExito?: string
  proximosPasos: string
}

const ProposalSectionSchema = z.object({
  resumenEjecutivo: z.string(),
  problema: z.string(),
  serviciosPropuestos: z.string(),
  alcancePorServicio: z.string(),
  timeline: z.string(),
  inversion: z.string(),
  casoDeExito: z.string().optional(),
  proximosPasos: z.string(),
})

const SECTION_LABELS: Record<keyof ProposalSections, string> = {
  resumenEjecutivo: 'Resumen ejecutivo',
  problema: 'Problema',
  serviciosPropuestos: 'Servicios propuestos',
  alcancePorServicio: 'Alcance por servicio',
  timeline: 'Cronograma',
  inversion: 'Inversión',
  casoDeExito: 'Caso de éxito',
  proximosPasos: 'Próximos pasos',
}

const SECTION_ORDER: (keyof ProposalSections)[] = [
  'resumenEjecutivo', 'problema', 'serviciosPropuestos', 'alcancePorServicio',
  'timeline', 'inversion', 'casoDeExito', 'proximosPasos',
]

interface Step3GenerateProps {
  client: ClientData
  context: ContextData
  onNext: (sections: ProposalSections, proposalId: string) => void
  onBack: () => void
}

type SaveState = 'idle' | 'saving' | 'saved' | 'error'

export function Step3Generate({ client, context, onNext, onBack }: Step3GenerateProps) {
  const { orgId, userId } = useAuth()
  const { object, submit, isLoading, error } = useObject<ProposalSections>({
    api: '/api/proposals/stream',
    schema: ProposalSectionSchema,
  })

  const [saveState, setSaveState] = useState<SaveState>('idle')
  const [proposalId, setProposalId] = useState<string | null>(null)
  // Track whether we already fired the save to avoid duplicate POSTs
  const hasSavedRef = useRef(false)

  const partial = object as Partial<ProposalSections> | undefined

  useEffect(() => {
    submit({
      clientId: client.id,
      clientName: client.name,
      company: client.company,
      industry: client.industry ?? '',
      problema: context.problema,
      budget: context.budget,
      timeline: context.timeline,
      tono: context.tono,
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // casoDeExito is optional, so we count required fields (all except casoDeExito)
  const requiredSections = SECTION_ORDER.filter((k) => k !== 'casoDeExito')
  const completedCount = requiredSections.filter((k) => !!partial?.[k]).length
  const progressPct = Math.round((completedCount / requiredSections.length) * 100)
  const isComplete = !isLoading && completedCount === requiredSections.length

  // Save to FastAPI once streaming finishes
  useEffect(() => {
    if (!isComplete || hasSavedRef.current || !partial) return
    if (!orgId || !userId) return

    hasSavedRef.current = true
    setSaveState('saving')

    const title = `Propuesta para ${client.company || client.name}`
    const body = {
      client_id: client.id,
      title,
      template_id: context.template,
      context: {
        problem: context.problema,
        budget: context.budget,
        timeline: context.timeline,
      },
      sections: partial as ProposalSections,
      tokens_used: 0,
      model: 'claude-sonnet-4-5',
      status: 'generated',
    }

    fetch('/api/proposals', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
      .then(async (res) => {
        if (!res.ok) throw new Error(`FastAPI ${res.status}`)
        const data = (await res.json()) as { id: string; status: string; created_at: string }
        setProposalId(data.id)
        setSaveState('saved')
      })
      .catch((err: unknown) => {
        console.error('[Step3] save failed:', err)
        setSaveState('error')
        // Allow advancing even on save error — user can retry from Step4
        setProposalId('')
      })
  }, [isComplete, orgId, userId, partial, client, context])

  function getStatus(key: keyof ProposalSections): 'done' | 'streaming' | 'pending' {
    if (partial?.[key]) return 'done'
    if (isLoading) {
      const idx = SECTION_ORDER.indexOf(key)
      const prevKey = SECTION_ORDER[idx - 1]
      if (idx === 0 || (prevKey && partial?.[prevKey])) return 'streaming'
    }
    return 'pending'
  }

  return (
    <div className="space-y-6">
      {/* Dark panel */}
      <div className="bg-[#0F172A] rounded-2xl p-6 border border-[#1E293B]">
        {/* Header */}
        <div className="flex items-center gap-3 mb-5">
          <div className="h-10 w-10 rounded-full bg-[#1D9E75]/20 flex items-center justify-center">
            <Sparkles
              className={`h-5 w-5 text-[#1D9E75] ${isLoading ? 'animate-pulse' : ''}`}
            />
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <p className="text-white text-sm font-semibold">
                {isComplete ? '¡Propuesta generada!' : isLoading ? 'Claude está generando...' : error ? 'Error al generar' : 'Listo para revisar'}
              </p>
              {saveState === 'saving' && (
                <span className="flex items-center gap-1 text-[10px] text-[#94A3B8] animate-pulse">
                  <Loader2 className="h-3 w-3 animate-spin" />
                  Guardando...
                </span>
              )}
              {saveState === 'saved' && (
                <span className="flex items-center gap-1 text-[10px] text-[#1D9E75]">
                  <CheckCircle2 className="h-3 w-3" />
                  Guardado ✓
                </span>
              )}
              {saveState === 'error' && (
                <span className="text-[10px] text-red-400">No se pudo guardar</span>
              )}
            </div>
            <p className="text-[#94A3B8] text-xs">{client.company} · {context.template}</p>
          </div>
          <div className="text-right">
            <span className="text-[#1D9E75] text-sm font-bold">{progressPct}%</span>
          </div>
        </div>

        {/* Progress bar */}
        <Progress value={progressPct} className="h-1.5 mb-5 bg-[#1E293B]" />

        {/* Sections */}
        <div className="space-y-2">
          {SECTION_ORDER.map((key, i) => {
            const status = getStatus(key)
            return (
              <motion.div
                key={key}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.08 }}
                className="flex items-center gap-3 p-3 rounded-xl bg-[#1E293B]/50"
              >
                {/* Status icon */}
                <div className="flex-shrink-0 h-5 w-5 flex items-center justify-center">
                  {status === 'done' ? (
                    <CheckCircle2 className="h-5 w-5 text-[#1D9E75]" />
                  ) : status === 'streaming' ? (
                    <Loader2 className="h-4 w-4 text-[#1D9E75] animate-spin" />
                  ) : (
                    <div className="h-4 w-4 rounded-full border border-[#334155]" />
                  )}
                </div>

                {/* Label + preview */}
                <div className="flex-1 min-w-0">
                  <p
                    className={`text-xs font-medium ${
                      status === 'done'
                        ? 'text-[#94A3B8]'
                        : status === 'streaming'
                          ? 'text-white'
                          : 'text-[#475569]'
                    }`}
                  >
                    {SECTION_LABELS[key]}
                  </p>
                  {status === 'done' && partial?.[key] && (
                    <p className="text-xs text-[#475569] mt-0.5 truncate">
                      {partial[key]?.substring(0, 70)}...
                    </p>
                  )}
                  {status === 'streaming' && (
                    <div className="flex gap-1 mt-1">
                      {[40, 70, 55, 85].map((w, j) => (
                        <motion.div
                          key={j}
                          className="h-1 bg-[#1D9E75]/40 rounded"
                          style={{ width: `${w}%` }}
                          animate={{ opacity: [0.4, 1, 0.4] }}
                          transition={{ duration: 1.2, repeat: Infinity, delay: j * 0.15 }}
                        />
                      ))}
                    </div>
                  )}
                </div>
              </motion.div>
            )
          })}
        </div>

        {error && (
          <p className="mt-4 text-sm text-red-400 text-center">{error.message}</p>
        )}

        <p className="text-center text-xs text-[#475569] mt-4">
          Esta propuesta usa Claude Sonnet · estimado ~30 segundos
        </p>
      </div>

      <div className="flex gap-3">
        <Button variant="outline" onClick={onBack} disabled={isLoading} size="lg">
          Atrás
        </Button>
        <Button
          onClick={() => {
            if (isComplete && partial && proposalId !== null) {
              onNext(partial as ProposalSections, proposalId)
            }
          }}
          disabled={!isComplete || saveState === 'saving' || proposalId === null}
          size="lg"
          className="flex-1 bg-[#1D9E75] hover:bg-[#158a63] text-white"
        >
          {saveState === 'saving' ? (
            <span className="flex items-center gap-2">
              <Loader2 className="h-4 w-4 animate-spin" />
              Guardando...
            </span>
          ) : (
            'Revisar propuesta →'
          )}
        </Button>
      </div>
    </div>
  )
}
