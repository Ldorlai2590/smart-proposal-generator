'use client'

import { useState } from 'react'
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

export function ProposalWizard() {
  const [step, setStep] = useState(1)
  const [client, setClient] = useState<ClientData | null>(null)
  const [context, setContext] = useState<ContextData | null>(null)
  const [sections, setSections] = useState<ProposalSections | null>(null)

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
                onNext={(s) => {
                  setSections(s)
                  setStep(4)
                }}
                onBack={() => setStep(2)}
              />
            )}

            {step === 4 && client && sections && (
              <Step4Review
                client={client}
                sections={sections}
                onBack={() => setStep(3)}
              />
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
