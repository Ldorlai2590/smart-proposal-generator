'use client'

import { motion } from 'framer-motion'
import { Package, Zap, Rocket } from 'lucide-react'

const FEATURES = [
  {
    icon: Package,
    title: 'Propuestas multi-servicio',
    description: 'Un solo documento que agrupa todos tus servicios: consultoría, desarrollo, diseño, marketing. La IA estructura cada alcance de forma independiente.',
  },
  {
    icon: Zap,
    title: 'Personalización con IA',
    description: 'Claude analiza el contexto de tu cliente y genera propuestas persuasivas en español, adaptadas a cada industria.',
  },
  {
    icon: Rocket,
    title: 'De borrador a cierre en minutos',
    description: 'Genera, revisa con el editor integrado y exporta en PDF o Word. Envía por email directo desde la plataforma.',
  },
]

const CONTAINER_VARIANTS = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.2,
      delayChildren: 0.1,
    },
  },
}

const ITEM_VARIANTS = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.5 },
  },
}

export function AboutUs() {
  return (
    <section className="relative py-20 overflow-hidden">
      {/* Background */}
      <div className="absolute inset-0 bg-gradient-to-b from-white via-[#f0faf8] to-white" />
      <div
        className="absolute inset-0 opacity-[0.02]"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%231D9E75' fill-opacity='1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
        }}
      />

      <div className="relative max-w-6xl mx-auto px-4">
        {/* Heading */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          viewport={{ once: true }}
          className="text-center mb-16"
        >
          <h2 className="text-3xl lg:text-4xl font-bold text-gray-900 mb-4">
            La única herramienta que agrupa{' '}
            <span className="text-[#1D9E75]">múltiples servicios en UNA propuesta ganadora</span>
          </h2>
          <p className="text-lg text-gray-500 max-w-2xl mx-auto">
            Mientras otras herramientas te obligan a generar una propuesta por servicio, SmartSPG estructura todos tus servicios — consultoría, desarrollo, diseño, marketing — en un solo documento coherente que cierra más rápido.
          </p>
        </motion.div>

        {/* Features Grid */}
        <motion.div
          variants={CONTAINER_VARIANTS}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: '-100px' }}
          className="grid md:grid-cols-3 gap-8 mb-16"
        >
          {FEATURES.map((feature) => {
            const Icon = feature.icon
            return (
              <motion.div
                key={feature.title}
                variants={ITEM_VARIANTS}
                className="group relative bg-white rounded-xl p-8 shadow-sm hover:shadow-lg transition-shadow duration-300 border border-gray-100"
              >
                {/* Icon background */}
                <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-br from-[#e6f7f2] to-transparent rounded-full -mr-12 -mt-12 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

                <div className="relative">
                  <div className="inline-flex items-center justify-center w-12 h-12 rounded-lg bg-[#e6f7f2] text-[#1D9E75] mb-4">
                    <Icon className="h-6 w-6" />
                  </div>

                  <h3 className="text-lg font-semibold text-gray-900 mb-3">
                    {feature.title}
                  </h3>

                  <p className="text-gray-600 text-sm leading-relaxed">
                    {feature.description}
                  </p>
                </div>
              </motion.div>
            )
          })}
        </motion.div>

        {/* About Us Paragraph */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          viewport={{ once: true }}
          className="max-w-3xl mx-auto"
        >
          <div className="bg-gradient-to-r from-[#f0faf8] to-[#e6f7f2] rounded-2xl p-8 border border-[#d0ebe5]">
            <p className="text-xs font-semibold text-[#1D9E75] uppercase tracking-wider text-center mb-3">
              Nuestra diferencia
            </p>
            <p className="text-gray-700 leading-relaxed text-center">
              En Chile, México y Colombia, las agencias y consultoras pierden deals no por falta de talento, sino por llegar tarde con propuestas que se ven amateur. SmartSPG nació para cerrar esa brecha: Claude analiza el contexto de tu cliente, estructura 14 secciones —diagnóstico, solución, alcance, inversión, caso de éxito y más— y exporta en PDF y Word listos para enviar. <strong>Menos horas en Word, más contratos firmados.</strong>
            </p>
          </div>
        </motion.div>
      </div>
    </section>
  )
}
