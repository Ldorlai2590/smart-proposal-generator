/**
 * Unified formatting utilities.
 * All currency / date / percent / compact formatting flows through here so
 * dashboards, analytics, proposal detail, and client detail stay visually
 * consistent. Uses Intl.* APIs — no manual math.
 */

export type Currency = 'USD' | 'CLP' | 'MXN'

const LOCALE_BY_CURRENCY: Record<Currency, string> = {
  USD: 'en-US',
  CLP: 'es-CL',
  MXN: 'es-MX',
}

/**
 * Format a money amount with its ISO currency code prefix.
 *   formatCurrency(3500)              → "USD $3,500"
 *   formatCurrency(3200000, 'CLP')    → "CLP $3.200.000"
 *   formatCurrency(12500.5, 'MXN')    → "MXN $12,500.50"
 */
export function formatCurrency(amount: number, currency: Currency = 'USD'): string {
  if (amount == null || !Number.isFinite(amount)) return '—'
  const locale = LOCALE_BY_CURRENCY[currency]
  // CLP has no cents; USD/MXN show up to 2 fractional digits if needed.
  const minFraction = currency === 'CLP' ? 0 : Number.isInteger(amount) ? 0 : 2
  const maxFraction = currency === 'CLP' ? 0 : 2
  const formatted = new Intl.NumberFormat(locale, {
    style: 'currency',
    currency,
    currencyDisplay: 'symbol',
    minimumFractionDigits: minFraction,
    maximumFractionDigits: maxFraction,
  }).format(amount)
  // Intl produces "US$3,500" or "$3.200.000" depending on locale.
  // Normalise to "<CODE> $<amount>" for consistent visual presentation.
  // Strip any leading currency symbol/code from the Intl output and prepend canonical "CODE $".
  const stripped = formatted.replace(/^[^\d-]+/, '').trim()
  return `${currency} $${stripped}`
}

/**
 * Format a date value (Date or ISO string) with a locale-aware short form.
 *   formatDate('2026-04-15')  → "15 abr 2026"
 */
export function formatDate(date: Date | string, locale: string = 'es-CL'): string {
  if (date == null) return ''
  const d = typeof date === 'string' ? new Date(date) : date
  if (!(d instanceof Date) || Number.isNaN(d.getTime())) return ''
  return new Intl.DateTimeFormat(locale, {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(d)
}

/**
 * Format a percentage. Accepts an integer or float (0-100).
 *   formatPercent(75)     → "75%"
 *   formatPercent(12.5)   → "12.5%"
 */
export function formatPercent(n: number): string {
  if (n == null || !Number.isFinite(n)) return '—'
  const rounded = Number.isInteger(n) ? n : Math.round(n * 10) / 10
  return `${rounded}%`
}

/**
 * Compact currency notation for dashboard KPI cards.
 *   formatCompact(24500)     → "$24.5K"
 *   formatCompact(2_500_000) → "$2.5M"
 */
export function formatCompact(n: number): string {
  if (n == null || !Number.isFinite(n)) return '—'
  if (n === 0) return '$0'
  const formatted = new Intl.NumberFormat('en-US', {
    notation: 'compact',
    compactDisplay: 'short',
    maximumFractionDigits: 1,
  }).format(n)
  return `$${formatted}`
}

/**
 * Format a date as a relative "hace X días" string in Spanish.
 * Used on the dashboard activity feed.
 */
export function formatDateRelative(date: Date | string): string {
  if (date == null) return ''
  const d = typeof date === 'string' ? new Date(date) : date
  if (!(d instanceof Date) || Number.isNaN(d.getTime())) return ''
  const diffMs = Date.now() - d.getTime()
  const diffDays = Math.floor(diffMs / 86_400_000)
  if (diffDays <= 0) return 'Hoy'
  if (diffDays === 1) return 'Ayer'
  if (diffDays < 7) return `Hace ${diffDays} días`
  if (diffDays < 30) {
    const weeks = Math.floor(diffDays / 7)
    return `Hace ${weeks} semana${weeks > 1 ? 's' : ''}`
  }
  const months = Math.floor(diffDays / 30)
  return `Hace ${months} mes${months > 1 ? 'es' : ''}`
}
