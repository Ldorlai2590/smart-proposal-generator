'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { ChevronRight, ChevronLeft, CheckCircle2, Loader2 } from 'lucide-react'

type BusinessType = 'agency' | 'consultancy' | 'saas' | 'freelancer' | 'other'
type Tone = 'formal' | 'consultative' | 'direct'

interface OnboardingData {
  businessType: BusinessType | null
  industries: string[]
  services: string[]
  proposalSize: string | null
  tone: Tone | null
}

const INITIAL_DATA: OnboardingData = {
  businessType: null,
  industries: [],
  services: [],
  proposalSize: null,
  tone: null,
}

const BUSINESS_TYPES: { value: BusinessType; label: string; description: string }[] = [
  { value: 'agency', label: 'Agencia', description: 'Agencia de servicios digitales o creativa' },
  { value: 'consultancy', label: 'Consultoría', description: 'Consultoría empresarial o estratégica' },
  { value: 'saas', label: 'SaaS', description: 'Proveedor de software/plataforma' },
  { value: 'freelancer', label: 'Freelancer', description: 'Profesional independiente' },
  { value: 'other', label: 'Otro', description: 'Otro tipo de negocio' },
]

const INDUSTRIES = [
  'Tecnología',
  'Marketing',
  'Finanzas',
  'Salud',
  'Educación',
  'E-commerce',
  'Legal',
  'Manufactura',
  'Logística',
  'Otro',
]

const SERVICES = [
  'Consultoría',
  'Desarrollo',
  'Diseño',
  'Marketing Digital',
  'Publicidad Pagada',
  'SEO/SEM',
  'Contenido',
  'Capacitación',
  'Otro',
]

const PROPOSAL_SIZES = [
  { value: 'under5k', label: 'Menos de $5k' },
  { value: '5k-20k', label: '$5k - $20k' },
  { value: '20k-50k', label: '$20k - $50k' },
  { value: 'above50k', label: 'Más de $50k' },
]

const TONES: { value: Tone; label: string; description: string }[] = [
  { value: 'formal', label: 'Formal', description: 'Profesional y corporativo' },
  { value: 'consultative', label: 'Consultivo', description: 'Colaborativo y de asociación' },
  { value: 'direct', label: 'Directo', description: 'Claro y al punto' },
]

export function OnboardingWizard() {
  const router = useRouter()
  const [currentStep, setCurrentStep] = useState(0)
  const [data, setData] = useState<OnboardingData>(INITIAL_DATA)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleBusinessTypeChange = (value: BusinessType) => {
    setData((prev) => ({ ...prev, businessType: value }))
  }

  const toggleIndustry = (industry: string) => {
    setData((prev) => ({
      ...prev,
      industries: prev.industries.includes(industry)
        ? prev.industries.filter((i) => i !== industry)
        : [...prev.industries, industry],
    }))
  }

  const toggleService = (service: string) => {
    setData((prev) => ({
      ...prev,
      services: prev.services.includes(service)
        ? prev.services.filter((s) => s !== service)
        : [...prev.services, service],
    }))
  }

  const handleProposalSizeChange = (value: string) => {
    setData((prev) => ({ ...prev, proposalSize: value }))
  }

  const handleToneChange = (value: Tone) => {
    setData((prev) => ({ ...prev, tone: value }))
  }

  const isStepValid = (): boolean => {
    switch (currentStep) {
      case 0:
        return data.businessType !== null
      case 1:
        return data.industries.length > 0
      case 2:
        return data.services.length > 0
      case 3:
        return data.proposalSize !== null
      case 4:
        return data.tone !== null
      default:
        return false
    }
  }

  const handleNext = () => {
    if (currentStep < 4) {
      setCurrentStep((prev) => prev + 1)
      setError(null)
    } else {
      handleSubmit()
    }
  }

  const handleBack = () => {
    if (currentStep > 0) {
      setCurrentStep((prev) => prev - 1)
      setError(null)
    }
  }

  const handleSubmit = async (skipped: boolean = false) => {
    setIsLoading(true)
    setError(null)

    try {
      const payload = skipped
        ? { skipped: true, businessType: null, industries: [], services: [], proposalSize: null, tone: null }
        : data

      const response = await fetch('/api/onboarding', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Error al guardar el onboarding')
      }

      router.push('/dashboard')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error desconocido')
      setIsLoading(false)
    }
  }

  const handleSkip = () => {
    handleSubmit(true)
  }

  return (
    <div className="flex min-h-screen">
      {/* Left sidebar with progress */}
      <div className="hidden w-80 flex-col gap-8 bg-slate-900 px-8 py-12 lg:flex">
        <div>
          <h1 className="text-2xl font-bold text-white">Smart Proposal Generator</h1>
          <p className="mt-2 text-slate-400">Bienvenido</p>
        </div>

        {/* Progress steps */}
        <div className="space-y-6">
          {[
            { step: 0, title: 'Tipo de negocio' },
            { step: 1, title: 'Industrias' },
            { step: 2, title: 'Servicios' },
            { step: 3, title: 'Tamaño de propuesta' },
            { step: 4, title: 'Tono preferido' },
          ].map((item) => (
            <div key={item.step} className="flex items-center gap-4">
              <div
                className={`flex h-10 w-10 items-center justify-center rounded-full font-semibold transition-all ${
                  currentStep === item.step
                    ? 'bg-[#1D9E75] text-white'
                    : currentStep > item.step
                      ? 'bg-[#1D9E75] text-white'
                      : 'bg-slate-700 text-slate-400'
                }`}
              >
                {currentStep > item.step ? (
                  <CheckCircle2 className="h-5 w-5" />
                ) : (
                  item.step + 1
                )}
              </div>
              <span
                className={`text-sm font-medium transition-colors ${
                  currentStep >= item.step ? 'text-white' : 'text-slate-400'
                }`}
              >
                {item.title}
              </span>
            </div>
          ))}
        </div>

        {/* Progress bar */}
        <div className="mt-auto">
          <div className="mb-2 flex justify-between text-xs text-slate-400">
            <span>Progreso</span>
            <span>{Math.round(((currentStep + 1) / 5) * 100)}%</span>
          </div>
          <div className="h-2 w-full overflow-hidden rounded-full bg-slate-700">
            <div
              className="h-full bg-[#1D9E75] transition-all duration-300"
              style={{ width: `${((currentStep + 1) / 5) * 100}%` }}
            />
          </div>
        </div>
      </div>

      {/* Right content area */}
      <div className="flex flex-1 flex-col items-center justify-center px-6 py-12 sm:px-12">
        <div className="w-full max-w-2xl">
          {/* Mobile progress indicator */}
          <div className="mb-8 flex items-center justify-between lg:hidden">
            <span className="text-sm font-medium text-slate-600">
              Paso {currentStep + 1} de 5
            </span>
            <div className="h-1.5 w-40 rounded-full bg-slate-200">
              <div
                className="h-full rounded-full bg-[#1D9E75] transition-all duration-300"
                style={{ width: `${((currentStep + 1) / 5) * 100}%` }}
              />
            </div>
          </div>

          {/* Step content */}
          <div className="mb-8">
            {currentStep === 0 && (
              <Step0_BusinessType
                value={data.businessType}
                onChange={handleBusinessTypeChange}
              />
            )}
            {currentStep === 1 && (
              <Step1_Industries
                values={data.industries}
                onChange={toggleIndustry}
              />
            )}
            {currentStep === 2 && (
              <Step2_Services
                values={data.services}
                onChange={toggleService}
              />
            )}
            {currentStep === 3 && (
              <Step3_ProposalSize
                value={data.proposalSize}
                onChange={handleProposalSizeChange}
              />
            )}
            {currentStep === 4 && (
              <Step4_Tone value={data.tone} onChange={handleToneChange} />
            )}
            {currentStep === 5 && (
              <Step5_Summary data={data} />
            )}
          </div>

          {/* Error message */}
          {error && (
            <div className="mb-6 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
              {error}
            </div>
          )}

          {/* Navigation buttons */}
          <div className="flex items-center gap-4">
            <button
              onClick={handleBack}
              disabled={currentStep === 0 || isLoading}
              className="flex items-center gap-2 rounded-lg border border-slate-300 px-6 py-3 font-medium text-slate-700 transition-colors disabled:opacity-50 hover:bg-slate-50"
            >
              <ChevronLeft className="h-4 w-4" />
              Atrás
            </button>
            <button
              onClick={handleNext}
              disabled={!isStepValid() || isLoading}
              className="ml-auto flex items-center gap-2 rounded-lg bg-[#1D9E75] px-6 py-3 font-medium text-white transition-colors disabled:opacity-50 hover:bg-emerald-700"
            >
              {isLoading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Procesando...
                </>
              ) : currentStep === 4 ? (
                <>
                  Comenzar
                  <CheckCircle2 className="h-4 w-4" />
                </>
              ) : (
                <>
                  Siguiente
                  <ChevronRight className="h-4 w-4" />
                </>
              )}
            </button>
          </div>

          {/* Skip button */}
          <div className="mt-4 text-center">
            <button
              onClick={handleSkip}
              disabled={isLoading}
              className="text-sm text-slate-500 transition-colors hover:text-slate-700 disabled:opacity-50"
            >
              Saltar por ahora
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

function Step0_BusinessType({
  value,
  onChange,
}: {
  value: BusinessType | null
  onChange: (value: BusinessType) => void
}) {
  return (
    <div>
      <h2 className="mb-2 text-3xl font-bold text-slate-900">Tipo de negocio</h2>
      <p className="mb-8 text-slate-600">
        Dinos qué tipo de organización eres para personalizar tus propuestas
      </p>
      <div className="space-y-3">
        {BUSINESS_TYPES.map((type) => (
          <button
            key={type.value}
            onClick={() => onChange(type.value)}
            className={`w-full rounded-lg border-2 p-4 text-left transition-all ${
              value === type.value
                ? 'border-[#1D9E75] bg-emerald-50'
                : 'border-slate-200 bg-white hover:border-slate-300'
            }`}
          >
            <div className="font-semibold text-slate-900">{type.label}</div>
            <div className="text-sm text-slate-600">{type.description}</div>
          </button>
        ))}
      </div>
    </div>
  )
}

function Step1_Industries({
  values,
  onChange,
}: {
  values: string[]
  onChange: (industry: string) => void
}) {
  return (
    <div>
      <h2 className="mb-2 text-3xl font-bold text-slate-900">Industrias objetivo</h2>
      <p className="mb-8 text-slate-600">
        Selecciona las industrias a las que atienden tus clientes (mínimo una)
      </p>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {INDUSTRIES.map((industry) => (
          <button
            key={industry}
            onClick={() => onChange(industry)}
            className={`flex items-center rounded-lg border-2 p-3 transition-all ${
              values.includes(industry)
                ? 'border-[#1D9E75] bg-emerald-50'
                : 'border-slate-200 bg-white hover:border-slate-300'
            }`}
          >
            <div
              className={`mr-3 h-5 w-5 rounded border-2 transition-colors ${
                values.includes(industry)
                  ? 'border-[#1D9E75] bg-[#1D9E75]'
                  : 'border-slate-300'
              }`}
            >
              {values.includes(industry) && (
                <svg
                  className="h-full w-full text-white"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="3"
                >
                  <polyline points="20 6 9 17 4 12" />
                </svg>
              )}
            </div>
            <span className="font-medium text-slate-900">{industry}</span>
          </button>
        ))}
      </div>
    </div>
  )
}

function Step2_Services({
  values,
  onChange,
}: {
  values: string[]
  onChange: (service: string) => void
}) {
  return (
    <div>
      <h2 className="mb-2 text-3xl font-bold text-slate-900">Servicios ofrecidos</h2>
      <p className="mb-8 text-slate-600">
        Elige los servicios que incluyes en tus propuestas (mínimo uno)
      </p>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {SERVICES.map((service) => (
          <button
            key={service}
            onClick={() => onChange(service)}
            className={`flex items-center rounded-lg border-2 p-3 transition-all ${
              values.includes(service)
                ? 'border-[#1D9E75] bg-emerald-50'
                : 'border-slate-200 bg-white hover:border-slate-300'
            }`}
          >
            <div
              className={`mr-3 h-5 w-5 rounded border-2 transition-colors ${
                values.includes(service)
                  ? 'border-[#1D9E75] bg-[#1D9E75]'
                  : 'border-slate-300'
              }`}
            >
              {values.includes(service) && (
                <svg
                  className="h-full w-full text-white"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="3"
                >
                  <polyline points="20 6 9 17 4 12" />
                </svg>
              )}
            </div>
            <span className="font-medium text-slate-900">{service}</span>
          </button>
        ))}
      </div>
    </div>
  )
}

function Step3_ProposalSize({
  value,
  onChange,
}: {
  value: string | null
  onChange: (value: string) => void
}) {
  return (
    <div>
      <h2 className="mb-2 text-3xl font-bold text-slate-900">Tamaño típico de propuesta</h2>
      <p className="mb-8 text-slate-600">
        ¿Cuál es el valor promedio de tus propuestas?
      </p>
      <div className="space-y-3">
        {PROPOSAL_SIZES.map((size) => (
          <button
            key={size.value}
            onClick={() => onChange(size.value)}
            className={`w-full rounded-lg border-2 p-4 text-left transition-all ${
              value === size.value
                ? 'border-[#1D9E75] bg-emerald-50'
                : 'border-slate-200 bg-white hover:border-slate-300'
            }`}
          >
            <div className="font-semibold text-slate-900">{size.label}</div>
          </button>
        ))}
      </div>
    </div>
  )
}

function Step4_Tone({
  value,
  onChange,
}: {
  value: Tone | null
  onChange: (value: Tone) => void
}) {
  return (
    <div>
      <h2 className="mb-2 text-3xl font-bold text-slate-900">Tono preferido</h2>
      <p className="mb-8 text-slate-600">
        ¿Cómo quieres que suenen tus propuestas?
      </p>
      <div className="space-y-3">
        {TONES.map((tone) => (
          <button
            key={tone.value}
            onClick={() => onChange(tone.value)}
            className={`w-full rounded-lg border-2 p-4 text-left transition-all ${
              value === tone.value
                ? 'border-[#1D9E75] bg-emerald-50'
                : 'border-slate-200 bg-white hover:border-slate-300'
            }`}
          >
            <div className="font-semibold text-slate-900">{tone.label}</div>
            <div className="text-sm text-slate-600">{tone.description}</div>
          </button>
        ))}
      </div>
    </div>
  )
}

function Step5_Summary({ data }: { data: OnboardingData }) {
  const businessTypeLabel = BUSINESS_TYPES.find(
    (t) => t.value === data.businessType
  )?.label

  return (
    <div>
      <h2 className="mb-2 text-3xl font-bold text-slate-900">Resumen</h2>
      <p className="mb-8 text-slate-600">Revisa tus respuestas antes de comenzar</p>

      <div className="space-y-4 rounded-lg bg-slate-50 p-6">
        <div>
          <h3 className="mb-2 font-semibold text-slate-900">Tipo de negocio</h3>
          <p className="text-slate-700">{businessTypeLabel}</p>
        </div>

        <div className="border-t border-slate-200 pt-4">
          <h3 className="mb-2 font-semibold text-slate-900">Industrias</h3>
          <div className="flex flex-wrap gap-2">
            {data.industries.map((industry) => (
              <span
                key={industry}
                className="inline-block rounded-full bg-emerald-100 px-3 py-1 text-sm text-emerald-700"
              >
                {industry}
              </span>
            ))}
          </div>
        </div>

        <div className="border-t border-slate-200 pt-4">
          <h3 className="mb-2 font-semibold text-slate-900">Servicios</h3>
          <div className="flex flex-wrap gap-2">
            {data.services.map((service) => (
              <span
                key={service}
                className="inline-block rounded-full bg-blue-100 px-3 py-1 text-sm text-blue-700"
              >
                {service}
              </span>
            ))}
          </div>
        </div>

        <div className="border-t border-slate-200 pt-4">
          <h3 className="mb-2 font-semibold text-slate-900">Tamaño de propuesta</h3>
          <p className="text-slate-700">
            {PROPOSAL_SIZES.find((s) => s.value === data.proposalSize)?.label}
          </p>
        </div>

        <div className="border-t border-slate-200 pt-4">
          <h3 className="mb-2 font-semibold text-slate-900">Tono</h3>
          <p className="text-slate-700">
            {TONES.find((t) => t.value === data.tone)?.label}
          </p>
        </div>
      </div>
    </div>
  )
}
