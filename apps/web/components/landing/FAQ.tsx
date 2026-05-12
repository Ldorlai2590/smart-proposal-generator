'use client'

import { useState } from 'react'
import { ChevronDown } from 'lucide-react'
import { cn } from '@/lib/utils'

const FAQS = [
  {
    q: '¿Qué pasa cuando se acaban mis 3 propuestas del plan Free?',
    a: 'Tus propuestas existentes quedan guardadas y puedes seguir viéndolas. Para generar nuevas, puedes hacer upgrade al plan Pro en cualquier momento desde tu configuración.',
  },
  {
    q: '¿Puedo cancelar en cualquier momento?',
    a: 'Sí, sin penalizaciones ni preguntas. Puedes cancelar desde tu panel de configuración y seguirás teniendo acceso hasta el final del período pagado.',
  },
  {
    q: '¿Mis datos están seguros? ¿Cómo funciona el multi-tenant?',
    a: 'Cada organización está completamente aislada a nivel de base de datos. Usamos Supabase con Row-Level Security. Ningún dato de tu empresa es visible para otros usuarios.',
  },
  {
    q: '¿En qué idiomas genera propuestas?',
    a: 'Principalmente en español (optimizado para LATAM y España), pero puedes pedir propuestas en inglés, portugués u otros idiomas simplemente describiendo el problema en ese idioma.',
  },
  {
    q: '¿Puedo personalizar el template con el logo de mi empresa?',
    a: 'En el plan Pro puedes subir tu logo y colores de marca. El PDF exportado incluirá tu identidad corporativa. En Enterprise, diseñamos templates completamente personalizados.',
  },
  {
    q: '¿Hay soporte en español?',
    a: 'Sí, todo nuestro soporte es en español. Puedes contactarnos por email o por el chat de la plataforma. El plan Pro tiene respuesta prioritaria en menos de 4 horas hábiles.',
  },
  {
    q: '¿La IA puede usar mi metodología propia de propuestas?',
    a: 'Sí. En el wizard describes tu empresa, servicios y contexto. La IA adapta la propuesta a tu forma de trabajar, no a un molde genérico.',
  },
  {
    q: '¿Las propuestas se ven genéricas o profesionales?',
    a: 'Son 100% personalizadas: incluyen nombre del cliente, diagnóstico de su problema y la solución específica de tu empresa. Nada de templates copiados.',
  },
  {
    q: '¿Funciona para mi industria? (marketing, TI, legal, consultoría...)',
    a: 'Funciona para cualquier servicio B2B. La IA entiende el contexto que describes y genera secciones relevantes para tu industria específica.',
  },
  {
    q: '¿Puedo probar antes de pagar?',
    a: 'Sí: el plan Starter es gratis para siempre con 3 propuestas/mes. El plan Pro tiene 30 días de prueba completa sin tarjeta de crédito.',
  },
  {
    q: '¿Qué pasa si la IA genera algo que no me gusta?',
    a: 'Puedes editar cualquier sección antes de exportar. El editor integrado incluye herramientas de formato y puedes ajustar cada párrafo a tu gusto.',
  },
]

const faqJsonLd = {
  '@context': 'https://schema.org',
  '@type': 'FAQPage',
  mainEntity: FAQS.map((faq) => ({
    '@type': 'Question',
    name: faq.q,
    acceptedAnswer: { '@type': 'Answer', text: faq.a },
  })),
}

export function FAQ() {
  const [open, setOpen] = useState<number | null>(null)

  return (
    <section id="faq" className="py-20">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }}
      />
      <div className="max-w-3xl mx-auto px-4">
        <div className="text-center mb-14">
          <h2 className="text-3xl font-bold text-gray-900 mb-3">Preguntas frecuentes</h2>
        </div>

        <div className="space-y-3">
          {FAQS.map((faq, i) => (
            <div
              key={faq.q}
              className="border border-gray-100 rounded-xl overflow-hidden bg-white"
            >
              <button
                className="w-full flex items-center justify-between px-6 py-4 text-left"
                onClick={() => setOpen(open === i ? null : i)}
              >
                <span className="text-sm font-semibold text-gray-900 pr-4">{faq.q}</span>
                <ChevronDown
                  className={cn(
                    'h-4 w-4 text-gray-400 flex-shrink-0 transition-transform',
                    open === i && 'rotate-180',
                  )}
                />
              </button>
              {open === i && (
                <div className="px-6 pb-5">
                  <p className="text-sm text-gray-500 leading-relaxed">{faq.a}</p>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
