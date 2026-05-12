'use client'

import { motion, useInView } from 'framer-motion'
import { useRef } from 'react'
import { Zap, Shield, FileDown, Layers, BarChart3, Mail, PenLine } from 'lucide-react'

const FEATURES = [
  {
    icon: Layers,
    title: 'Multi-servicio en una propuesta',
    description: 'La única IA que agrupa consultoría, desarrollo, diseño y marketing en UN solo documento. Cada alcance estructurado de forma independiente.',
  },
  {
    icon: Zap,
    title: 'Generación en 3 minutos',
    description: 'Claude escribe tu propuesta en streaming — ves cada sección aparecer en tiempo real. De brief a propuesta lista en minutos.',
  },
  {
    icon: FileDown,
    title: 'Export PDF y Word',
    description: 'Descarga con un clic en formato profesional. PDF con diseño premium o Word editable para ajustes finales.',
  },
  {
    icon: PenLine,
    title: 'Editor integrado antes de exportar',
    description: 'Revisa y ajusta cada sección con el editor antes de exportar. Sin copiar y pegar en Word — todo en un mismo lugar.',
  },
  {
    icon: BarChart3,
    title: 'Sabe qué propuestas convierten',
    description: 'Mide tu tasa de cierre, el valor promedio por propuesta y los clientes más rentables. Decisiones con datos, no intuición.',
  },
  {
    icon: Mail,
    title: 'Envío desde la plataforma',
    description: 'Manda la propuesta por email y el cliente recibe un PDF con tu marca. Sin adjuntos genéricos, sin perder el hilo.',
  },
  {
    icon: Shield,
    title: 'Datos aislados y seguros',
    description: 'Multi-tenant con organizaciones separadas. Cumple Ley 19.628 Chile. SOC 2 en progreso.',
  },
]

export function FeaturesGrid() {
  const ref = useRef(null)
  const inView = useInView(ref, { once: true, margin: '-80px' })

  return (
    <section id="features" className="py-20 bg-gray-50" ref={ref}>
      <div className="max-w-6xl mx-auto px-4">
        <div className="text-center mb-14">
          <h2 className="text-3xl font-bold text-gray-900 mb-3">Todo lo que necesitas para cerrar más rápido</h2>
          <p className="text-gray-500 text-lg max-w-xl mx-auto">
            Construido para agencias y consultoras B2B en LATAM que no tienen tiempo que perder.
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
