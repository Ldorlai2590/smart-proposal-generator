import { auth } from '@clerk/nextjs/server'
import { redirect } from 'next/navigation'
import { getTrialStatus } from '@/lib/trial'
import { CreditCard, Check, Sparkles } from 'lucide-react'

export default async function BillingPage() {
  const { orgId } = await auth()
  if (!orgId) redirect('/select-org')

  const trial = await getTrialStatus(orgId)
  if (!trial) return <div>Tenant no encontrado</div>

  const progressPct = Math.min(
    100,
    (trial.proposalsUsed / Math.max(1, trial.proposalsQuota)) * 100
  )

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Billing</h1>
        <p className="text-sm text-gray-500 mt-1">
          Gestiona tu plan, método de pago y uso mensual.
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
                  trial.daysLeft === 1 ? 'día restante' : 'días restantes'
                } · vence el ${trial.trialEndsAt.toLocaleDateString('es')}`}
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
            <span>Propuestas generadas este período</span>
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

      {/* CTA de extensión de trial */}
      {trial.stage === 'no_card' && (
        <div className="rounded-2xl border-2 border-[#1D9E75]/30 bg-gradient-to-br from-[#1D9E75]/5 to-transparent p-6">
          <div className="flex items-center gap-2 mb-3">
            <Sparkles className="h-5 w-5 text-[#1D9E75]" />
            <h2 className="text-lg font-bold text-gray-900">
              Obtén 30 días adicionales gratis
            </h2>
          </div>
          <p className="text-sm text-gray-600 mb-4">
            Añade una tarjeta ahora y extenderemos tu prueba gratis por 30 días más —
            sin cobros hasta que termine la prueba extendida. Cancela cuando quieras.
          </p>
          <ul className="space-y-2 mb-5">
            {[
              'Propuestas ilimitadas durante todo el período extendido',
              'Acceso a todos los templates y funciones Pro',
              'Sin cobros hasta el día 60',
              'Cancelación con 1 click',
            ].map((item) => (
              <li key={item} className="flex items-start gap-2 text-sm text-gray-700">
                <Check className="h-4 w-4 text-[#1D9E75] mt-0.5 flex-shrink-0" />
                {item}
              </li>
            ))}
          </ul>
          <form action="/api/billing/create-setup-intent" method="post">
            <button
              type="submit"
              className="flex items-center gap-2 rounded-xl bg-[#1D9E75] px-5 py-3 text-sm font-semibold text-white transition-colors hover:bg-[#158a63]"
            >
              <CreditCard className="h-4 w-4" />
              Añadir tarjeta y extender trial
            </button>
          </form>
        </div>
      )}

      {/* Estado with_card */}
      {trial.stage === 'with_card' && (
        <div className="rounded-2xl border border-blue-200 bg-blue-50 p-6">
          <h2 className="text-lg font-bold text-blue-900 mb-2">
            Trial extendido activo
          </h2>
          <p className="text-sm text-blue-700">
            Tienes una tarjeta registrada. No se cobrará hasta el{' '}
            <strong>{trial.trialEndsAt.toLocaleDateString('es')}</strong>. Cuando termine
            el trial, pasarás automáticamente al plan Pro ($49/mes) a menos que canceles.
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
            Añade un método de pago y activa el plan Pro para continuar generando
            propuestas.
          </p>
          <form action="/api/billing/create-setup-intent" method="post">
            <button
              type="submit"
              className="flex items-center gap-2 rounded-xl bg-red-600 px-5 py-3 text-sm font-semibold text-white transition-colors hover:bg-red-700"
            >
              <CreditCard className="h-4 w-4" />
              Activar plan Pro
            </button>
          </form>
        </div>
      )}
    </div>
  )
}

function labelForStage(stage: string): string {
  switch (stage) {
    case 'no_card':
      return 'Prueba gratuita'
    case 'with_card':
      return 'Prueba extendida'
    case 'active':
      return 'Suscripción activa'
    case 'expired':
      return 'Prueba vencida'
    default:
      return 'Desconocido'
  }
}
