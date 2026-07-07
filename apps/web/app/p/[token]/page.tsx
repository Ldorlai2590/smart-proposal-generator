'use client'

import { use, useEffect, useState } from 'react'
import { Zap, Calendar, ArrowRight, Mail, Phone, Loader2 } from 'lucide-react'
import { formatCurrency, formatDate } from '@/lib/format'
import { sanitizeHTML } from '@/lib/sanitize'
import type { PartialProposalSections, ProposalSectionKey } from '@/lib/schemas/proposal'

interface PublicProposal {
  title: string
  client_name: string
  sections: PartialProposalSections
  sent_at: string | null
  budget: number | null
}

interface PublicCompany {
  name: string
  country: string
  email: string
  phone: string
}

// ─── Section metadata ────────────────────────────────────────────────────────
//
// `key` matches the column on `ProposalSections` (camelCase as produced by the
// LLM). `anchor` is the URL fragment used for ToC scrolling and the
// IntersectionObserver. `label` is the heading shown in the viewer.
//
// `cover` is the first item but rendered as the hero block, not a `<Section>`.
// The CTA block at the end consumes `ctaFinal` content but keeps the fixed
// "Aceptar propuesta" button + contact strip from the company brand.

interface SectionMeta {
  key: ProposalSectionKey
  anchor: string
  number: string
  label: string
}

const HERO_SECTION: SectionMeta = { key: 'portada', anchor: 'cover', number: '01', label: 'Portada' }

const BODY_SECTIONS: SectionMeta[] = [
  { key: 'contextoCliente',   anchor: 'context',         number: '02', label: 'Contexto del cliente' },
  { key: 'diagnostico',       anchor: 'diagnosis',       number: '03', label: 'Diagnóstico del problema' },
  { key: 'oportunidad',       anchor: 'opportunity',     number: '04', label: 'Oportunidad detectada' },
  { key: 'solucion',          anchor: 'solution',        number: '05', label: 'Solución propuesta' },
  { key: 'alcance',           anchor: 'scope',           number: '06', label: 'Alcance detallado' },
  { key: 'incluyeNoIncluye',  anchor: 'includes',        number: '07', label: 'Qué incluye / qué no incluye' },
  { key: 'metodologia',       anchor: 'methodology',     number: '08', label: 'Metodología' },
  { key: 'cronograma',        anchor: 'timeline',        number: '09', label: 'Cronograma' },
  { key: 'casosExito',        anchor: 'cases',           number: '10', label: 'Casos de éxito relevantes' },
  { key: 'diferenciadores',   anchor: 'differentiators', number: '11', label: '¿Por qué nosotros?' },
  { key: 'inversion',         anchor: 'pricing',         number: '12', label: 'Inversión' },
  { key: 'proximosPasos',     anchor: 'next-steps',      number: '13', label: 'Próximos pasos' },
]

const CTA_SECTION: SectionMeta = { key: 'ctaFinal', anchor: 'cta', number: '14', label: 'Próximo paso' }

const ALL_SECTIONS: SectionMeta[] = [HERO_SECTION, ...BODY_SECTIONS, CTA_SECTION]

// ─── Component ───────────────────────────────────────────────────────────────

export default function PublicProposalPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = use(params)
  const [proposal, setProposal] = useState<PublicProposal | null>(null)
  const [company, setCompany] = useState<PublicCompany | null>(null)
  const [loading, setLoading] = useState(true)
  const [activeSection, setActiveSection] = useState('cover')
  const [accepting, setAccepting] = useState(false)
  const [accepted, setAccepted] = useState(false)

  async function handleAccept() {
    if (accepting || accepted) return
    setAccepting(true)
    try {
      const res = await fetch(`/api/p/${encodeURIComponent(token)}/accept`, { method: 'POST' })
      if (res.ok) setAccepted(true)
    } catch {
      /* keep the button clickable so the user can retry */
    } finally {
      setAccepting(false)
    }
  }

  // Fetch the shared proposal from the public API (real proposal by UUID, or a
  // curated demo token). No auth — access is gated by the unguessable token.
  useEffect(() => {
    let cancelled = false
    setLoading(true)
    fetch(`/api/p/${encodeURIComponent(token)}`)
      .then((r) => (r.ok ? r.json() : Promise.reject(r.status)))
      .then((data: { proposal: PublicProposal; company: PublicCompany }) => {
        if (cancelled) return
        setProposal(data.proposal)
        setCompany(data.company)
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [token])

  useEffect(() => {
    if (!proposal) return
    // IntersectionObserver to highlight current section in the ToC
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) setActiveSection(entry.target.id)
        })
      },
      { rootMargin: '-30% 0px -60% 0px' }
    )
    ALL_SECTIONS.forEach((s) => {
      const el = document.getElementById(s.anchor)
      if (el) observer.observe(el)
    })
    return () => observer.disconnect()
  }, [proposal])

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4">
        <Loader2 className="h-8 w-8 text-[#1D9E75] animate-spin" />
      </div>
    )
  }

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

  const co: PublicCompany = company ?? { name: 'SmartSPG', country: '', email: '', phone: '' }
  const sections: PartialProposalSections = proposal.sections ?? {}

  return (
    <>
      {/* Top bar */}
      <header className="sticky top-0 z-30 bg-white/90 backdrop-blur-md border-b border-gray-100">
        <div className="max-w-6xl mx-auto px-4 h-14 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Zap className="h-5 w-5 text-[#1D9E75]" />
            <span className="font-bold text-gray-900">{co.name}</span>
          </div>
          <p className="text-sm text-gray-500 hidden md:block">
            Propuesta para <span className="font-semibold text-gray-900">{proposal.client_name}</span>
          </p>
        </div>
      </header>

      <div className="max-w-6xl mx-auto px-4 py-12 md:py-16 grid grid-cols-1 lg:grid-cols-[1fr_240px] gap-12">
        <main>
          {/* Hero / Cover — uses LLM-generated `portada` HTML if available, else
              falls back to the document title + client_name from DB. */}
          <section id="cover" className="mb-16 scroll-mt-20">
            <div className="bg-gradient-to-br from-[#0F172A] to-[#1E293B] text-white rounded-3xl p-8 md:p-12 shadow-2xl">
              <div className="inline-flex items-center gap-2 bg-[#1D9E75]/20 text-[#1D9E75] text-xs font-semibold px-3 py-1.5 rounded-full mb-6">
                <Zap className="h-3.5 w-3.5" /> Propuesta Comercial
              </div>

              {sections.portada ? (
                <div
                  className="prose prose-invert prose-headings:text-white prose-strong:text-white max-w-none"
                  dangerouslySetInnerHTML={{ __html: sanitizeHTML(sections.portada) }}
                />
              ) : (
                <>
                  <h1 className="text-3xl md:text-5xl font-bold leading-tight mb-4">
                    {proposal.title.split(' — ')[0]}
                  </h1>
                  <p className="text-lg text-gray-300">
                    Preparada para <span className="text-white font-semibold">{proposal.client_name}</span>
                  </p>
                </>
              )}

              <div className="flex flex-wrap gap-3 text-sm mt-8">
                <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white/10 rounded-full">
                  <Calendar className="h-3.5 w-3.5" />
                  Enviada {formatDate(proposal.sent_at ?? new Date(), 'es-CL')} · Válida 30 días
                </span>
                {co.country && (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white/10 rounded-full">
                    {co.country}
                  </span>
                )}
              </div>
            </div>
          </section>

          {/* Body sections — every block is LLM-generated HTML passed through
              the sanitizer. No hardcoded metrics, no fabricated case studies. */}
          {BODY_SECTIONS.map(({ key, anchor, number, label }) => (
            <SectionBlock
              key={anchor}
              id={anchor}
              number={number}
              title={label}
              html={sections[key]}
            />
          ))}

          {/* CTA block — combines the LLM-generated `ctaFinal` copy with the
              fixed "Aceptar propuesta" button + brand contacts. */}
          <section id="cta" className="scroll-mt-20 mt-12">
            <div className="bg-gradient-to-br from-[#1D9E75] to-[#158a63] text-white rounded-3xl p-8 md:p-12 text-center">
              {sections.ctaFinal ? (
                <div
                  className="prose prose-invert prose-headings:text-white prose-strong:text-white max-w-md mx-auto mb-6"
                  dangerouslySetInnerHTML={{ __html: sanitizeHTML(sections.ctaFinal) }}
                />
              ) : (
                <>
                  <h2 className="text-2xl md:text-3xl font-bold mb-4">¿Avanzamos?</h2>
                  <p className="text-white/80 mb-6 max-w-md mx-auto">
                    Si esta propuesta resuena contigo, coordinemos los próximos pasos.
                  </p>
                </>
              )}

              {proposal.budget != null && (
                <p className="text-white/80 text-sm mb-6">
                  Inversión total: <span className="text-white font-semibold">{formatCurrency(proposal.budget, 'USD')}</span>
                </p>
              )}

              {accepted ? (
                <div className="inline-flex items-center gap-2 px-6 py-3 bg-white/20 text-white font-semibold rounded-xl border border-white/40">
                  ✓ Propuesta aceptada — ¡gracias!
                </div>
              ) : (
                <button
                  onClick={handleAccept}
                  disabled={accepting}
                  className="inline-flex items-center gap-2 px-6 py-3 bg-white text-[#1D9E75] font-semibold rounded-xl hover:bg-gray-50 disabled:opacity-70 transition-colors"
                >
                  {accepting ? 'Enviando…' : 'Aceptar propuesta'} <ArrowRight className="h-4 w-4" />
                </button>
              )}

              <div className="flex items-center justify-center gap-4 mt-8 text-sm text-white/80 flex-wrap">
                {co.email && (
                  <a href={`mailto:${co.email}`} className="inline-flex items-center gap-1.5 hover:text-white">
                    <Mail className="h-3.5 w-3.5" />
                    {co.email}
                  </a>
                )}
                {co.phone && (
                  <a href={`tel:${co.phone}`} className="inline-flex items-center gap-1.5 hover:text-white">
                    <Phone className="h-3.5 w-3.5" />
                    {co.phone}
                  </a>
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
              {ALL_SECTIONS.map((s) => (
                <a
                  key={s.anchor}
                  href={`#${s.anchor}`}
                  className={`block text-sm py-1.5 px-2 rounded transition-colors ${
                    activeSection === s.anchor
                      ? 'bg-[#1D9E75]/10 text-[#1D9E75] font-semibold border-l-2 border-[#1D9E75] pl-3'
                      : 'text-gray-500 hover:text-gray-900 border-l-2 border-transparent pl-3'
                  }`}
                >
                  <span className="text-[10px] text-gray-400 mr-2">{s.number}</span>
                  {s.label}
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

// ─── Section block ──────────────────────────────────────────────────────────
//
// Renders a single LLM-generated body section. Missing sections (legacy
// proposals or generation failures) show a neutral placeholder instead of the
// previous hardcoded fake content. HTML always passes through `sanitizeHTML`.

function SectionBlock({
  id,
  number,
  title,
  html,
}: {
  id: string
  number: string
  title: string
  html: string | undefined
}) {
  return (
    <section id={id} className="mb-16 scroll-mt-20">
      <div className="flex items-baseline gap-3 mb-4">
        <span className="text-sm font-bold text-[#1D9E75]">{number}</span>
        <h2 className="text-2xl font-bold text-gray-900">{title}</h2>
      </div>
      <div className="text-gray-700 leading-relaxed prose prose-sm max-w-none">
        {html ? (
          <div dangerouslySetInnerHTML={{ __html: sanitizeHTML(html) }} />
        ) : (
          <p className="text-gray-400 italic">Sección en preparación.</p>
        )}
      </div>
    </section>
  )
}
