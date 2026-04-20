import { FileText, Users, TrendingUp, Sparkles, Shield, Lock } from 'lucide-react'

const METRICS = [
  {
    icon: FileText,
    value: '+2,400',
    label: 'Propuestas generadas',
  },
  {
    icon: Users,
    value: '+120',
    label: 'Equipos activos en LATAM',
  },
  {
    icon: TrendingUp,
    value: '73%',
    label: 'Tasa de cierre promedio',
  },
]

const TRUST_BADGES = [
  { icon: Sparkles, label: 'Potenciado por Claude (Anthropic)' },
  { icon: Lock, label: 'Datos aislados en Supabase' },
  { icon: Shield, label: 'SOC 2 en progreso · Cumple Ley 19.628 Chile' },
]

export function SocialProof() {
  return (
    <section className="py-16 bg-gray-50 border-y border-gray-100">
      <div className="max-w-6xl mx-auto px-4">
        <p className="text-center text-sm text-gray-400 mb-10 font-medium uppercase tracking-widest">
          Confían en SmartSPG
        </p>

        {/* Metric cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mb-12">
          {METRICS.map((metric) => {
            const Icon = metric.icon
            return (
              <div
                key={metric.label}
                className="bg-white border border-gray-100 rounded-2xl p-6 text-center shadow-sm"
              >
                <div className="inline-flex items-center justify-center h-10 w-10 rounded-xl bg-[#e6f7f2] text-[#1D9E75] mb-3">
                  <Icon className="h-5 w-5" />
                </div>
                <div className="text-3xl font-black text-gray-900 mb-1">{metric.value}</div>
                <div className="text-sm text-gray-500">{metric.label}</div>
              </div>
            )
          })}
        </div>

        {/* Trust badges */}
        <div className="flex flex-wrap justify-center gap-3">
          {TRUST_BADGES.map((badge) => {
            const Icon = badge.icon
            return (
              <div
                key={badge.label}
                className="inline-flex items-center gap-2 bg-white border border-gray-100 rounded-full px-4 py-2 text-xs text-gray-600 font-medium shadow-sm"
              >
                <Icon className="h-3.5 w-3.5 text-[#1D9E75]" />
                {badge.label}
              </div>
            )
          })}
        </div>
      </div>
    </section>
  )
}
