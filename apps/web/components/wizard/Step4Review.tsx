'use client'

import { useState, useCallback } from 'react'
import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Placeholder from '@tiptap/extension-placeholder'
import { FileText, Download, Mail, Share2, Plus, Building2, Bold, Italic } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import type { ClientData } from './Step1Client'
import type { ProposalSections } from './Step3Generate'

const SECTION_LABELS: Record<keyof ProposalSections, string> = {
  resumenEjecutivo: 'Resumen Ejecutivo',
  problema: 'El Problema',
  solucion: 'Nuestra Solución',
  alcance: 'Alcance del Proyecto',
  timeline: 'Cronograma',
  inversion: 'Inversión',
  proximosPasos: 'Próximos Pasos',
}

const SECTION_ORDER: (keyof ProposalSections)[] = [
  'resumenEjecutivo', 'problema', 'solucion', 'alcance',
  'timeline', 'inversion', 'proximosPasos',
]

interface SectionEditorProps {
  sectionKey: keyof ProposalSections
  initialContent: string
  onChange: (key: keyof ProposalSections, text: string) => void
}

function SectionEditor({ sectionKey, initialContent, onChange }: SectionEditorProps) {
  const [focused, setFocused] = useState(false)
  const [hovered, setHovered] = useState(false)

  const editor = useEditor({
    extensions: [
      StarterKit,
      Placeholder.configure({
        placeholder: 'Escribe aquí...',
      }),
    ],
    content: initialContent
      ? `<p>${initialContent.replace(/\n\n/g, '</p><p>').replace(/\n/g, '<br>')}</p>`
      : '',
    editable: true,
    onUpdate: ({ editor }) => {
      onChange(sectionKey, editor.getText())
    },
    onFocus: () => setFocused(true),
    onBlur: () => setFocused(false),
  })

  const showToolbar = focused || hovered

  return (
    <div
      className="relative"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {/* Minimal toolbar — only visible on focus/hover */}
      <div
        className={`flex items-center gap-1 mb-1.5 transition-opacity duration-150 ${
          showToolbar ? 'opacity-100' : 'opacity-0 pointer-events-none'
        }`}
      >
        <button
          type="button"
          onMouseDown={(e) => {
            e.preventDefault()
            editor?.chain().focus().toggleBold().run()
          }}
          className={`p-1 rounded hover:bg-gray-100 transition-colors ${
            editor?.isActive('bold') ? 'bg-gray-100 text-gray-900' : 'text-gray-400'
          }`}
          title="Negrita"
        >
          <Bold className="h-3.5 w-3.5" />
        </button>
        <button
          type="button"
          onMouseDown={(e) => {
            e.preventDefault()
            editor?.chain().focus().toggleItalic().run()
          }}
          className={`p-1 rounded hover:bg-gray-100 transition-colors ${
            editor?.isActive('italic') ? 'bg-gray-100 text-gray-900' : 'text-gray-400'
          }`}
          title="Cursiva"
        >
          <Italic className="h-3.5 w-3.5" />
        </button>
        <div className="w-px h-3.5 bg-gray-200 mx-0.5" />
        <span className="text-[10px] text-gray-300 select-none">editar</span>
      </div>

      <EditorContent
        editor={editor}
        className={`
          text-base text-gray-600 leading-relaxed
          rounded-md transition-colors duration-150
          [&_.tiptap]:outline-none
          [&_.tiptap]:min-h-[1.5em]
          [&_.tiptap_p]:mb-3
          [&_.tiptap_p:last-child]:mb-0
          [&_.tiptap_.is-editor-empty:first-child::before]:content-[attr(data-placeholder)]
          [&_.tiptap_.is-editor-empty:first-child::before]:text-gray-300
          [&_.tiptap_.is-editor-empty:first-child::before]:float-left
          [&_.tiptap_.is-editor-empty:first-child::before]:pointer-events-none
          [&_.tiptap_.is-editor-empty:first-child::before]:h-0
          ${focused ? 'bg-gray-50/60 rounded px-2 -mx-2' : ''}
        `}
      />
    </div>
  )
}

interface Step4ReviewProps {
  client: ClientData
  sections: ProposalSections
  onBack: () => void
}

export function Step4Review({ client, sections, onBack }: Step4ReviewProps) {
  const [editedSections, setEditedSections] = useState<ProposalSections>(sections)
  const [exporting, setExporting] = useState<'pdf' | 'docx' | null>(null)

  const handleSectionChange = useCallback(
    (key: keyof ProposalSections, text: string) => {
      setEditedSections((prev) => ({ ...prev, [key]: text }))
    },
    [],
  )

  async function handleExport(format: 'pdf' | 'docx') {
    setExporting(format)
    try {
      const res = await fetch('/api/proposals/export', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sections: editedSections, client, format }),
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

  const today = new Date().toLocaleDateString('es-ES', {
    year: 'numeric', month: 'long', day: 'numeric',
  })

  return (
    <div className="flex gap-6 items-start">
      {/* Document preview */}
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
                <h2 className="text-lg font-bold text-gray-900 mb-3 flex items-center gap-2">
                  <span className="text-xs font-bold text-[#1D9E75] bg-[#e6f7f2] px-2 py-0.5 rounded">
                    {String(i + 1).padStart(2, '0')}
                  </span>
                  {SECTION_LABELS[key]}
                </h2>
                <SectionEditor
                  sectionKey={key}
                  initialContent={sections[key] ?? ''}
                  onChange={handleSectionChange}
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

      {/* Actions sidebar */}
      <div className="w-52 flex-shrink-0 sticky top-6">
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 space-y-3">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
            Exportar
          </p>

          <Button
            className="w-full justify-start gap-2 bg-[#1D9E75] hover:bg-[#158a63] text-white"
            size="sm"
            onClick={() => handleExport('pdf')}
            disabled={!!exporting}
          >
            <FileText className="h-4 w-4" />
            {exporting === 'pdf' ? 'Generando...' : 'PDF'}
          </Button>

          <Button
            variant="outline"
            className="w-full justify-start gap-2"
            size="sm"
            onClick={() => handleExport('docx')}
            disabled={!!exporting}
          >
            <Download className="h-4 w-4" />
            {exporting === 'docx' ? 'Generando...' : 'Word (.docx)'}
          </Button>

          <Button
            variant="outline"
            className="w-full justify-start gap-2"
            size="sm"
            disabled
          >
            <Mail className="h-4 w-4" />
            Enviar por email
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
      </div>
    </div>
  )
}
