'use client'

import { useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { FileText, Download, ExternalLink, Mail, Share2, Plus, Building2, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { ProposalSectionEditor } from '@/components/editor/ProposalSectionEditor'
import type { ClientData } from './Step1Client'
import type { ProposalSections } from './Step3Generate'
import { SECTION_LABELS, SECTION_ORDER } from '@/lib/schemas/proposal'

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
  const router = useRouter()
  // editedSections stores raw HTML from TipTap (richer than plain text)
  const [editedSections, setEditedSections] = useState<ProposalSections>(sections)
  const [exporting, setExporting] = useState<ExportFormat | null>(null)
  const [_isSaving] = useState(false)
  const [toast, setToast] = useState<ExportToast | null>(null)
  const [emailRecipient, setEmailRecipient] = useState(client.email ?? '')
  const [showEmailInput, setShowEmailInput] = useState(false)
  const [emailPreviewUrl, setEmailPreviewUrl] = useState<string | null>(null)

  // ── Handlers ──────────────────────────────────────────────────────────────

  const handleSectionChange = useCallback(
    (key: keyof ProposalSections, html: string) => {
      setEditedSections((prev) => ({ ...prev, [key]: html }))
    },
    [],
  )

  const handleSaveStart = useCallback(() => {}, [])

  function showToast(format: ExportFormat, status: 'success' | 'error', message: string) {
    setToast({ format, status, message })
    setTimeout(() => setToast(null), 4000)
  }

  async function handleExport(format: ExportFormat) {
    if (format === 'email') {
      if (!emailRecipient || !emailRecipient.includes('@')) {
        setShowEmailInput(true)
        return
      }
    }

    setExporting(format)
    try {
      const body: Record<string, unknown> = {
        proposalId,
        sections: editedSections,
        client,
        format,
      }
      if (format === 'email') body.recipientEmail = emailRecipient

      const res = await fetch('/api/proposals/export', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })

      if (!res.ok) {
        let errorMsg = `Error ${res.status}`
        try {
          const errBody = (await res.json()) as { error?: string }
          if (errBody.error) errorMsg = errBody.error
        } catch {
          // ignore parse error
        }
        if (res.status === 503) {
          showToast(format, 'error', 'Función disponible en producción.')
        } else {
          showToast(format, 'error', errorMsg)
        }
        return
      }

      if (format === 'email') {
        let successMsg = 'Propuesta enviada por email correctamente.'
        try {
          const emailJson = (await res.json()) as {
            success?: boolean
            previewUrl?: string
            mode?: string
          }
          if (emailJson.previewUrl) {
            setEmailPreviewUrl(emailJson.previewUrl)
            successMsg = 'Email enviado (modo demo). Ver preview abajo.'
          }
        } catch {
          // ignore parse error — success is already confirmed by res.ok
        }
        showToast('email', 'success', successMsg)
        setShowEmailInput(false)
        return
      }

      const contentType = res.headers.get('Content-Type') ?? ''
      if (contentType.includes('application/json')) {
        const json = (await res.json()) as { url?: string }
        if (json.url) window.open(json.url, '_blank')
        return
      }

      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      const disposition = res.headers.get('Content-Disposition') ?? ''
      const filenameMatch = disposition.match(/filename="?([^"]+)"?/)
      const ext = contentType.includes('text/html') ? 'html' : format
      a.href = url
      a.download = filenameMatch?.[1] ?? `propuesta-${client.company.toLowerCase().replace(/\s+/g, '-')}.${ext}`
      a.click()
      setTimeout(() => URL.revokeObjectURL(url), 100)
      showToast(format, 'success', `Archivo descargado correctamente.`)
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

          {showEmailInput && (
            <div className="space-y-2">
              <input
                type="email"
                value={emailRecipient}
                onChange={(e) => setEmailRecipient(e.target.value)}
                placeholder="email@cliente.com"
                className="w-full text-xs border border-gray-200 rounded-lg px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-[#1D9E75]"
              />
              <Button
                size="sm"
                className="w-full bg-[#1D9E75] hover:bg-[#158a63] text-white"
                onClick={() => handleExport('email')}
                disabled={!emailRecipient.includes('@') || !!exporting}
              >
                {exporting === 'email' ? <Loader2 className="h-3 w-3 animate-spin" /> : 'Enviar'}
              </Button>
            </div>
          )}

          {emailPreviewUrl && (
            <a
              href={emailPreviewUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 text-xs text-[#1D9E75] hover:underline break-all"
            >
              <ExternalLink className="h-3.5 w-3.5 flex-shrink-0" />
              Ver email (Ethereal preview)
            </a>
          )}

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
            onClick={() => proposalId ? router.push(`/proposals/${proposalId}`) : router.push('/proposals')}
          >
            <FileText className="h-4 w-4" />
            Ver mis propuestas
          </Button>

          <Button
            variant="ghost"
            size="sm"
            className="w-full justify-start gap-2 text-gray-400"
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
