'use client'

import { useState, useEffect, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import {
  ArrowLeft,
  FileText,
  FileDown,
  Calendar,
  Building2,
  RefreshCw,
  Loader2,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { formatCurrency, formatDate } from '@/lib/format'
import { sanitizeHTML } from '@/lib/sanitize'


// ─── Types ───────────────────────────────────────────────────

interface ProposalDetail {
  id: string
  title: string
  status: string
  client_id: string
  created_at: string
  updated_at: string
  context: Record<string, unknown>
  sections: Record<string, string>
}

type ProposalStatus = 'draft' | 'sent' | 'accepted' | 'rejected'

// ─── Section config ──────────────────────────────────────────

// 14 secciones del schema v2 (sincronizado con stream API y Step4Review)
const SECTION_ORDER: { key: string; label: string; icon: string }[] = [
  { key: 'portada', label: 'Portada', icon: '01' },
  { key: 'contextoCliente', label: 'Contexto del cliente', icon: '02' },
  { key: 'diagnostico', label: 'Diagnóstico', icon: '03' },
  { key: 'oportunidad', label: 'Oportunidad detectada', icon: '04' },
  { key: 'solucion', label: 'Solución propuesta', icon: '05' },
  { key: 'alcance', label: 'Alcance detallado', icon: '06' },
  { key: 'incluyeNoIncluye', label: 'Qué incluye / no incluye', icon: '07' },
  { key: 'metodologia', label: 'Metodología', icon: '08' },
  { key: 'cronograma', label: 'Cronograma', icon: '09' },
  { key: 'casosExito', label: 'Casos de éxito', icon: '10' },
  { key: 'diferenciadores', label: 'Diferenciadores', icon: '11' },
  { key: 'inversion', label: 'Inversión', icon: '12' },
  { key: 'proximosPasos', label: 'Próximos pasos', icon: '13' },
  { key: 'ctaFinal', label: 'CTA final', icon: '14' },
  // Backwards compat: si llega una propuesta vieja con schema 8 secciones
  { key: 'resumenEjecutivo', label: 'Resumen Ejecutivo (legacy)', icon: '★' },
  { key: 'problema', label: 'Problema (legacy)', icon: '★' },
  { key: 'serviciosPropuestos', label: 'Servicios (legacy)', icon: '★' },
  { key: 'alcancePorServicio', label: 'Alcance (legacy)', icon: '★' },
  { key: 'timeline', label: 'Timeline (legacy)', icon: '★' },
  { key: 'casoDeExito', label: 'Caso éxito (legacy)', icon: '★' },
]

const STATUS_STYLES: Record<ProposalStatus, string> = {
  accepted: 'bg-green-50 text-green-700 border-green-200',
  sent: 'bg-blue-50 text-blue-700 border-blue-200',
  draft: 'bg-gray-100 text-gray-600 border-gray-200',
  rejected: 'bg-red-50 text-red-600 border-red-200',
}

const STATUS_LABELS: Record<ProposalStatus, string> = {
  accepted: 'Aceptada',
  sent: 'Enviada',
  draft: 'Borrador',
  rejected: 'Rechazada',
}

function formatBudget(budget?: unknown): string {
  if (budget == null || typeof budget !== 'number') return ''
  return formatCurrency(budget, 'USD')
}

// ─── Component ───────────────────────────────────────────────

export default function ProposalDetailPage() {
  
  const params = useParams()
  const router = useRouter()
  const proposalId = params.id as string

  const [proposal, setProposal] = useState<ProposalDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [exporting, setExporting] = useState<'pdf' | 'docx' | null>(null)

  const fetchProposal = useCallback(async () => {
    if (!proposalId) return
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(`/api/proposals/${proposalId}`)
      if (!res.ok) {
        if (res.status === 404) throw new Error('Propuesta no encontrada')
        throw new Error(`Error ${res.status}: ${res.statusText}`)
      }
      const json = await res.json()
      setProposal(json.data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al cargar la propuesta')
    } finally {
      setLoading(false)
    }
  }, [proposalId])

  useEffect(() => {
    fetchProposal()
  }, [fetchProposal])

  const handleExport = async (format: 'pdf' | 'docx') => {
    if (!proposal) return
    setExporting(format)
    try {
      const res = await fetch('/api/proposals/export', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          proposalId: proposal.id,
          format,
          sections: proposal.sections,
        }),
      })

      if (!res.ok) {
        throw new Error(`Error al exportar: ${res.statusText}`)
      }

      const contentType = res.headers.get('Content-Type') ?? ''
      if (contentType.includes('application/json')) {
        const json = await res.json()
        if (json.url) {
          window.open(json.url, '_blank')
        }
      } else {
        // Binary file — download it
        const blob = await res.blob()
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        const disposition = res.headers.get('Content-Disposition') ?? ''
        const filenameMatch = disposition.match(/filename="?([^"]+)"?/)
        a.href = url
        a.download = filenameMatch?.[1] ?? `propuesta-${proposal.id}.${format}`
        document.body.appendChild(a)
        a.click()
        document.body.removeChild(a)
        URL.revokeObjectURL(url)
      }
    } catch (err) {
      console.error(`Export ${format} failed:`, err)
    } finally {
      setExporting(null)
    }
  }

  const status = (proposal?.status ?? 'draft') as ProposalStatus
  const validStatus = STATUS_LABELS[status] ? status : 'draft'

  // ─── Loading state ─────────────────────────────────────────
  if (loading) {
    return (
      <div>
        <div className="mb-6">
          <button
            onClick={() => router.back()}
            className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            Volver
          </button>
        </div>
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-8">
          <div className="animate-pulse space-y-6">
            <div className="h-8 w-2/3 bg-gray-200 rounded" />
            <div className="h-4 w-1/3 bg-gray-100 rounded" />
            <div className="space-y-4 mt-8">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="space-y-2">
                  <div className="h-5 w-48 bg-gray-200 rounded" />
                  <div className="h-3 w-full bg-gray-100 rounded" />
                  <div className="h-3 w-5/6 bg-gray-100 rounded" />
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    )
  }

  // ─── Error state ───────────────────────────────────────────
  if (error) {
    return (
      <div>
        <div className="mb-6">
          <Link
            href="/proposals"
            className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            Volver a propuestas
          </Link>
        </div>
        <div className="flex flex-col items-center justify-center py-20 bg-white rounded-2xl border border-gray-100 shadow-sm">
          <div className="text-4xl mb-4">:(</div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">{error}</h3>
          <p className="text-sm text-gray-500 mb-6">No pudimos cargar la propuesta solicitada.</p>
          <button
            onClick={fetchProposal}
            className="inline-flex items-center gap-2 text-sm font-semibold text-[#1D9E75] hover:text-[#158a63] transition-colors"
          >
            <RefreshCw className="h-4 w-4" />
            Reintentar
          </button>
        </div>
      </div>
    )
  }

  if (!proposal) return null

  const sections = proposal.sections ?? {}
  const visibleSections = SECTION_ORDER.filter(({ key }) => sections[key])
  const budget = proposal.context?.budget

  return (
    <div>
      {/* Back link */}
      <div className="mb-6">
        <Link
          href="/proposals"
          className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          Volver a propuestas
        </Link>
      </div>

      {/* Header card */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 mb-6">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-3 mb-2">
              <h1 className="text-xl font-bold text-gray-900 truncate">
                {proposal.title ?? 'Sin título'}
              </h1>
              <span
                className={cn(
                  'shrink-0 text-xs font-semibold px-2.5 py-1 rounded-full border',
                  STATUS_STYLES[validStatus],
                )}
              >
                {STATUS_LABELS[validStatus]}
              </span>
            </div>

            <div className="flex flex-wrap items-center gap-4 text-sm text-gray-500">
              <span className="inline-flex items-center gap-1.5">
                <Building2 className="h-3.5 w-3.5" />
                {proposal.client_id}
              </span>
              <span className="inline-flex items-center gap-1.5">
                <Calendar className="h-3.5 w-3.5" />
                {formatDate(proposal.created_at)}
              </span>
              {budget != null && typeof budget === 'number' && (
                <span className="inline-flex items-center gap-1.5 font-semibold text-gray-900">
                  {formatBudget(budget)}
                </span>
              )}
            </div>
          </div>

          {/* Export buttons */}
          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={() => handleExport('pdf')}
              disabled={exporting !== null}
              className="inline-flex items-center gap-2 text-sm font-semibold px-4 py-2 rounded-xl border border-gray-200 text-gray-700 hover:bg-gray-50 transition-colors disabled:opacity-50"
            >
              {exporting === 'pdf' ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <FileText className="h-4 w-4" />
              )}
              Exportar PDF
            </button>
            <button
              onClick={() => handleExport('docx')}
              disabled={exporting !== null}
              className="inline-flex items-center gap-2 text-sm font-semibold px-4 py-2 rounded-xl border border-gray-200 text-gray-700 hover:bg-gray-50 transition-colors disabled:opacity-50"
            >
              {exporting === 'docx' ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <FileDown className="h-4 w-4" />
              )}
              Exportar DOCX
            </button>
          </div>
        </div>
      </div>

      {/* Sections content */}
      {visibleSections.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-2xl border border-gray-100 shadow-sm">
          <FileText className="h-10 w-10 text-gray-300 mx-auto mb-3" />
          <h3 className="text-base font-semibold text-gray-900 mb-1">Sin contenido</h3>
          <p className="text-sm text-gray-400">
            Esta propuesta aún no tiene secciones generadas.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {visibleSections.map(({ key, label, icon }) => (
            <div
              key={key}
              className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden"
            >
              {/* Section header */}
              <div className="flex items-center gap-3 px-6 py-4 border-b border-gray-100">
                <span className="flex items-center justify-center h-7 w-7 rounded-lg bg-[#1D9E75]/10 text-[#1D9E75] text-xs font-bold">
                  {icon}
                </span>
                <h2 className="text-sm font-bold text-gray-900 uppercase tracking-wide">
                  {label}
                </h2>
              </div>

              {/* Section body */}
              <div
                className="px-6 py-5 prose prose-sm max-w-none text-gray-700
                  prose-headings:text-gray-900 prose-headings:font-bold prose-headings:text-sm prose-headings:mt-4 prose-headings:mb-2
                  prose-p:my-2 prose-p:leading-relaxed
                  prose-ul:my-2 prose-ul:pl-5
                  prose-ol:my-2 prose-ol:pl-5
                  prose-li:my-0.5
                  prose-strong:text-gray-900
                  prose-table:w-full prose-table:text-sm
                  prose-th:text-left prose-th:px-3 prose-th:py-2 prose-th:bg-gray-50 prose-th:font-semibold prose-th:text-gray-700 prose-th:border prose-th:border-gray-200
                  prose-td:px-3 prose-td:py-2 prose-td:border prose-td:border-gray-200"
                dangerouslySetInnerHTML={{ __html: sanitizeHTML(sections[key]) }}
              />
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
