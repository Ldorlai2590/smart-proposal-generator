'use client'

import { use, useEffect, useState } from 'react'
import { Zap, Calendar, CheckCircle2, ArrowRight, Mail, Phone } from 'lucide-react'
import { findByShareToken, DEMO_COMPANY } from '@/lib/demo-v2'
import { formatCurrency, formatDate } from '@/lib/format'

const SECTIONS = [
  { id: 'cover', title: 'Portada', icon: '01' },
  { id: 'context', title: 'Contexto del cliente', icon: '02' },
  { id: 'diagnosis', title: 'Diagnóstico', icon: '03' },
  { id: 'opportunity', title: 'Oportunidad detectada', icon: '04' },
  { id: 'solution', title: 'Solución propuesta', icon: '05' },
  { id: 'scope', title: 'Alcance detallado', icon: '06' },
  { id: 'includes', title: 'Qué incluye / no incluye', icon: '07' },
  { id: 'methodology', title: 'Metodología', icon: '08' },
  { id: 'timeline', title: 'Cronograma', icon: '09' },
  { id: 'cases', title: 'Casos de éxito', icon: '10' },
  { id: 'differentiators', title: 'Diferenciadores', icon: '11' },
  { id: 'pricing', title: 'Inversión', icon: '12' },
  { id: 'next-steps', title: 'Próximos pasos', icon: '13' },
  { id: 'cta', title: 'Próximo paso', icon: '14' },
]

export default function PublicProposalPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = use(params)
  const proposal = findByShareToken(token)
  const [activeSection, setActiveSection] = useState('cover')

  useEffect(() => {
    if (!proposal) return
    // Track view (no real backend yet — just log)
    console.log('[track] view', { token, proposal: proposal.id })

    // IntersectionObserver to highlight current section
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) setActiveSection(entry.target.id)
        })
      },
      { rootMargin: '-30% 0px -60% 0px' }
    )
    SECTIONS.forEach((s) => {
      const el = document.getElementById(s.id)
      if (el) observer.observe(el)
    })
    return () => observer.disconnect()
  }, [proposal, token])

  if (!proposal) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4">
        <div className="text-center max-w-md">
          <div className="text-6xl mb-4">🔗</div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Propuesta no disponible</h1>
          <p className="text-gray-500">Este enlace ha expirado o no existe. Por favor contacta a quien te envió la propuesta.</p>
        </div>
      </div>
    )
  }

  return (
    <>
      {/* Top bar */}
      <header className="sticky top-0 z-30 bg-white/90 backdrop-blur-md border-b border-gray-100">
        <div className="max-w-6xl mx-auto px-4 h-14 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Zap className="h-5 w-5 text-[#1D9E75]" />
            <span className="font-bold text-gray-900">{DEMO_COMPANY.name}</span>
          </div>
          <p className="text-sm text-gray-500 hidden md:block">Propuesta para <span className="font-semibold text-gray-900">{proposal.client_name}</span></p>
        </div>
      </header>

      <div className="max-w-6xl mx-auto px-4 py-12 md:py-16 grid grid-cols-1 lg:grid-cols-[1fr_240px] gap-12">
        <main>
          {/* Hero / Cover */}
          <section id="cover" className="mb-16 scroll-mt-20">
            <div className="bg-gradient-to-br from-[#0F172A] to-[#1E293B] text-white rounded-3xl p-8 md:p-12 shadow-2xl">
              <div className="inline-flex items-center gap-2 bg-[#1D9E75]/20 text-[#1D9E75] text-xs font-semibold px-3 py-1.5 rounded-full mb-6">
                <Zap className="h-3.5 w-3.5" /> Propuesta Comercial
              </div>
              <h1 className="text-3xl md:text-5xl font-bold leading-tight mb-4">{proposal.title.split(' — ')[0]}</h1>
              <p className="text-lg text-gray-300 mb-8">Preparada para <span className="text-white font-semibold">{proposal.client_name}</span> · {formatDate(proposal.sent_at ?? new Date(), 'es-CL')}</p>
              <div className="flex flex-wrap gap-3 text-sm">
                <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white/10 rounded-full"><Calendar className="h-3.5 w-3.5" /> Válida 30 días</span>
                <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white/10 rounded-full">{DEMO_COMPANY.country}</span>
              </div>
            </div>
          </section>

          {/* Sections */}
          <Section id="context" number="02" title="Contexto del cliente">
            <p>Tras nuestro análisis inicial, hemos identificado que <strong>{proposal.client_name}</strong> opera en un mercado altamente competitivo donde la diferenciación digital se ha vuelto crítica. La empresa muestra fortalezas operativas claras, pero su presencia digital aún no captura todo el potencial comercial disponible.</p>
            <p className="mt-4">Esta propuesta responde a las conversaciones previas y a la necesidad expresada de acelerar el crecimiento del canal digital con un modelo medible y escalable.</p>
          </Section>

          <Section id="diagnosis" number="03" title="Diagnóstico del problema">
            <ul className="space-y-3">
              <li className="flex items-start gap-3"><span className="h-2 w-2 rounded-full bg-red-400 flex-shrink-0 mt-2" /><span><strong>CAC elevado</strong> — el costo por adquisición está 35% por encima del benchmark de la industria.</span></li>
              <li className="flex items-start gap-3"><span className="h-2 w-2 rounded-full bg-red-400 flex-shrink-0 mt-2" /><span><strong>Conversión sub-óptima</strong> — las landing pages convierten al 1.4% vs. 3.5% promedio.</span></li>
              <li className="flex items-start gap-3"><span className="h-2 w-2 rounded-full bg-red-400 flex-shrink-0 mt-2" /><span><strong>Tracking incompleto</strong> — falta visibilidad end-to-end del funnel de ventas.</span></li>
            </ul>
          </Section>

          <Section id="opportunity" number="04" title="Oportunidad detectada">
            <p>Si optimizamos los puntos críticos identificados, proyectamos:</p>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6">
              <Highlight label="Reducción de CAC" value="-30%" />
              <Highlight label="Tasa de conversión" value="3x" />
              <Highlight label="Leads calificados" value="+150%" />
            </div>
          </Section>

          <Section id="solution" number="05" title="Solución propuesta">
            <p>Implementaremos un plan integral en tres frentes que ataca tu situación específica:</p>
            <ol className="space-y-3 mt-4">
              <li><strong>1. Optimización de tracking</strong> — Setup completo de GA4 + dataLayer + integración a CRM.</li>
              <li><strong>2. Rediseño del funnel</strong> — Landing pages A/B testeadas con foco en conversión.</li>
              <li><strong>3. Paid Media inteligente</strong> — Campañas optimizadas semanalmente con foco en ROI.</li>
            </ol>
          </Section>

          <Section id="scope" number="06" title="Alcance detallado">
            <p>El equipo asignado trabajará dedicado durante el período acordado, incluyendo:</p>
            <ul className="space-y-2 mt-4">
              <li className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-[#1D9E75]" /> Auditoría inicial completa (semana 1)</li>
              <li className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-[#1D9E75]" /> Setup de tracking y dashboards (semana 2)</li>
              <li className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-[#1D9E75]" /> Lanzamiento de campañas (semana 3-4)</li>
              <li className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-[#1D9E75]" /> Optimización continua + reportería quincenal</li>
            </ul>
          </Section>

          <Section id="includes" number="07" title="Qué incluye / qué no incluye">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h4 className="font-semibold text-green-700 mb-3">Incluye</h4>
                <ul className="space-y-2 text-sm">
                  <li>✓ Estrategia integral</li>
                  <li>✓ Implementación técnica</li>
                  <li>✓ Optimización semanal</li>
                  <li>✓ Reportería quincenal</li>
                  <li>✓ Squad dedicado</li>
                </ul>
              </div>
              <div>
                <h4 className="font-semibold text-red-600 mb-3">No incluye</h4>
                <ul className="space-y-2 text-sm">
                  <li>✗ Presupuesto de medios (ad spend)</li>
                  <li>✗ Producción de video</li>
                  <li>✗ Hosting de infraestructura</li>
                </ul>
              </div>
            </div>
          </Section>

          <Section id="methodology" number="08" title="Metodología">
            <p>Trabajamos con una metodología ágil de sprints quincenales con review semanal del equipo cliente. Cada decisión se basa en datos y no en suposiciones.</p>
          </Section>

          <Section id="timeline" number="09" title="Cronograma">
            <div className="space-y-3">
              {['Mes 1: Auditoría + Setup técnico', 'Mes 2: Lanzamiento campañas + landing pages', 'Mes 3: Optimización + escalamiento'].map((step, i) => (
                <div key={i} className="flex items-start gap-3 p-4 bg-white border border-gray-100 rounded-xl">
                  <div className="h-8 w-8 rounded-full bg-[#1D9E75] text-white flex items-center justify-center text-sm font-bold flex-shrink-0">{i + 1}</div>
                  <p className="text-sm">{step}</p>
                </div>
              ))}
            </div>
          </Section>

          <Section id="cases" number="10" title="Casos de éxito relevantes">
            <div className="bg-white border border-gray-100 rounded-2xl p-6">
              <p className="text-sm text-gray-500 mb-2">Cliente similar — mismo sector</p>
              <h4 className="font-semibold mb-3">Aumentamos leads 340% en 6 meses</h4>
              <p className="text-sm text-gray-600">Implementamos un funnel completo que redujo CAC en 28% y triplicó conversión en landing pages.</p>
            </div>
          </Section>

          <Section id="differentiators" number="11" title="¿Por qué nosotros?">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {(DEMO_COMPANY.differentiators ?? []).map((d, i) => (
                <div key={i} className="flex items-start gap-2 p-3 bg-[#e6f7f2] rounded-lg">
                  <CheckCircle2 className="h-4 w-4 text-[#1D9E75] flex-shrink-0 mt-0.5" />
                  <span className="text-sm">{d}</span>
                </div>
              ))}
            </div>
          </Section>

          <Section id="pricing" number="12" title="Inversión">
            <div className="bg-white border-2 border-[#1D9E75]/30 rounded-2xl p-8 text-center">
              <p className="text-sm text-gray-500 mb-2">Inversión total estimada</p>
              <p className="text-5xl font-bold text-gray-900 mb-3">{formatCurrency(proposal.budget ?? 3500, 'USD')}</p>
              <p className="text-sm text-gray-500">+ ad spend (a tu cuenta)</p>
            </div>
            <p className="text-xs text-gray-500 mt-4 text-center">Aceptamos planes mensuales o pago por proyecto. ROI estimado: 3-4x en primeros 6 meses.</p>
          </Section>

          <Section id="next-steps" number="13" title="Próximos pasos">
            <ol className="space-y-2 list-decimal list-inside">
              <li>Confirmar interés respondiendo este link.</li>
              <li>Coordinar reunión de kick-off (30 min).</li>
              <li>Firmar contrato y NDA.</li>
              <li>Iniciar auditoría técnica (3 días hábiles).</li>
            </ol>
          </Section>

          <section id="cta" className="scroll-mt-20 mt-12">
            <div className="bg-gradient-to-br from-[#1D9E75] to-[#158a63] text-white rounded-3xl p-8 md:p-12 text-center">
              <h2 className="text-2xl md:text-3xl font-bold mb-4">¿Avanzamos?</h2>
              <p className="text-white/80 mb-6 max-w-md mx-auto">Si esta propuesta resuena contigo, coordinemos los próximos 15 minutos para resolver dudas y firmar.</p>
              <button className="inline-flex items-center gap-2 px-6 py-3 bg-white text-[#1D9E75] font-semibold rounded-xl hover:bg-gray-50 transition-colors">
                Aceptar propuesta <ArrowRight className="h-4 w-4" />
              </button>
              <div className="flex items-center justify-center gap-4 mt-8 text-sm text-white/80">
                {DEMO_COMPANY.email && (
                  <a href={`mailto:${DEMO_COMPANY.email}`} className="inline-flex items-center gap-1.5 hover:text-white"><Mail className="h-3.5 w-3.5" />{DEMO_COMPANY.email}</a>
                )}
                {DEMO_COMPANY.phone && (
                  <a href={`tel:${DEMO_COMPANY.phone}`} className="inline-flex items-center gap-1.5 hover:text-white"><Phone className="h-3.5 w-3.5" />{DEMO_COMPANY.phone}</a>
                )}
              </div>
            </div>
          </section>
        </main>

        {/* Right ToC */}
        <aside className="hidden lg:block">
          <div className="sticky top-24">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">Contenido</p>
            <nav className="space-y-1">
              {SECTIONS.map((s) => (
                <a
                  key={s.id}
                  href={`#${s.id}`}
                  className={`block text-sm py-1.5 px-2 rounded transition-colors ${
                    activeSection === s.id
                      ? 'bg-[#1D9E75]/10 text-[#1D9E75] font-semibold border-l-2 border-[#1D9E75] pl-3'
                      : 'text-gray-500 hover:text-gray-900 border-l-2 border-transparent pl-3'
                  }`}
                >
                  <span className="text-[10px] text-gray-400 mr-2">{s.icon}</span>
                  {s.title}
                </a>
              ))}
            </nav>
          </div>
        </aside>
      </div>

      {/* Footer */}
      <footer className="border-t border-gray-100 mt-16 py-6 text-center text-xs text-gray-400">
        Propuesta generada con <span className="font-semibold text-[#1D9E75]">SmartSPG</span>
      </footer>
    </>
  )
}

function Section({ id, number, title, children }: { id: string; number: string; title: string; children: React.ReactNode }) {
  return (
    <section id={id} className="mb-16 scroll-mt-20">
      <div className="flex items-baseline gap-3 mb-4">
        <span className="text-sm font-bold text-[#1D9E75]">{number}</span>
        <h2 className="text-2xl font-bold text-gray-900">{title}</h2>
      </div>
      <div className="text-gray-700 leading-relaxed prose prose-sm max-w-none">
        {children}
      </div>
    </section>
  )
}

function Highlight({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-[#1D9E75]/5 border border-[#1D9E75]/20 rounded-2xl p-5 text-center">
      <p className="text-3xl font-bold text-[#1D9E75]">{value}</p>
      <p className="text-xs text-gray-600 mt-1">{label}</p>
    </div>
  )
}
