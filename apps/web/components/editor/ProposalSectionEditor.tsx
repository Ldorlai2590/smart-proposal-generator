'use client'

import { useState, useCallback, useRef, useEffect } from 'react'
import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Placeholder from '@tiptap/extension-placeholder'
import {
  Bold,
  Italic,
  Heading2,
  Heading3,
  List,
  ListOrdered,
  ChevronDown,
  ChevronRight,
} from 'lucide-react'
import type { ProposalSections } from '@/components/wizard/Step3Generate'

// ─── Types ───────────────────────────────────────────────────────────────────

export interface ProposalSectionEditorProps {
  sectionKey: keyof ProposalSections
  label: string
  index: number
  initialContent: string
  /** Called with raw HTML whenever the editor content changes */
  onChange: (key: keyof ProposalSections, html: string) => void
  /** Signals a save is in-flight so the indicator can appear */
  onSaveStart?: () => void
}

// ─── Toolbar button ───────────────────────────────────────────────────────────

interface ToolbarButtonProps {
  active?: boolean
  title: string
  onMouseDown: React.MouseEventHandler<HTMLButtonElement>
  children: React.ReactNode
}

function ToolbarButton({ active, title, onMouseDown, children }: ToolbarButtonProps) {
  return (
    <button
      type="button"
      title={title}
      onMouseDown={onMouseDown}
      className={[
        'p-1 rounded transition-colors',
        active
          ? 'bg-gray-200 text-gray-900'
          : 'text-gray-400 hover:bg-gray-100 hover:text-gray-700',
      ].join(' ')}
    >
      {children}
    </button>
  )
}

// ─── Main component ───────────────────────────────────────────────────────────

export function ProposalSectionEditor({
  sectionKey,
  label,
  index,
  initialContent,
  onChange,
  onSaveStart,
}: ProposalSectionEditorProps) {
  const [collapsed, setCollapsed] = useState(false)
  const [focused, setFocused] = useState(false)
  const [hovered, setHovered] = useState(false)
  const [saving, setSaving] = useState(false)
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Claude already outputs semantic HTML — pass through directly without re-wrapping.
  const initialHtml = initialContent || ''

  const editor = useEditor({
    extensions: [
      StarterKit,
      Placeholder.configure({ placeholder: 'Escribe aquí...' }),
    ],
    content: initialHtml,
    editable: true,
    onFocus: () => setFocused(true),
    onBlur: () => setFocused(false),
    onUpdate: ({ editor: e }) => {
      const html = e.getHTML()
      onChange(sectionKey, html)

      // Debounced "Saving..." indicator — clears after 1.2 s
      setSaving(true)
      onSaveStart?.()
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current)
      saveTimerRef.current = setTimeout(() => setSaving(false), 1200)
    },
  })

  // Cleanup timer on unmount
  useEffect(() => {
    return () => {
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current)
    }
  }, [])

  const prevent = useCallback((fn: () => void) => (e: React.MouseEvent) => {
    e.preventDefault()
    fn()
  }, [])

  const showToolbar = (focused || hovered) && !collapsed

  return (
    <div
      className="group"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {/* ── Section header ── */}
      <div className="flex items-center gap-2 mb-3">
        {/* Number badge */}
        <span className="text-xs font-bold text-[#1D9E75] bg-[#e6f7f2] px-2 py-0.5 rounded flex-shrink-0">
          {String(index + 1).padStart(2, '0')}
        </span>

        {/* Label */}
        <h2 className="text-lg font-bold text-gray-900 flex-1">{label}</h2>

        {/* Saving indicator */}
        {saving && (
          <span className="text-xs text-gray-400 animate-pulse select-none">
            Guardando...
          </span>
        )}

        {/* Collapse toggle */}
        <button
          type="button"
          title={collapsed ? 'Expandir sección' : 'Colapsar sección'}
          onClick={() => setCollapsed((v) => !v)}
          className="p-1 rounded text-gray-300 hover:text-gray-500 hover:bg-gray-100 transition-colors"
        >
          {collapsed ? (
            <ChevronRight className="h-4 w-4" />
          ) : (
            <ChevronDown className="h-4 w-4" />
          )}
        </button>
      </div>

      {/* ── Editor area (hidden when collapsed) ── */}
      {!collapsed && (
        <div className="relative">
          {/* Toolbar */}
          <div
            className={[
              'flex items-center gap-0.5 mb-2 transition-opacity duration-150',
              showToolbar ? 'opacity-100' : 'opacity-0 pointer-events-none',
            ].join(' ')}
          >
            <ToolbarButton
              active={editor?.isActive('bold')}
              title="Negrita (Ctrl+B)"
              onMouseDown={prevent(() => editor?.chain().focus().toggleBold().run())}
            >
              <Bold className="h-3.5 w-3.5" />
            </ToolbarButton>

            <ToolbarButton
              active={editor?.isActive('italic')}
              title="Cursiva (Ctrl+I)"
              onMouseDown={prevent(() => editor?.chain().focus().toggleItalic().run())}
            >
              <Italic className="h-3.5 w-3.5" />
            </ToolbarButton>

            <div className="w-px h-3.5 bg-gray-200 mx-1" />

            <ToolbarButton
              active={editor?.isActive('heading', { level: 2 })}
              title="Encabezado H2"
              onMouseDown={prevent(() =>
                editor?.chain().focus().toggleHeading({ level: 2 }).run(),
              )}
            >
              <Heading2 className="h-3.5 w-3.5" />
            </ToolbarButton>

            <ToolbarButton
              active={editor?.isActive('heading', { level: 3 })}
              title="Encabezado H3"
              onMouseDown={prevent(() =>
                editor?.chain().focus().toggleHeading({ level: 3 }).run(),
              )}
            >
              <Heading3 className="h-3.5 w-3.5" />
            </ToolbarButton>

            <div className="w-px h-3.5 bg-gray-200 mx-1" />

            <ToolbarButton
              active={editor?.isActive('bulletList')}
              title="Lista con viñetas"
              onMouseDown={prevent(() =>
                editor?.chain().focus().toggleBulletList().run(),
              )}
            >
              <List className="h-3.5 w-3.5" />
            </ToolbarButton>

            <ToolbarButton
              active={editor?.isActive('orderedList')}
              title="Lista numerada"
              onMouseDown={prevent(() =>
                editor?.chain().focus().toggleOrderedList().run(),
              )}
            >
              <ListOrdered className="h-3.5 w-3.5" />
            </ToolbarButton>

            <div className="w-px h-3.5 bg-gray-200 mx-1" />
            <span className="text-[10px] text-gray-300 select-none ml-0.5">editar</span>
          </div>

          {/* TipTap content */}
          <EditorContent
            editor={editor}
            className={[
              'text-base text-gray-600 leading-relaxed rounded-md transition-colors duration-150',
              // TipTap root node
              '[&_.tiptap]:outline-none',
              '[&_.tiptap]:min-h-[1.5em]',
              // Paragraphs
              '[&_.tiptap_p]:mb-3',
              '[&_.tiptap_p:last-child]:mb-0',
              // Headings
              '[&_.tiptap_h2]:text-xl [&_.tiptap_h2]:font-bold [&_.tiptap_h2]:text-gray-800 [&_.tiptap_h2]:mt-4 [&_.tiptap_h2]:mb-2',
              '[&_.tiptap_h3]:text-base [&_.tiptap_h3]:font-semibold [&_.tiptap_h3]:text-gray-700 [&_.tiptap_h3]:mt-3 [&_.tiptap_h3]:mb-1',
              // Lists
              '[&_.tiptap_ul]:list-disc [&_.tiptap_ul]:pl-5 [&_.tiptap_ul]:mb-3 [&_.tiptap_ul_li]:mb-1',
              '[&_.tiptap_ol]:list-decimal [&_.tiptap_ol]:pl-5 [&_.tiptap_ol]:mb-3 [&_.tiptap_ol_li]:mb-1',
              // Inline marks
              '[&_.tiptap_strong]:font-semibold [&_.tiptap_strong]:text-gray-800',
              '[&_.tiptap_em]:italic',
              // Placeholder
              '[&_.tiptap_.is-editor-empty:first-child::before]:content-[attr(data-placeholder)]',
              '[&_.tiptap_.is-editor-empty:first-child::before]:text-gray-300',
              '[&_.tiptap_.is-editor-empty:first-child::before]:float-left',
              '[&_.tiptap_.is-editor-empty:first-child::before]:pointer-events-none',
              '[&_.tiptap_.is-editor-empty:first-child::before]:h-0',
              // Focus highlight
              focused ? 'bg-gray-50/70 rounded px-2.5 py-1 -mx-2.5' : '',
            ]
              .filter(Boolean)
              .join(' ')}
          />
        </div>
      )}

      {/* Collapsed preview */}
      {collapsed && (
        <p
          className="text-sm text-gray-400 italic cursor-pointer hover:text-gray-500 transition-colors"
          onClick={() => setCollapsed(false)}
        >
          {initialContent.substring(0, 90)}
          {initialContent.length > 90 ? '…' : ''}
        </p>
      )}
    </div>
  )
}
