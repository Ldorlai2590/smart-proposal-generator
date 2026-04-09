import Link from 'next/link'
import { Check, Minus } from 'lucide-react'

const PLANS = [
  {
    name: 'Starter',
    price: '$0',
    period: '',
    description: '30 días gratis sin tarjeta',
    cta: 'Empezar gratis',
    ctaHref: '/sign-up',
    popular: false,
    features: [
      { label: '30 días gratis sin tarjeta', included: true },
      { label: 'Hasta 20 propuestas', included: true },
      { label: '1 usuario', included: true },
      { label: 'Templates básicos + IA', included: true },
      { label: 'Export PDF', included: true },
      { label: 'Analytics básico', included: true },
      { label: 'Soporte email', included: true },
      { label: 'API access', included: false },
    ],
  },
  {
    name: 'Pro',
    price: '$49',
    period: '/mes',
    description: '60 días gratis — 30 sin tarjeta + 30 con tarjeta',
    cta: 'Empezar prueba de 60 días',
    ctaHref: '/sign-up',
    popular: true,
    features: [
      { label: '60 días de prueba gratis', included: true },
      { label: 'Propuestas ilimitadas', included: true },
      { label: 'Hasta 5 usuarios', included: true },
      { label: 'Todos los templates + IA', included: true },
      { label: 'Export PDF y Word', included: true },
      { label: 'Analytics completo', included: true },
      { label: 'Envío por email', included: true },
      { label: 'Soporte prioritario', included: true },
    ],
  },
  {
    name: 'Enterprise',
    price: 'Consultar',
    period: '',
    description: 'Para grandes organizaciones',
    cta: 'Contactar ventas',
    ctaHref: 'mailto:hola@smartspg.io',
    popular: false,
    features: [
      { label: 'Propuestas ilimitadas', included: true },
      { label: 'Usuarios ilimitados', included: true },
      { label: 'Templates custom', included: true },
      { label: 'Export PDF y Word', included: true },
      { label: 'Analytics avanzado', included: true },
      { label: 'Envío por email', included: true },
      { label: 'SLA + soporte dedicado', included: true },
      { label: 'API access', included: true },
    ],
  },
]

export function PricingTable() {
  return (
    <section id="pricing" className="py-20">
      <div className="max-w-6xl mx-auto px-4">
        <div className="text-center mb-14">
          <h2 className="text-3xl font-bold text-gray-900 mb-3">Precios simples y transparentes</h2>
          <p className="text-gray-500 text-lg">
            Prueba <strong className="text-[#1D9E75]">60 días gratis</strong>: 30 sin tarjeta + 30 al añadirla. Cancela cuando quieras.
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-6 items-start">
          {PLANS.map((plan) => (
            <div
              key={plan.name}
              className={`relative bg-white rounded-2xl p-7 ${
                plan.popular
                  ? 'border-2 border-[#1D9E75] shadow-xl shadow-[#1D9E75]/10'
                  : 'border border-gray-100 shadow-sm'
              }`}
            >
              {plan.popular && (
                <div className="absolute -top-3.5 left-1/2 -translate-x-1/2">
                  <span className="bg-[#1D9E75] text-white text-xs font-bold px-3 py-1 rounded-full">
                    Más popular
                  </span>
                </div>
              )}

              <div className="mb-6">
                <h3 className="text-base font-bold text-gray-900 mb-1">{plan.name}</h3>
                <div className="flex items-baseline gap-1 mb-2">
                  <span className="text-3xl font-black text-gray-900">{plan.price}</span>
                  <span className="text-gray-400 text-sm">{plan.period}</span>
                </div>
                <p className="text-sm text-gray-500">{plan.description}</p>
              </div>

              <Link
                href={plan.ctaHref}
                className={`block text-center text-sm font-semibold py-2.5 px-4 rounded-xl mb-6 transition-colors ${
                  plan.popular
                    ? 'bg-[#1D9E75] text-white hover:bg-[#158a63]'
                    : 'bg-gray-100 text-gray-900 hover:bg-gray-200'
                }`}
              >
                {plan.cta}
              </Link>

              <ul className="space-y-3">
                {plan.features.map((feature) => (
                  <li key={feature.label} className="flex items-center gap-2.5">
                    {feature.included ? (
                      <Check className="h-4 w-4 text-[#1D9E75] flex-shrink-0" />
                    ) : (
                      <Minus className="h-4 w-4 text-gray-200 flex-shrink-0" />
                    )}
                    <span
                      className={`text-sm ${feature.included ? 'text-gray-700' : 'text-gray-300'}`}
                    >
                      {feature.label}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
