'use client'

import { useState, useCallback } from 'react'
import { FileText, Download, Mail, Share2, Plus, Building2, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { ProposalSectionEditor } from '@/components/editor/ProposalSectionEditor'
import type { ClientData } from './Step1Client'
import type { ProposalSections } from './Step3Generate'

// ─── Section metadata ─────────────────────────────────────────────────────────

const SECTION_LABELS: Record<keyof ProposalSections, string> = {
  portada: 'Portada',
  contextoCliente: 'Contexto del cliente',
  diagnostico: 'Diagnóstico',
  oportunidad: 'Oportunidad detectada',
  solucion: 'Solución propuesta',
  alcance: 'Alcance detallado',
  incluyeNoIncluye: 'Qué incluye / no incluye',
  metodologia: 'Metodología',
  cronograma: 'Cronograma',
  casosExito: 'Casos de éxito',
  diferenciadores: 'Diferenciadores',
  inversion: 'Inversión',
  proximosPasos: 'Próximos pasos',
  ctaFinal: 'CTA final',
}

const SECTION_ORDER: (keyof ProposalSections)[] = [
  'portada',
  'contextoCliente',
  'diagnostico',
  'oportunidad',
  'solucion',
  'alcance',
  'incluyeNoIncluye',
  'metodologia',
  'cronograma',
  'casosExito',
  'diferenciadores',
  'inversion',
  'proximosPasos',
  'ctaFinal',
]

// ─── Props ────────────────────────────────────────────────────────────────────

type ExportFormat = 'pdf' | 'docx' | 'email'

interface ExportToast {
  format: ExportFormat
  status: 'success' | 'error'
  message: string
}

interface Step4ReviewProps {
  client: ClientData
  sections: ProposalSections
  proposalId: string
  onBack: () => void
}

// ─── Component ────────────────────────────────────────────────────────────────

export function Step4Review({ client, sections, proposalId, onBack }: Step4ReviewProps) {
  // editedSections stores raw HTML from TipTap (richer than plain text)
  const [editedSections, setEditedSections] = useState<ProposalSections>(sections)
  const [exporting, setExporting] = useState<ExportFormat | null>(null)
  const [isSaving, setIsSaving] = useState(false)
  const [toast, setToast] = useState<ExportToast | null>(null)

  // ── Handlers ──────────────────────────────────────────────────────────────

  const handleSectionChange = useCallback(
    (key: keyof ProposalSections, html: string) => {
      setEditedSections((prev) => ({ ...prev, [key]: html }))
    },
    [],
  )

  const handleSaveStart = useCallback(() => {
    setIsSaving(true)
    // Auto-reset after 1.5 s (section editors clear themselves at 1.2 s)
    setTimeout(() => setIsSaving(false), 1500)
  }, [])

  function showToast(format: ExportFormat, status: 'success' | 'error', message: string) {
    setToast({ format, status, message })
    setTimeout(() => setToast(null), 4000)
  }

  async function handleExport(format: ExportFormat) {
    setExporting(format)
    try {
      const res = await fetch('/api/proposals/export', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          proposalId,
          sections: editedSections,
          client,
          format,
        }),
      })

      if (!res.ok) {
        let errorMsg = `Error ${res.status}`
        try {
          const errBody = (await res.json()) as { error?: string }
          if (errBody.error) errorMsg = errBody.error
        } catch {
          // ignore parse error
        }
        showToast(format, 'error', errorMsg)
        return
      }

      if (format === 'email') {
        showToast('email', 'success', 'Propuesta enviada por email correctamente.')
        return
      }

      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `propuesta-${client.company.toLowerCase().replace(/\s+/g, '-')}.${format}`
      a.click()
      URL.revokeObjectURL(url)
      showToast(format, 'success', `${format.toUpperCase()} descargado correctamente.`)
    } catch (err: unknown) {
      console.error('[Step4] export error:', err)
      showToast(format, 'error', 'Error de conexión. Intenta nuevamente.')
    } finally {
      setExporting(null)
    }
  }

  const today = new Date().toLocaleDateString('es-ES', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="flex gap-6 items-start">
      {/* ── Document preview ── */}
      <div className="flex-1 min-w-0">
        <div className="bg-white rounded-2xl border border-gray-100 shadow-lg overflow-hidden">
          {/* Document header */}
          <div className="bg-gradient-to-r from-[#0F172A] to-[#1E293B] px-10 py-8">
            <div className="flex items-start justify-between">
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <Building2 className="h-4 w-4 text-[#94A3B8]" />
                  <span className="text-[#94A3B8] text-sm">{client.company}</span>
                </div>
                <h1 className="text-2xl font-bold text-white mb-1">Propuesta Comercial</h1>
                <p className="text-[#94A3B8] text-sm">{today}</p>
              </div>
              <div className="h-12 w-12 rounded-xl bg-[#1D9E75] flex items-center justify-center">
                <span className="text-white font-bold text-lg">
                  {client.company.charAt(0)}
                </span>
              </div>
            </div>
          </div>

          {/* Document body */}
          <div className="px-10 py-8 space-y-8 max-h-[520px] overflow-y-auto">
            {SECTION_ORDER.map((key, i) => (
              <div key={key}>
                {i > 0 && <Separator className="mb-8" />}
                <ProposalSectionEditor
                  sectionKey={key}
                  label={SECTION_LABELS[key]}
                  index={i}
                  initialContent={sections[key] ?? ''}
                  onChange={handleSectionChange}
                  onSaveStart={handleSaveStart}
                />
              </div>
            ))}

            {/* Footer */}
            <div className="pt-4 pb-2 text-center">
              <Badge variant="secondary" className="text-xs text-gray-400">
                Generado con Claude AI · SmartSPG
              </Badge>
            </div>
          </div>
        </div>
      </div>

      {/* ── Actions sidebar ── */}
      <div className="w-52 flex-shrink-0 sticky top-6 space-y-3">
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 space-y-3">
          {/* Saving indicator (sidebar level) */}
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
              Exportar
            </p>
            {isSaving && (
              <span className="text-[10px] text-gray-400 animate-pulse">Guardando...</span>
            )}
          </div>

          <Button
            className="w-full justify-start gap-2 bg-[#1D9E75] hover:bg-[#158a63] text-white"
            size="sm"
            onClick={() => handleExport('pdf')}
            disabled={!!exporting}
          >
            {exporting === 'pdf' ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <FileText className="h-4 w-4" />
            )}
            {exporting === 'pdf' ? 'Generando...' : 'PDF'}
          </Button>

          <Button
            variant="outline"
            className="w-full justify-start gap-2"
            size="sm"
            onClick={() => handleExport('docx')}
            disabled={!!exporting}
          >
            {exporting === 'docx' ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Download className="h-4 w-4" />
            )}
            {exporting === 'docx' ? 'Generando...' : 'Word (.docx)'}
          </Button>

          <Button
            variant="outline"
            className="w-full justify-start gap-2"
            size="sm"
            onClick={() => handleExport('email')}
            disabled={!!exporting}
          >
            {exporting === 'email' ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Mail className="h-4 w-4" />
            )}
            {exporting === 'email' ? 'Enviando...' : 'Enviar por email'}
          </Button>

          <Button
            variant="ghost"
            className="w-full justify-start gap-2"
            size="sm"
            disabled
          >
            <Share2 className="h-4 w-4" />
            Compartir link
          </Button>

          <Separator />

          <Button
            variant="outline"
            size="sm"
            className="w-full justify-start gap-2"
            onClick={onBack}
          >
            <Plus className="h-4 w-4" />
            Nueva propuesta
          </Button>
        </div>

        {/* Toast notification */}
        {toast && (
          <div
            className={`rounded-xl border p-3 text-xs flex items-start gap-2 shadow-sm transition-all ${
              toast.status === 'success'
                ? 'bg-[#F0FDF4] border-[#BBF7D0] text-[#166534]'
                : 'bg-[#FEF2F2] border-[#FECACA] text-[#991B1B]'
            }`}
          >
            {toast.status === 'success' ? (
              <CheckCircle2 className="h-4 w-4 flex-shrink-0 mt-0.5 text-[#16A34A]" />
            ) : (
              <AlertCircle className="h-4 w-4 flex-shrink-0 mt-0.5 text-[#DC2626]" />
            )}
            <span>{toast.message}</span>
          </div>
        )}
      </div>
    </div>
  )
}
