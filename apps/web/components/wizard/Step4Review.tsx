'use client'

import { useState } from 'react'
import { FileText, Download, Mail, ChevronDown, ChevronUp } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import type { ClientData } from './Step1Client'
import type { ProposalSections } from './Step3Generate'

const SECTION_LABELS: Record<keyof ProposalSections, string> = {
  resumenEjecutivo: 'Resumen Ejecutivo',
  problema: 'Problema',
  solucion: 'Solución',
  alcance: 'Alcance del Proyecto',
  timeline: 'Cronograma',
  inversion: 'Inversión',
  proximosPasos: 'Próximos Pasos',
}

const SECTION_ORDER: (keyof ProposalSections)[] = [
  'resumenEjecutivo',
  'problema',
  'solucion',
  'alcance',
  'timeline',
  'inversion',
  'proximosPasos',
]

interface SectionCardProps {
  label: string
  content: string
}

function SectionCard({ label, content }: SectionCardProps) {
  const [expanded, setExpanded] = useState(true)
  return (
    <div className="border border-gray-100 rounded-xl overflow-hidden">
      <button
        className="w-full flex items-center justify-between px-4 py-3 bg-gray-50 hover:bg-gray-100 transition-colors text-left"
        onClick={() => setExpanded((e) => !e)}
      >
        <span className="text-sm font-medium text-gray-900">{label}</span>
        {expanded ? (
          <ChevronUp className="h-4 w-4 text-gray-400" />
        ) : (
          <ChevronDown className="h-4 w-4 text-gray-400" />
        )}
      </button>
      {expanded && (
        <div className="px-4 py-3">
          <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap">{content}</p>
        </div>
      )}
    </div>
  )
}

interface Step4ReviewProps {
  client: ClientData
  sections: ProposalSections
  onBack: () => void
}

export function Step4Review({ client, sections, onBack }: Step4ReviewProps) {
  const [exporting, setExporting] = useState<'pdf' | 'docx' | null>(null)

  async function handleExport(format: 'pdf' | 'docx') {
    setExporting(format)
    try {
      const res = await fetch(`/api/proposals/export`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sections, client, format }),
      })
      if (res.ok) {
        const blob = await res.blob()
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `propuesta-${client.company.toLowerCase().replace(/\s+/g, '-')}.${format}`
        a.click()
        URL.revokeObjectURL(url)
      }
    } finally {
      setExporting(null)
    }
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-semibold text-gray-900">{client.company}</h3>
          <p className="text-sm text-gray-500">{client.name}</p>
        </div>
        <Badge variant="default">Lista para exportar</Badge>
      </div>

      <div className="space-y-2 max-h-[360px] overflow-y-auto pr-1">
        {SECTION_ORDER.map((key) => (
          <SectionCard key={key} label={SECTION_LABELS[key]} content={sections[key]} />
        ))}
      </div>

      <div className="border-t border-gray-100 pt-4 space-y-3">
        <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Exportar como</p>
        <div className="flex gap-3">
          <Button
            variant="outline"
            className="flex-1"
            onClick={() => handleExport('pdf')}
            disabled={!!exporting}
          >
            <FileText className="h-4 w-4" />
            {exporting === 'pdf' ? 'Generando...' : 'PDF'}
          </Button>
          <Button
            variant="outline"
            className="flex-1"
            onClick={() => handleExport('docx')}
            disabled={!!exporting}
          >
            <Download className="h-4 w-4" />
            {exporting === 'docx' ? 'Generando...' : 'Word'}
          </Button>
          <Button variant="outline" className="flex-1" disabled>
            <Mail className="h-4 w-4" />
            Email
          </Button>
        </div>
      </div>

      <div className="flex gap-3">
        <Button variant="outline" onClick={onBack} size="lg">
          Atrás
        </Button>
        <Button size="lg" className="flex-1" onClick={() => window.location.href = '/dashboard/proposals'}>
          Finalizar
        </Button>
      </div>
    </div>
  )
}
