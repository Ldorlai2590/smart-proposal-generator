'use client'

import { useState, useEffect } from 'react'
import { CreditCard, Check, Sparkles, Shield, Zap, FileText, Users, BarChart3 } from 'lucide-react'

const DEMO_MODE = process.env.NEXT_PUBLIC_DEMO_MODE === 'true'

function useDemoAuth() {
  if (DEMO_MODE) return { orgId: 'demo' as string | null }
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { useAuth } = require('@clerk/nextjs')
  return useAuth() as { orgId: string | null }
}

interface TrialStatus {
  stage: 'no_card' | 'with_card' | 'active' | 'expired'
  daysLeft: number
  trialEndsAt: string
  plan: string
  proposalsUsed: number
  proposalsQuota: number
}

const DEMO_TRIAL: TrialStatus = {
  stage: 'no_card',
  daysLeft: 25,
  trialEndsAt: new Date(Date.now() + 25 * 24 * 60 * 60 * 1000).toISOString(),
  plan: 'pro',
  proposalsUsed: 7,
  proposalsQuota: 50,
}

const PRO_FEATURES = [
  { icon: FileText, label: 'Hasta 50 propuestas/mes' },
  { icon: Zap, label: 'IA generativa con contexto del cliente' },
  { icon: Users, label: 'Gestión de clientes ilimitada' },
  { icon: BarChart3, label: 'Analytics y métricas avanzadas' },
  { icon: Shield, label: 'Templates profesionales' },
]

function labelForStage(stage: string): string {
  switch (stage) {
    case 'no_card':
      return 'Prueba gratuita'
    case 'with_card':
      return 'Prueba extendida'
    case 'active':
      return 'Suscripcion activa'
    case 'expired':
      return 'Prueba vencida'
    default:
      return 'Desconocido'
  }
}

export default function BillingPage() {
  const { orgId } = useDemoAuth()
  const [trial, setTrial] = useState<TrialStatus | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!orgId) return
    if (DEMO_MODE) {
      setTrial(DEMO_TRIAL)
      setLoading(false)
      return
    }
    // Production: fetch trial status from API
    fetch('/api/billing/status')
      .then((r) => r.json())
      .then((data) => setTrial(data))
      .catch(() => setTrial(null))
      .finally(() => setLoading(false))
  }, [orgId])

  if (!orgId) return null

  if (loading) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Billing</h1>
          <p className="text-sm text-gray-500 mt-1">Cargando...</p>
        </div>
        <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm animate-pulse h-48" />
        <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm animate-pulse h-64" />
      </div>
    )
  }

  if (!trial) return <div>Tenant no encontrado</div>

  const progressPct = Math.min(
    100,
    (trial.proposalsUsed / Math.max(1, trial.proposalsQuota)) * 100
  )

  const trialEndsDate = new Date(trial.trialEndsAt)

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Billing</h1>
        <p className="text-sm text-gray-500 mt-1">
          Gestiona tu plan, metodo de pago y uso mensual.
        </p>
      </div>

      {/* Estado actual del trial */}
      <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
        <div className="flex items-start justify-between mb-4">
          <div>
            <div className="text-xs text-gray-500 uppercase tracking-wide mb-1">
              Estado actual
            </div>
            <div className="text-xl font-bold text-gray-900">
              {labelForStage(trial.stage)}
            </div>
            <div className="text-sm text-gray-500 mt-1">
              {trial.stage !== 'active' &&
                `${trial.daysLeft} ${
                  trial.daysLeft === 1 ? 'dia restante' : 'dias restantes'
                } · vence el ${trialEndsDate.toLocaleDateString('es')}`}
              {trial.stage === 'active' && `Plan ${trial.plan} activo`}
            </div>
          </div>
          <div className="rounded-full bg-[#1D9E75]/10 px-3 py-1 text-xs font-semibold text-[#1D9E75]">
            {trial.plan.toUpperCase()}
          </div>
        </div>

        {/* Barra de uso */}
        <div className="mt-6">
          <div className="flex items-center justify-between text-xs text-gray-500 mb-2">
            <span>Propuestas generadas este periodo</span>
            <span className="font-semibold text-gray-900">
              {trial.proposalsUsed} / {trial.proposalsQuota}
            </span>
          </div>
          <div className="h-2 rounded-full bg-gray-100 overflow-hidden">
            <div
              className="h-full bg-[#1D9E75] transition-all"
              style={{ width: `${progressPct}%` }}
            />
          </div>
        </div>
      </div>

      {/* Plan actual card */}
      <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-lg font-bold text-gray-900">Plan Pro Trial</h2>
            <p className="text-sm text-gray-500 mt-0.5">
              Todas las funcionalidades Pro durante tu periodo de prueba
            </p>
          </div>
          <div className="text-right">
            <div className="text-2xl font-bold text-gray-900">$0</div>
            <div className="text-xs text-gray-500">durante el trial</div>
          </div>
        </div>
        <div className="border-t border-gray-100 pt-4">
          <ul className="space-y-3">
            {PRO_FEATURES.map((feature) => (
              <li key={feature.label} className="flex items-center gap-3 text-sm text-gray-700">
                <div className="h-8 w-8 rounded-lg bg-[#1D9E75]/10 flex items-center justify-center flex-shrink-0">
                  <feature.icon className="h-4 w-4 text-[#1D9E75]" />
                </div>
                {feature.label}
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* CTA de extension de trial */}
      {trial.stage === 'no_card' && (
        <div className="rounded-2xl border-2 border-[#1D9E75]/30 bg-gradient-to-br from-[#1D9E75]/5 to-transparent p-6">
          <div className="flex items-center gap-2 mb-3">
            <Sparkles className="h-5 w-5 text-[#1D9E75]" />
            <h2 className="text-lg font-bold text-gray-900">
              Obten 30 dias adicionales gratis
            </h2>
          </div>
          <p className="text-sm text-gray-600 mb-4">
            Anade una tarjeta ahora y extenderemos tu prueba gratis por 30 dias mas —
            sin cobros hasta que termine la prueba extendida. Cancela cuando quieras.
          </p>
          <ul className="space-y-2 mb-5">
            {[
              'Propuestas ilimitadas durante todo el periodo extendido',
              'Acceso a todos los templates y funciones Pro',
              'Sin cobros hasta el dia 60',
              'Cancelacion con 1 click',
            ].map((item) => (
              <li key={item} className="flex items-start gap-2 text-sm text-gray-700">
                <Check className="h-4 w-4 text-[#1D9E75] mt-0.5 flex-shrink-0" />
                {item}
              </li>
            ))}
          </ul>
          {DEMO_MODE ? (
            <div className="relative group inline-block">
              <button
                disabled
                className="flex items-center gap-2 rounded-xl bg-gray-300 px-5 py-3 text-sm font-semibold text-gray-500 cursor-not-allowed"
              >
                <CreditCard className="h-4 w-4" />
                Agregar tarjeta
              </button>
              <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-1.5 bg-gray-900 text-white text-xs rounded-lg opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none">
                No disponible en demo
              </div>
            </div>
          ) : (
            <form action="/api/billing/create-setup-intent" method="post">
              <button
                type="submit"
                className="flex items-center gap-2 rounded-xl bg-[#1D9E75] px-5 py-3 text-sm font-semibold text-white transition-colors hover:bg-[#158a63]"
              >
                <CreditCard className="h-4 w-4" />
                Anadir tarjeta y extender trial
              </button>
            </form>
          )}
        </div>
      )}

      {/* Estado with_card */}
      {trial.stage === 'with_card' && (
        <div className="rounded-2xl border border-blue-200 bg-blue-50 p-6">
          <h2 className="text-lg font-bold text-blue-900 mb-2">
            Trial extendido activo
          </h2>
          <p className="text-sm text-blue-700">
            Tienes una tarjeta registrada. No se cobrara hasta el{' '}
            <strong>{trialEndsDate.toLocaleDateString('es')}</strong>. Cuando termine
            el trial, pasaras automaticamente al plan Pro ($49/mes) a menos que canceles.
          </p>
        </div>
      )}

      {/* Estado expired */}
      {trial.stage === 'expired' && (
        <div className="rounded-2xl border border-red-200 bg-red-50 p-6">
          <h2 className="text-lg font-bold text-red-900 mb-2">
            Tu prueba ha vencido
          </h2>
          <p className="text-sm text-red-700 mb-4">
            Anade un metodo de pago y activa el plan Pro para continuar generando
            propuestas.
          </p>
          {DEMO_MODE ? (
            <button
              disabled
              className="flex items-center gap-2 rounded-xl bg-gray-300 px-5 py-3 text-sm font-semibold text-gray-500 cursor-not-allowed"
            >
              <CreditCard className="h-4 w-4" />
              Activar plan Pro
            </button>
          ) : (
            <form action="/api/billing/create-setup-intent" method="post">
              <button
                type="submit"
                className="flex items-center gap-2 rounded-xl bg-red-600 px-5 py-3 text-sm font-semibold text-white transition-colors hover:bg-red-700"
              >
                <CreditCard className="h-4 w-4" />
                Activar plan Pro
              </button>
            </form>
          )}
        </div>
      )}
    </div>
  )
}
