'use client'

import { useEffect } from 'react'
import { experimental_useObject as useObject } from 'ai/react'
import { z } from 'zod/v4'
import { motion } from 'framer-motion'
import { CheckCircle2, Loader2, Sparkles } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import type { ClientData } from './Step1Client'
import type { ContextData } from './Step2Context'

export interface ProposalSections {
  resumenEjecutivo: string
  problema: string
  solucion: string
  alcance: string
  timeline: string
  inversion: string
  proximosPasos: string
}

const ProposalSectionSchema = z.object({
  resumenEjecutivo: z.string(),
  problema: z.string(),
  solucion: z.string(),
  alcance: z.string(),
  timeline: z.string(),
  inversion: z.string(),
  proximosPasos: z.string(),
})

const SECTION_LABELS: Record<keyof ProposalSections, string> = {
  resumenEjecutivo: 'Resumen ejecutivo',
  problema: 'Problema',
  solucion: 'Solución',
  alcance: 'Alcance del proyecto',
  timeline: 'Cronograma',
  inversion: 'Inversión',
  proximosPasos: 'Próximos pasos',
}

const SECTION_ORDER: (keyof ProposalSections)[] = [
  'resumenEjecutivo', 'problema', 'solucion', 'alcance',
  'timeline', 'inversion', 'proximosPasos',
]

interface Step3GenerateProps {
  client: ClientData
  context: ContextData
  onNext: (sections: ProposalSections) => void
  onBack: () => void
}

export function Step3Generate({ client, context, onNext, onBack }: Step3GenerateProps) {
  const { object, submit, isLoading, error } = useObject<ProposalSections>({
    api: '/api/proposals/stream',
    schema: ProposalSectionSchema,
  })

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

  const completedCount = SECTION_ORDER.filter((k) => !!partial?.[k]).length
  const progressPct = Math.round((completedCount / SECTION_ORDER.length) * 100)
  const isComplete = !isLoading && completedCount === SECTION_ORDER.length

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
            <p className="text-white text-sm font-semibold">
              {isComplete ? '¡Propuesta generada!' : isLoading ? 'Claude está generando...' : error ? 'Error al generar' : 'Listo para revisar'}
            </p>
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
          onClick={() => isComplete && onNext(partial as ProposalSections)}
          disabled={!isComplete}
          size="lg"
          className="flex-1 bg-[#1D9E75] hover:bg-[#158a63] text-white"
        >
          Revisar propuesta →
        </Button>
      </div>
    </div>
  )
}
