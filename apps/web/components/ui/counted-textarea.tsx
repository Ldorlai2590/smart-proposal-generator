'use client'

import { forwardRef } from 'react'

interface CountedTextareaProps extends Omit<React.TextareaHTMLAttributes<HTMLTextAreaElement>, 'maxLength'> {
  maxLength: number
  /** Optional minLength to show "X de Y mín" */
  minLength?: number
  /** Show counter only when > 50% used */
  smart?: boolean
}

/**
 * Textarea with built-in character counter.
 * Color changes:
 *   - 0–60%: gray (subtle)
 *   - 60–80%: gray (neutral)
 *   - 80–95%: amber (warning)
 *   - 95–100%: red (danger)
 *   - over: hard-blocked by maxLength but counter shows red
 */
export const CountedTextarea = forwardRef<HTMLTextAreaElement, CountedTextareaProps>(
  function CountedTextarea({ value, maxLength, minLength, smart = false, className, ...props }, ref) {
    const len = typeof value === 'string' ? value.length : 0
    const pct = (len / maxLength) * 100

    const colorCls =
      pct >= 95
        ? 'text-red-600 font-semibold'
        : pct >= 80
        ? 'text-amber-600 font-medium'
        : 'text-gray-400'

    const showCounter = smart ? pct > 50 : true
    const showMin = minLength != null && len < minLength

    return (
      <div className="space-y-1">
        <textarea
          ref={ref}
          value={value}
          maxLength={maxLength}
          className={
            className ??
            'w-full px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-[#1D9E75]/40 focus:border-[#1D9E75] transition-colors min-h-[80px]'
          }
          {...props}
        />
        <div className="flex items-center justify-between text-xs">
          {showMin ? (
            <span className="text-amber-600">Mínimo {minLength} caracteres</span>
          ) : (
            <span />
          )}
          {showCounter && (
            <span className={colorCls}>
              {len.toLocaleString('es-CL')} / {maxLength.toLocaleString('es-CL')}
            </span>
          )}
        </div>
      </div>
    )
  },
)
