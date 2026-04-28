'use client'

import { useEffect, useState } from 'react'
import { Eye, Sparkles, X } from 'lucide-react'
import { isEmptyState, setEmptyState } from '@/lib/demo-mode'

interface DemoBannerProps {
  /** Custom message override */
  message?: string
}

/**
 * Banner shown at the top of pages that display demo/example data.
 * If user clicks "Empezar limpio", we set the cookie + reload.
 */
export function DemoBanner({ message }: DemoBannerProps) {
  const [show, setShow] = useState(false)

  useEffect(() => {
    setShow(!isEmptyState())
  }, [])

  if (!show) return null

  return (
    <div className="mb-6 flex items-center gap-3 p-3 bg-amber-50 border border-amber-200 rounded-xl">
      <div className="h-8 w-8 rounded-full bg-amber-100 flex items-center justify-center flex-shrink-0">
        <Eye className="h-4 w-4 text-amber-700" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-amber-900">
          {message ?? 'Estás viendo datos de ejemplo.'}
        </p>
        <p className="text-xs text-amber-700">
          Para empezar con tu propia información, limpia los datos de demostración.
        </p>
      </div>
      <button
        onClick={() => setEmptyState(true)}
        className="inline-flex items-center gap-1.5 px-3 py-2 bg-white border border-amber-300 text-xs font-semibold text-amber-900 rounded-lg hover:bg-amber-100 transition-colors flex-shrink-0"
      >
        <Sparkles className="h-3.5 w-3.5" />
        Empezar limpio
      </button>
      <button
        onClick={() => setShow(false)}
        aria-label="Cerrar banner"
        className="p-1.5 text-amber-700 hover:bg-amber-100 rounded-lg flex-shrink-0"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  )
}
