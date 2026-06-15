'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { Check, ChevronDown, Search, Type } from 'lucide-react'
import {
  FONTS,
  searchFonts,
  type FontCategory,
  type FontOption,
} from '@/lib/fonts'

export interface FontPickerProps {
  value: string
  onChange: (font: string) => void
  className?: string
  label?: string
}

const CATEGORY_ORDER: FontCategory[] = ['sans', 'serif', 'display', 'mono', 'handwriting']

const CATEGORY_LABELS: Record<FontCategory, string> = {
  sans: 'Sans Serif',
  serif: 'Serif',
  display: 'Display',
  mono: 'Monospace',
  handwriting: 'Handwriting',
}

/**
 * Groups a list of fonts by category, preserving CATEGORY_ORDER and
 * dropping any category with no matches.
 */
function groupByCategory(fonts: FontOption[]): [FontCategory, FontOption[]][] {
  return CATEGORY_ORDER.map(
    (cat) => [cat, fonts.filter((f) => f.category === cat)] as [FontCategory, FontOption[]],
  ).filter(([, list]) => list.length > 0)
}

export function FontPicker({ value, onChange, className, label }: FontPickerProps): React.JSX.Element {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')

  const rootRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const results = useMemo(() => searchFonts(query), [query])
  const grouped = useMemo(() => groupByCategory(results), [results])

  // Whether the current value is a known commercial font (for the trigger hint).
  const currentIsCommercial = useMemo(
    () => FONTS.some((f) => f.name === value && f.source === 'commercial'),
    [value],
  )

  // Focus the search input whenever the panel opens.
  useEffect(() => {
    if (open) inputRef.current?.focus()
  }, [open])

  // Click-away + Escape to close.
  useEffect(() => {
    if (!open) return

    function handlePointer(e: MouseEvent) {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    function handleKey(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        e.preventDefault()
        setOpen(false)
      }
    }

    document.addEventListener('mousedown', handlePointer)
    document.addEventListener('keydown', handleKey)
    return () => {
      document.removeEventListener('mousedown', handlePointer)
      document.removeEventListener('keydown', handleKey)
    }
  }, [open])

  function handleSelect(name: string) {
    onChange(name)
    setOpen(false)
    setQuery('')
  }

  return (
    <div ref={rootRef} className={`relative space-y-2 ${className ?? ''}`}>
      {label && <label className="block text-xs font-medium text-gray-600">{label}</label>}

      {/* Trigger */}
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="listbox"
        aria-expanded={open}
        className="w-full flex items-center gap-2 px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm text-gray-900 hover:border-[#1D9E75] focus:outline-none focus:ring-2 focus:ring-[#1D9E75]/40 focus:border-[#1D9E75] transition-colors"
      >
        <Type className="h-4 w-4 text-gray-400 flex-shrink-0" />
        <span className="flex-1 text-left truncate" style={{ fontFamily: value }}>
          {value || 'Selecciona una fuente'}
        </span>
        {currentIsCommercial && (
          <span className="text-[10px] font-semibold uppercase tracking-wide text-[#1D9E75] bg-[#e6f7f2] px-1.5 py-0.5 rounded">
            Premium
          </span>
        )}
        <ChevronDown
          className={`h-4 w-4 text-gray-400 flex-shrink-0 transition-transform ${open ? 'rotate-180' : ''}`}
        />
      </button>

      {/* Dropdown panel */}
      {open && (
        <div className="absolute z-50 mt-1 w-full bg-white border border-gray-200 rounded-xl shadow-lg overflow-hidden">
          {/* Search */}
          <div className="p-2 border-b border-gray-100">
            <div className="flex items-center gap-2 px-2 py-1.5 bg-gray-50 rounded-lg">
              <Search className="h-4 w-4 text-gray-400 flex-shrink-0" />
              <input
                ref={inputRef}
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Buscar fuente…"
                className="flex-1 bg-transparent text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none"
              />
            </div>
          </div>

          {/* List */}
          <div className="max-h-72 overflow-y-auto py-1" role="listbox" aria-label="Fuentes">
            {grouped.length === 0 ? (
              <p className="px-3 py-6 text-center text-sm text-gray-400">
                Sin resultados para “{query}”
              </p>
            ) : (
              grouped.map(([category, fonts]) => (
                <div key={category}>
                  <div className="px-3 pt-2 pb-1 text-[10px] font-semibold uppercase tracking-wide text-gray-400">
                    {CATEGORY_LABELS[category]}
                  </div>
                  {fonts.map((font) => {
                    const selected = font.name === value
                    return (
                      <button
                        key={font.name}
                        type="button"
                        role="option"
                        aria-selected={selected}
                        onClick={() => handleSelect(font.name)}
                        className={`w-full flex items-center gap-2 px-3 py-2 text-left text-sm transition-colors ${
                          selected
                            ? 'bg-[#e6f7f2] text-gray-900'
                            : 'text-gray-700 hover:bg-gray-50'
                        }`}
                      >
                        <span className="flex-1 truncate" style={{ fontFamily: font.name }}>
                          {font.name}
                        </span>
                        {font.source === 'commercial' && (
                          <span className="text-[10px] font-semibold uppercase tracking-wide text-[#1D9E75] bg-[#e6f7f2] px-1.5 py-0.5 rounded flex-shrink-0">
                            Premium
                          </span>
                        )}
                        {selected && (
                          <Check className="h-4 w-4 text-[#1D9E75] flex-shrink-0" />
                        )}
                      </button>
                    )
                  })}
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  )
}
