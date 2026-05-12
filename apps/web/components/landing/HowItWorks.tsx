'use client'

import { motion, useInView } from 'framer-motion'
import { useRef } from 'react'
import { Users, Sparkles, Download, ArrowRight } from 'lucide-react'

const STEPS = [
  {
    number: '01',
    icon: Users,
    title: 'Elige el cliente',
    description: 'Selecciona un cliente existente o crea uno nuevo en segundos. El contexto de tu cliente personaliza cada palabra de la propuesta.',
    color: '#2563EB',
    bgColor: '#EFF6FF',
  },
  {
    number: '02',
    icon: Sparkles,
    title: 'Claude genera',
    description: 'Describe el problema, elige el template y presiona generar. Claude Sonnet redacta las 14 secciones en tiempo real, ante tus ojos.',
    color: '#1D9E75',
    bgColor: '#e6f7f2',
  },
  {
    number: '03',
    icon: Download,
    title: 'Exporta y cierra',
    description: 'Descarga en PDF profesional o Word editable. Envía por email directamente desde la plataforma. Cierra más y más rápido.',
    color: '#7C3AED',
    bgColor: '#F5F3FF',
  },
]

export function HowItWorks() {
  const ref = useRef(null)
  const inView = useInView(ref, { once: true, margin: '-100px' })

  return (
    <section id="how-it-works" className="py-20" ref={ref}>
      <div className="max-w-6xl mx-auto px-4">
        <div className="text-center mb-14">
          <h2 className="text-3xl font-bold text-gray-900 mb-3">Cómo funciona</h2>
          <p className="text-gray-500 text-lg max-w-xl mx-auto">
            De cero a propuesta lista en menos de 3 minutos.
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-6 relative">
          {/* Connector lines */}
          <div className="hidden md:block absolute top-12 left-1/3 right-1/3 h-0.5 bg-gradient-to-r from-[#EFF6FF] via-[#e6f7f2] to-[#F5F3FF]" />

          {STEPS.map((step, i) => (
            <motion.div
              key={step.number}
              initial={{ opacity: 0, y: 24 }}
              animate={inView ? { opacity: 1, y: 0 } : {}}
              transition={{ delay: i * 0.15 }}
              className="relative bg-white border border-gray-100 rounded-2xl p-6 shadow-sm"
            >
              <div className="flex items-center gap-4 mb-4">
                <div
                  className="h-12 w-12 rounded-xl flex items-center justify-center flex-shrink-0"
                  style={{ backgroundColor: step.bgColor }}
                >
                  <step.icon className="h-5 w-5" style={{ color: step.color }} />
                </div>
                <span
                  className="text-4xl font-black opacity-10"
                  style={{ color: step.color }}
                >
                  {step.number}
                </span>
              </div>
              <h3 className="text-base font-bold text-gray-900 mb-2">{step.title}</h3>
              <p className="text-sm text-gray-500 leading-relaxed">{step.description}</p>

              {i < STEPS.length - 1 && (
                <ArrowRight className="hidden md:block absolute -right-3 top-12 h-5 w-5 text-gray-300 z-10" />
              )}
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  )
}
