import Link from 'next/link'
import { CreditCard, Sparkles, AlertTriangle, Clock } from 'lucide-react'
import type { TrialStatus } from '@/lib/trial'

interface TrialBannerProps {
  status: TrialStatus
}

// ---------------------------------------------------------------------------
// Banner persistente del trial híbrido.
// Se renderiza en el top del dashboard layout según el stage:
//
//   no_card    → verde, "Tienes N días gratis. Añade tarjeta para +30 días."
//   with_card  → azul, "Trial extendido. Se cobrará $X el día Y."
//   expired    → rojo, "Trial vencido. Añade método de pago para continuar."
// ---------------------------------------------------------------------------
export function TrialBanner({ status }: TrialBannerProps) {
  if (!status.shouldShowBanner) return null

  if (status.stage === 'expired') {
    return (
      <div className="mb-6 flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 p-4">
        <AlertTriangle className="mt-0.5 h-5 w-5 flex-shrink-0 text-red-600" />
        <div className="flex-1">
          <p className="text-sm font-semibold text-red-900">
            Tu prueba gratuita ha vencido
          </p>
          <p className="mt-0.5 text-sm text-red-700">
            Añade un método de pago para continuar generando propuestas con IA.
          </p>
        </div>
        <Link
          href="/billing"
          className="flex items-center gap-1.5 rounded-lg bg-red-600 px-3 py-2 text-xs font-semibold text-white transition-colors hover:bg-red-700"
        >
          <CreditCard className="h-3.5 w-3.5" />
          Añadir tarjeta
        </Link>
      </div>
    )
  }

  if (status.stage === 'with_card') {
    return (
      <div className="mb-6 flex items-center gap-3 rounded-xl border border-blue-200 bg-blue-50 p-4">
        <Clock className="h-5 w-5 flex-shrink-0 text-blue-600" />
        <div className="flex-1">
          <p className="text-sm font-semibold text-blue-900">
            Trial extendido activo — {status.daysLeft}{' '}
            {status.daysLeft === 1 ? 'día restante' : 'días restantes'}
          </p>
          <p className="mt-0.5 text-sm text-blue-700">
            No se te cobrará hasta que termine la prueba. Cancela cuando quieras desde{' '}
            <Link href="/billing" className="underline font-medium">
              billing
            </Link>
            .
          </p>
        </div>
        <div className="text-right">
          <div className="text-xs text-blue-700">Propuestas este mes</div>
          <div className="text-sm font-bold text-blue-900">
            {status.proposalsUsed} / {status.proposalsQuota}
          </div>
        </div>
      </div>
    )
  }

  // stage === 'no_card'
  const isUrgent = status.daysLeft <= 5
  return (
    <div
      className={`mb-6 flex items-center gap-3 rounded-xl border p-4 ${
        isUrgent
          ? 'border-amber-200 bg-amber-50'
          : 'border-[#1D9E75]/20 bg-[#1D9E75]/5'
      }`}
    >
      <Sparkles
        className={`h-5 w-5 flex-shrink-0 ${
          isUrgent ? 'text-amber-600' : 'text-[#1D9E75]'
        }`}
      />
      <div className="flex-1">
        <p
          className={`text-sm font-semibold ${
            isUrgent ? 'text-amber-900' : 'text-gray-900'
          }`}
        >
          {isUrgent
            ? `Quedan ${status.daysLeft} ${
                status.daysLeft === 1 ? 'día' : 'días'
              } de tu prueba gratis`
            : `Estás en tu prueba gratuita — ${status.daysLeft} días restantes`}
        </p>
        <p
          className={`mt-0.5 text-sm ${
            isUrgent ? 'text-amber-700' : 'text-gray-600'
          }`}
        >
          Añade una tarjeta y obtén <strong>30 días adicionales gratis</strong>. Sin cobros hasta
          el final del trial.
        </p>
      </div>
      <div className="hidden sm:block text-right mr-3">
        <div className="text-xs text-gray-500">Propuestas usadas</div>
        <div className="text-sm font-bold text-gray-900">
          {status.proposalsUsed} / {status.proposalsQuota}
        </div>
      </div>
      <Link
        href="/billing"
        className={`flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-semibold text-white transition-colors ${
          isUrgent
            ? 'bg-amber-600 hover:bg-amber-700'
            : 'bg-[#1D9E75] hover:bg-[#158a63]'
        }`}
      >
        <CreditCard className="h-3.5 w-3.5" />
        Extender 30 días
      </Link>
    </div>
  )
}
