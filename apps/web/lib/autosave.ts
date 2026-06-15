'use client'

import { useEffect, useRef } from 'react'

const AUTOSAVE_INTERVAL_MS = 30_000

interface AutosaveOptions {
  proposalId: string
  sections: Record<string, string>
  onSaveStart?: () => void
  onSaveEnd?: (error: Error | null) => void
}

/**
 * Fires POST /api/proposals/autosave every 30s.
 * Uses a ref for sections so the interval doesn't need to re-register
 * on every keystroke — only proposalId changes restart the timer.
 * Skips save when proposalId is empty (proposal not yet persisted in DB).
 */
export function useAutoSave({ proposalId, sections, onSaveStart, onSaveEnd }: AutosaveOptions) {
  const sectionsRef = useRef(sections)

  useEffect(() => {
    sectionsRef.current = sections
  }, [sections])

  useEffect(() => {
    if (!proposalId) return

    const timer = setInterval(async () => {
      onSaveStart?.()
      try {
        const res = await fetch('/api/proposals/autosave', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ proposalId, sections: sectionsRef.current }),
        })
        if (!res.ok) {
          onSaveEnd?.(new Error(`autosave failed: ${res.status}`))
        } else {
          onSaveEnd?.(null)
        }
      } catch (err) {
        onSaveEnd?.(err instanceof Error ? err : new Error(String(err)))
      }
    }, AUTOSAVE_INTERVAL_MS)

    return () => clearInterval(timer)
  }, [proposalId, onSaveStart, onSaveEnd])
}
