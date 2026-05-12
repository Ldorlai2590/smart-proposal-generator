'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Check, Minus } from 'lucide-react'

type Plan = {
  name: string
  price: string
  priceAnnual?: string
  annualTotal?: string
  period: string
  localEquivalent?: string
  localEquivalentAnnual?: string
  annualBadge?: string
  description: string
  descriptionAnnual?: string
  cta: string
  ctaHref: string
  popular: boolean
  urgencyNote?: string
  features: { label: string; included: boolean }[]
}

const PLANS: Plan[] = [
  {
    name: 'Starter',
    price: 'USD $0',
    period: '',
    description: '3 propuestas/mes para siempre. Ideal para probar la plataforma.',
    cta: 'Crear cuenta gratis',
    ctaHref: '/sign-up',
    popular: false,
    features: [
      { label: '3 propuestas al mes (gratis para siempre)', included: true },
      { label: '1 usuario', included: true },
      { label: 'Templates básicos + IA', included: true },
      { label: 'Export PDF', included: true },
      { label: 'Analytics básico', included: true },
      { label: 'Soporte por email', included: true },
      { label: 'Export Word', included: false },
      { label: 'API access', included: false },
    ],
  },
  {
    name: 'Pro',
    price: 'USD $49',
    priceAnnual: 'USD $39',
    annualTotal: 'facturado anual USD $468',
    period: '/mes',
    localEquivalent: '≈ CLP 47.000 / MXN 980 / COP 195.000',
    localEquivalentAnnual: '≈ CLP 37.500 / MXN 780 / COP 155.000',
    annualBadge: 'Ahorra 20% con plan anual',
    description: 'Prueba Pro 30 días gratis → luego USD $49/mes. Sin tarjeta, 20 propuestas incluidas.',
    descriptionAnnual: 'Prueba Pro 30 días gratis → luego USD $39/mes. Sin tarjeta, 20 propuestas incluidas.',
    cta: 'Empezar prueba de 30 días',
    ctaHref: '/sign-up',
    popular: true,
    urgencyNote: 'Precio de lanzamiento — sube a USD $69 en julio 2026',
    features: [
      { label: '30 días gratis · Sin tarjeta · 20 propuestas', included: true },
      { label: 'Luego: propuestas ilimitadas', included: true },
      { label: 'Hasta 5 usuarios', included: true },
      { label: 'Todos los templates + IA avanzada', included: true },
      { label: 'Export PDF y Word', included: true },
      { label: 'Analytics completo + tasa de cierre', included: true },
      { label: 'Envío por email desde la plataforma', included: true },
      { label: 'Soporte prioritario', included: true },
    ],
  },
  {
    name: 'Enterprise',
    price: 'Consultar',
    period: '',
    description: 'Para organizaciones con equipos grandes o necesidades de compliance.',
    cta: 'Contactar ventas',
    ctaHref: 'mailto:hola@smartspg.com',
    popular: false,
    features: [
      { label: 'Propuestas ilimitadas', included: true },
      { label: 'Usuarios ilimitados', included: true },
      { label: 'Templates custom para tu marca', included: true },
      { label: 'Export PDF y Word', included: true },
      { label: 'Analytics avanzado + exports', included: true },
      { label: 'SSO + controles de seguridad', included: true },
      { label: 'SLA + soporte dedicado', included: true },
      { label: 'API access', included: true },
    ],
  },
]

export function PricingTable() {
  const [annual, setAnnual] = useState(false)

  return (
    <section id="pricing" className="py-20">
      <div className="max-w-6xl mx-auto px-4">
        <div className="text-center mb-4">
          <span className="inline-flex items-center gap-2 bg-[#f0faf8] text-[#158a63] text-xs font-semibold px-3 py-1.5 rounded-full">
            Precios en USD · Facturación en tu moneda local
          </span>
        </div>
        <div className="text-center mb-8">
          <h2 className="text-3xl font-bold text-gray-900 mb-3">Precios simples y transparentes</h2>
          <p className="text-gray-500 text-lg">
            Empieza gratis o prueba <strong className="text-[#1D9E75]">Pro 30 días sin tarjeta</strong>. Cancela cuando quieras.
          </p>
        </div>

        {/* Billing toggle */}
        <div className="flex items-center justify-center gap-3 mb-10">
          <span className={`text-sm font-medium ${!annual ? 'text-gray-900' : 'text-gray-400'}`}>Mensual</span>
          <button
            onClick={() => setAnnual(!annual)}
            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none ${
              annual ? 'bg-[#1D9E75]' : 'bg-gray-200'
            }`}
            aria-label="Cambiar entre facturación mensual y anual"
          >
            <span
              className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${
                annual ? 'translate-x-6' : 'translate-x-1'
              }`}
            />
          </button>
          <span className={`text-sm font-medium ${annual ? 'text-gray-900' : 'text-gray-400'}`}>
            Anual
            <span className="ml-1.5 inline-block bg-[#e6f7f2] text-[#1D9E75] text-[11px] font-semibold px-2 py-0.5 rounded-full">
              -20%
            </span>
          </span>
        </div>

        <div className="grid md:grid-cols-3 gap-6 items-start">
          {PLANS.map((plan) => {
            const isAnnualPro = annual && !!plan.priceAnnual
            const displayPrice = isAnnualPro ? plan.priceAnnual! : plan.price
            const displayLocal = isAnnualPro && plan.localEquivalentAnnual ? plan.localEquivalentAnnual : plan.localEquivalent
            const displayDescription = isAnnualPro && plan.descriptionAnnual ? plan.descriptionAnnual : plan.description

            return (
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
                  <div className="flex items-baseline gap-1 mb-1">
                    {isAnnualPro && (
                      <span className="text-lg font-semibold text-gray-300 line-through mr-1">{plan.price}</span>
                    )}
                    <span className="text-3xl font-black text-gray-900">{displayPrice}</span>
                    <span className="text-gray-400 text-sm">{plan.period}</span>
                  </div>
                  {isAnnualPro && plan.annualTotal && (
                    <p className="text-xs text-[#158a63] font-medium mb-1">{plan.annualTotal}</p>
                  )}
                  {displayLocal && (
                    <p className="text-xs text-gray-400 mb-1">{displayLocal}</p>
                  )}
                  {!annual && plan.annualBadge && (
                    <span className="inline-block bg-[#e6f7f2] text-[#1D9E75] text-[11px] font-semibold px-2 py-0.5 rounded-full mb-2">
                      {plan.annualBadge}
                    </span>
                  )}
                  <p className="text-sm text-gray-500 mt-2">{displayDescription}</p>
                  {plan.urgencyNote && (
                    <p className="text-xs text-gray-400 mt-1">{plan.urgencyNote}</p>
                  )}
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
                      <span className={`text-sm ${feature.included ? 'text-gray-700' : 'text-gray-300'}`}>
                        {feature.label}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            )
          })}
        </div>

        <p className="text-center text-sm text-gray-400 mt-8">
          Sin tarjeta para el trial · Cancela en 1 clic · Soporte en español
        </p>
      </div>
    </section>
  )
}
