import { Check } from 'lucide-react'
import { cn } from '@/lib/utils'

interface WizardStep {
  number: number
  label: string
  description: string
}

const STEPS: WizardStep[] = [
  { number: 1, label: 'Cliente', description: 'Selecciona o crea un cliente' },
  { number: 2, label: 'Contexto', description: 'Describe el problema y configuración' },
  { number: 3, label: 'Generación', description: 'Claude redacta tu propuesta' },
  { number: 4, label: 'Revisión', description: 'Revisa y exporta' },
]

interface WizardProgressProps {
  currentStep: number
}

export function WizardProgress({ currentStep }: WizardProgressProps) {
  return (
    <aside className="w-64 flex-shrink-0">
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 sticky top-6">
        <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-6">
          Progreso
        </h2>

        <div className="space-y-0">
          {STEPS.map((step, i) => {
            const done = currentStep > step.number
            const active = currentStep === step.number
            const pending = currentStep < step.number

            return (
              <div key={step.number} className="flex gap-4">
                {/* Left: circle + connector */}
                <div className="flex flex-col items-center">
                  <div
                    className={cn(
                      'h-8 w-8 rounded-full flex items-center justify-center flex-shrink-0 transition-all',
                      done && 'bg-[#1D9E75]',
                      active && 'bg-[#1D9E75] ring-4 ring-[#e6f7f2]',
                      pending && 'bg-white border-2 border-gray-200',
                    )}
                  >
                    {done ? (
                      <Check className="h-4 w-4 text-white" />
                    ) : (
                      <span
                        className={cn(
                          'text-xs font-bold',
                          active ? 'text-white' : 'text-gray-400',
                        )}
                      >
                        {step.number}
                      </span>
                    )}
                  </div>
                  {i < STEPS.length - 1 && (
                    <div
                      className={cn(
                        'w-0.5 flex-1 my-1 min-h-[28px] transition-colors',
                        done ? 'bg-[#1D9E75]' : 'bg-gray-100',
                      )}
                    />
                  )}
                </div>

                {/* Right: label + description */}
                <div className={cn('pb-6', i === STEPS.length - 1 && 'pb-0')}>
                  <p
                    className={cn(
                      'text-sm font-semibold leading-tight',
                      active || done ? 'text-gray-900' : 'text-gray-400',
                    )}
                  >
                    {step.label}
                  </p>
                  <p className="text-xs text-gray-400 mt-0.5 leading-snug">
                    {step.description}
                  </p>
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </aside>
  )
}
