'use client'

import { motion, useInView } from 'framer-motion'
import { useRef } from 'react'
import { Zap, Shield, FileDown, Layers, BarChart3, Mail } from 'lucide-react'

const FEATURES = [
  {
    icon: Zap,
    title: 'Streaming IA',
    description: 'Genera propuestas en tiempo real con Claude Sonnet. Ves cada sección aparecer mientras se escribe.',
  },
  {
    icon: Shield,
    title: 'Multi-tenant seguro',
    description: 'Organizaciones completamente separadas. Tus datos nunca se mezclan con los de otros clientes.',
  },
  {
    icon: FileDown,
    title: 'Export PDF y Word',
    description: 'Descarga con un clic en formato profesional. PDF con diseño premium o Word para edición posterior.',
  },
  {
    icon: Layers,
    title: 'Templates por industria',
    description: 'Software, consultoría, marketing, cloud y más. Cada template está optimizado para su sector.',
  },
  {
    icon: BarChart3,
    title: 'Analytics de propuestas',
    description: 'Mide tu tasa de cierre, el valor promedio por propuesta y los clientes más rentables.',
  },
  {
    icon: Mail,
    title: 'Integración con email',
    description: 'Envía la propuesta directamente desde la plataforma. El cliente recibe un PDF profesional.',
  },
]

export function FeaturesGrid() {
  const ref = useRef(null)
  const inView = useInView(ref, { once: true, margin: '-80px' })

  return (
    <section id="features" className="py-20 bg-gray-50" ref={ref}>
      <div className="max-w-6xl mx-auto px-4">
        <div className="text-center mb-14">
          <h2 className="text-3xl font-bold text-gray-900 mb-3">Todo lo que necesitas para cerrar</h2>
          <p className="text-gray-500 text-lg max-w-xl mx-auto">
            Construido para equipos de ventas que no tienen tiempo que perder.
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
          {FEATURES.map((feature, i) => (
            <motion.div
              key={feature.title}
              initial={{ opacity: 0, y: 20 }}
              animate={inView ? { opacity: 1, y: 0 } : {}}
              transition={{ delay: i * 0.08 }}
              className="bg-white border border-gray-100 rounded-2xl p-6 hover:shadow-md transition-shadow"
            >
              <div className="h-10 w-10 rounded-xl bg-[#e6f7f2] flex items-center justify-center mb-4">
                <feature.icon className="h-5 w-5 text-[#1D9E75]" />
              </div>
              <h3 className="text-base font-bold text-gray-900 mb-2">{feature.title}</h3>
              <p className="text-sm text-gray-500 leading-relaxed">{feature.description}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  )
}
