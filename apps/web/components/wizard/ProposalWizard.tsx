'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { WizardProgress } from './WizardProgress'
import { Step1Client, type ClientData } from './Step1Client'
import { Step2Context, type ContextData } from './Step2Context'
import { Step3Generate, type ProposalSections } from './Step3Generate'
import { Step4Review } from './Step4Review'

const STEP_TITLES = [
  { title: 'Selecciona un cliente', subtitle: 'Elige un cliente existente o crea uno nuevo.' },
  { title: 'Contexto de la propuesta', subtitle: 'Describe el desafío y configura las opciones.' },
  { title: 'Generando con IA', subtitle: 'Claude está redactando tu propuesta personalizada.' },
  { title: 'Revisa y exporta', subtitle: 'Tu propuesta está lista. Revísala y descárgala.' },
]

const LS_KEY = 'spg_wizard_draft'
const LS_TTL_MS = 24 * 60 * 60 * 1000 // 24h

interface WizardDraft {
  step: number
  client: ClientData | null
  context: ContextData | null
  proposalId: string
  savedAt: number
}

function loadDraft(): WizardDraft | null {
  try {
    const raw = localStorage.getItem(LS_KEY)
    if (!raw) return null
    const draft = JSON.parse(raw) as WizardDraft
    if (Date.now() - draft.savedAt > LS_TTL_MS) {
      localStorage.removeItem(LS_KEY)
      return null
    }
    return draft
  } catch {
    return null
  }
}

function saveDraft(draft: Omit<WizardDraft, 'savedAt'>) {
  try {
    localStorage.setItem(LS_KEY, JSON.stringify({ ...draft, savedAt: Date.now() }))
  } catch { /* quota exceeded or SSR */ }
}

export function ProposalWizard() {
  const [step, setStep] = useState(1)
  const [client, setClient] = useState<ClientData | null>(null)
  const [context, setContext] = useState<ContextData | null>(null)
  const [sections, setSections] = useState<ProposalSections | null>(null)
  const [proposalId, setProposalId] = useState<string>('')

  // Restore draft from localStorage on mount (steps 1-3 only)
  useEffect(() => {
    const draft = loadDraft()
    if (draft && draft.step < 4) {
      setStep(draft.step)
      setClient(draft.client)
      setContext(draft.context)
      setProposalId(draft.proposalId)
    }
  }, [])

  // Persist wizard state whenever step/client/context changes (except step 4 — already in DB)
  useEffect(() => {
    if (step < 4) {
      saveDraft({ step, client, context, proposalId })
    } else {
      // Proposal saved in DB — clear the draft
      try { localStorage.removeItem(LS_KEY) } catch { /* ignore */ }
    }
  }, [step, client, context, proposalId])

  const { title, subtitle } = STEP_TITLES[step - 1]

  return (
    <div className="min-h-screen">
      {/* Top bar */}
      <div className="flex items-center justify-between mb-8">
        <Link
          href="/proposals"
          className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-900 transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          Propuestas
        </Link>
        <div className="flex items-center gap-1">
          {[1, 2, 3, 4].map((s) => (
            <div
              key={s}
              className={`h-1.5 rounded-full transition-all ${
                s <= step ? 'bg-[#1D9E75] w-8' : 'bg-gray-200 w-4'
              }`}
            />
          ))}
        </div>
      </div>

      <div className="flex gap-8 items-start">
        {/* Left: progress panel */}
        <WizardProgress currentStep={step} />

        {/* Right: step content */}
        <div className="flex-1 min-w-0">
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-8">
            <div className="mb-6">
              <h1 className="text-xl font-bold text-gray-900">{title}</h1>
              <p className="text-sm text-gray-500 mt-1">{subtitle}</p>
            </div>

            {step === 1 && (
              <Step1Client
                onNext={(c) => {
                  setClient(c)
                  setStep(2)
                }}
              />
            )}

            {step === 2 && client && (
              <Step2Context
                client={client}
                onNext={(ctx) => {
                  setContext(ctx)
                  setStep(3)
                }}
                onBack={() => setStep(1)}
              />
            )}

            {step === 3 && client && context && (
              <Step3Generate
                client={client}
                context={context}
                onNext={(s, pid) => {
                  setSections(s)
                  setProposalId(pid)
                  setStep(4)
                }}
                onBack={() => setStep(2)}
              />
            )}

            {step === 4 && client && sections && (
              <Step4Review
                client={client}
                sections={sections}
                proposalId={proposalId}
                onBack={() => setStep(3)}
              />
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
