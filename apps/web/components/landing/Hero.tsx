'use client'

import Link from 'next/link'
import { motion } from 'framer-motion'
import { ArrowRight, Sparkles, CheckCircle2 } from 'lucide-react'

const STREAMING_SECTIONS = [
  'Diagnóstico',
  'Servicios propuestos',
  'Alcance por servicio',
  'Inversión',
  'Caso de éxito',
]

const TRUST_ITEMS = [
  '30 días gratis · Sin tarjeta',
  '20 propuestas incluidas',
  'PDF y Word al instante',
]

export function Hero() {
  return (
    <section className="relative pt-32 pb-20 overflow-hidden">
      {/* Background */}
      <div className="absolute inset-0 bg-gradient-to-br from-white via-[#e6f7f2]/30 to-white" />
      <div
        className="absolute inset-0 opacity-[0.03]"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%231D9E75' fill-opacity='1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
        }}
      />

      <div className="relative max-w-6xl mx-auto px-4">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          {/* Left — Copy */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <div className="inline-flex items-center gap-2 bg-[#e6f7f2] text-[#1D9E75] text-xs font-semibold px-3 py-1.5 rounded-full mb-6">
              <Sparkles className="h-3.5 w-3.5" />
              Powered by Claude (Anthropic)
            </div>

            <h1 className="text-4xl lg:text-5xl font-bold text-gray-900 leading-tight mb-4">
              Cierra más ventas B2B:{' '}
              <span className="text-[#1D9E75]">propuestas profesionales en 3 minutos</span>
            </h1>

            <p className="text-lg text-gray-500 leading-relaxed mb-8 max-w-lg">
              La única IA que genera propuestas multi-servicio con PDF y Word listos para enviar. Para agencias y consultoras en Chile, México y Colombia.
            </p>

            <div className="flex flex-col sm:flex-row gap-3 mb-4">
              <Link
                href="/demo-login"
                className="inline-flex items-center justify-center gap-2 bg-[#1D9E75] text-white font-semibold px-6 py-3 rounded-xl hover:bg-[#158a63] transition-colors text-sm"
              >
                Generar mi primera propuesta
                <ArrowRight className="h-4 w-4" />
              </Link>
              <a
                href="#how-it-works"
                className="inline-flex items-center justify-center gap-2 border border-gray-200 text-gray-700 font-medium px-6 py-3 rounded-xl hover:bg-gray-50 transition-colors text-sm"
              >
                Ver demo
              </a>
            </div>

            <p className="text-xs text-gray-400 mb-8">
              <span className="inline-flex items-center gap-1.5">
                <span className="inline-flex -space-x-1">
                  <span className="h-4 w-4 rounded-full bg-[#1D9E75] border border-white" />
                  <span className="h-4 w-4 rounded-full bg-[#158a63] border border-white" />
                  <span className="h-4 w-4 rounded-full bg-[#0f6b4c] border border-white" />
                </span>
                +120 equipos ya lo usan en LATAM
              </span>
            </p>

            <div className="flex flex-wrap gap-4">
              {TRUST_ITEMS.map((item) => (
                <div key={item} className="flex items-center gap-1.5 text-sm text-gray-500">
                  <CheckCircle2 className="h-4 w-4 text-[#1D9E75]" />
                  {item}
                </div>
              ))}
            </div>
          </motion.div>

          {/* Right — Animated mockup */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="hidden lg:block"
          >
            <div className="bg-[#0F172A] rounded-2xl p-6 shadow-2xl border border-[#1E293B]">
              {/* Mockup header */}
              <div className="flex items-center gap-3 mb-6 pb-4 border-b border-[#1E293B]">
                <div className="h-9 w-9 rounded-full bg-[#1D9E75] flex items-center justify-center">
                  <Sparkles className="h-4 w-4 text-white" />
                </div>
                <div>
                  <p className="text-white text-sm font-medium">Generando propuesta...</p>
                  <p className="text-[#94A3B8] text-xs">TechCorp SA · Consultoría</p>
                </div>
                <div className="ml-auto">
                  <div className="h-2 w-24 bg-[#1E293B] rounded-full overflow-hidden">
                    <motion.div
                      className="h-full bg-[#1D9E75] rounded-full"
                      initial={{ width: '0%' }}
                      animate={{ width: '71%' }}
                      transition={{ duration: 2, delay: 0.8, ease: 'easeOut' }}
                    />
                  </div>
                </div>
              </div>

              {/* Streaming sections */}
              <div className="space-y-3">
                {STREAMING_SECTIONS.map((section, i) => {
                  const done = i < 3
                  return (
                    <motion.div
                      key={section}
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.4 + i * 0.3 }}
                      className="flex items-center gap-3"
                    >
                      <div
                        className={`h-5 w-5 rounded-full flex-shrink-0 flex items-center justify-center ${
                          done
                            ? 'bg-[#1D9E75]'
                            : i === 3
                              ? 'border-2 border-[#1D9E75] animate-pulse'
                              : 'border-2 border-[#1E293B]'
                        }`}
                      >
                        {done && (
                          <svg className="h-3 w-3 text-white" viewBox="0 0 12 12" fill="none">
                            <path d="M2 6l3 3 5-5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                          </svg>
                        )}
                      </div>
                      <div className="flex-1">
                        <p className={`text-xs font-medium ${done ? 'text-[#94A3B8]' : i === 3 ? 'text-white' : 'text-[#475569]'}`}>
                          {section}
                        </p>
                        {done && (
                          <div className="h-1.5 w-full bg-[#1E293B] rounded mt-1">
                            <div
                              className="h-full bg-[#334155] rounded"
                              style={{ width: `${70 + i * 10}%` }}
                            />
                          </div>
                        )}
                      </div>
                    </motion.div>
                  )
                })}
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  )
}
