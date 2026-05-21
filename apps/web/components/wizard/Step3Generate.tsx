'use client'

import { useEffect, useRef, useState } from 'react'
import { experimental_useObject as useObject } from 'ai/react'
import { motion } from 'framer-motion'
import { CheckCircle2, Loader2, Sparkles } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'

import type { ClientData } from './Step1Client'
import type { ContextData } from './Step2Context'
import {
  ProposalSectionSchema,
  SECTION_LABELS,
  SECTION_ORDER,
  type ProposalSections,
} from '@/lib/schemas/proposal'

// Re-export for downstream consumers (Step4Review still imports the type from here).
export type { ProposalSections }

interface Step3GenerateProps {
  client: ClientData
  context: ContextData
  onNext: (sections: ProposalSections, proposalId: string) => void
  onBack: () => void
}

type SaveState = 'idle' | 'saving' | 'saved' | 'error'

export function Step3Generate({ client, context, onNext, onBack }: Step3GenerateProps) {
  const { object, submit, isLoading, error } = useObject<ProposalSections>({
    api: '/api/proposals/stream',
    schema: ProposalSectionSchema,
  })

  const [saveState, setSaveState] = useState<SaveState>('idle')
  const [proposalId, setProposalId] = useState<string | null>(null)
  const hasSavedRef = useRef(false)

  const partial = object as Partial<ProposalSections> | undefined

  useEffect(() => {
    submit({
      clientId: client.id,
      clientName: client.name,
      company: client.company,
      industry: client.industry ?? '',
      problema: context.problema,
      objectives: context.objectives,
      currentProblems: context.current_problems,
      urgency: context.urgency,
      budget: context.budget,
      startDate: context.start_date,
      services: context.services?.map((s) => ({
        name: s.name,
        price: s.adjusted_price,
        quantity: s.quantity,
        discount: s.discount_percent,
        billing: s.billing_type,
      })) ?? [],
      formality: context.formality,
      tono: context.tono,
      designTemplate: context.design_template,
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const completedCount = SECTION_ORDER.filter((k) => {
    const v = partial?.[k]
    return v !== undefined && v !== null && v !== ''
  }).length
  const progressPct = isLoading
    ? Math.round((completedCount / SECTION_ORDER.length) * 100)
    : completedCount > 0 ? 100 : 0
  // Fail-open: if stream ends with partial data, let the user proceed
  const isComplete = !isLoading && !error && (completedCount === SECTION_ORDER.length || (completedCount > 0 && !isLoading))

  useEffect(() => {
    if (!isComplete || hasSavedRef.current || !partial) return

    hasSavedRef.current = true
    setSaveState('saving')

    const title = `Propuesta para ${client.company || client.name}`
    const body = {
      client_id: client.id,
      title,
      template_id: context.design_template,
      context: {
        problem: context.problema,
        objectives: context.objectives,
        urgency: context.urgency,
        budget: context.budget,
        formality: context.formality,
        tono: context.tono,
        services: context.services,
      },
      sections: Object.fromEntries(
        Object.entries(partial ?? {}).filter(([, v]) => typeof v === 'string')
      ) as ProposalSections,
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
        if (!res.ok) throw new Error(`API ${res.status}`)
        const data = (await res.json()) as { id: string; status: string; created_at: string }
        setProposalId(data.id)
        setSaveState('saved')
      })
      .catch((err: unknown) => {
        console.error('[Step3] save failed:', err)
        setSaveState('error')
        setProposalId('')
      })
  }, [isComplete, partial, client, context])

  function getStatus(key: keyof ProposalSections): 'done' | 'streaming' | 'pending' {
    const v = partial?.[key]
    if (v !== undefined && v !== null && v !== '') return 'done'
    if (isLoading) {
      const idx = SECTION_ORDER.indexOf(key)
      const prevKey = SECTION_ORDER[idx - 1]
      if (idx === 0 || (prevKey && partial?.[prevKey])) return 'streaming'
    }
    return 'pending'
  }

  return (
    <div className="space-y-6">
      <div className="bg-[#0F172A] rounded-2xl p-6 border border-[#1E293B]">
        <div className="flex items-center gap-3 mb-5">
          <div className="h-10 w-10 rounded-full bg-[#1D9E75]/20 flex items-center justify-center">
            <Sparkles className={`h-5 w-5 text-[#1D9E75] ${isLoading ? 'animate-pulse' : ''}`} />
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <p className="text-white text-sm font-semibold">
                {isComplete ? '¡Propuesta generada!' : isLoading ? 'Claude está generando...' : error ? 'Error al generar' : 'Listo para revisar'}
              </p>
              {saveState === 'saving' && (
                <span className="flex items-center gap-1 text-[10px] text-[#94A3B8] animate-pulse">
                  <Loader2 className="h-3 w-3 animate-spin" /> Guardando...
                </span>
              )}
              {saveState === 'saved' && (
                <span className="flex items-center gap-1 text-[10px] text-[#1D9E75]">
                  <CheckCircle2 className="h-3 w-3" /> Guardado ✓
                </span>
              )}
              {saveState === 'error' && (
                <span className="text-[10px] text-red-400">No se pudo guardar</span>
              )}
            </div>
            <p className="text-[#94A3B8] text-xs">{client.company} · {SECTION_ORDER.length} secciones · estilo {context.design_template}</p>
          </div>
          <div className="text-right">
            <span className="text-[#1D9E75] text-sm font-bold">{progressPct}%</span>
          </div>
        </div>

        <Progress value={progressPct} className="h-1.5 mb-5 bg-[#1E293B]" />

        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
          {SECTION_ORDER.map((key, i) => {
            const status = getStatus(key)
            return (
              <motion.div
                key={key}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
                className="flex items-center gap-3 p-2.5 rounded-lg bg-[#1E293B]/50"
              >
                <div className="flex-shrink-0 h-5 w-5 flex items-center justify-center">
                  {status === 'done' ? (
                    <CheckCircle2 className="h-5 w-5 text-[#1D9E75]" />
                  ) : status === 'streaming' ? (
                    <Loader2 className="h-4 w-4 text-[#1D9E75] animate-spin" />
                  ) : (
                    <div className="h-4 w-4 rounded-full border border-[#334155]" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className={`text-xs font-medium ${status === 'done' ? 'text-[#94A3B8]' : status === 'streaming' ? 'text-white' : 'text-[#475569]'}`}>
                    <span className="text-[10px] text-[#475569] mr-1">{String(i + 1).padStart(2, '0')}</span>
                    {SECTION_LABELS[key]}
                  </p>
                  {status === 'streaming' && (
                    <div className="flex gap-1 mt-1">
                      {[40, 70, 55].map((w, j) => (
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
      </div>

      {error && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
          Error al generar: {error.message}
        </div>
      )}

      <div className="flex gap-3 pt-2">
        <Button variant="outline" onClick={onBack} size="lg" disabled={isLoading}>
          Atrás
        </Button>
        <Button
          onClick={() => isComplete && partial && onNext(partial as ProposalSections, proposalId ?? '')}
          disabled={!isComplete}
          size="lg"
          className="flex-1"
        >
          {isComplete ? 'Revisar y exportar →' : isLoading ? `Generando... ${progressPct}%` : 'Esperando...'}
        </Button>
      </div>
    </div>
  )
}
