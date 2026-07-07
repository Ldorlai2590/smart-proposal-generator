export interface ScoreSignals {
  company_size?: string | null
  email?: string | null
  industry?: string | null
  company?: string | null
  website?: string | null
}

// Company-size buckets → points. Accepts both range labels and t-shirt sizes.
const SIZE_POINTS: Record<string, number> = {
  '1-10': 8,
  '11-50': 18,
  '51-200': 28,
  '201-500': 36,
  '500+': 45,
  '501+': 45,
  small: 12,
  pequena: 12,
  medium: 25,
  mediana: 25,
  large: 40,
  grande: 40,
  enterprise: 45,
}

/**
 * Deterministic "Opportunity Score" (0-100) for a client, from firmographics
 * (company size) + how complete/actionable the record is. Transparent heuristic,
 * no external calls, stable for a given input — replaces the always-0 placeholder
 * the CEO review flagged as a non-functional headline feature.
 */
export function opportunityScore(c: ScoreSignals): number {
  let s = 35 // base
  const size = (c.company_size ?? '').toLowerCase().trim()
  s += SIZE_POINTS[size] ?? 12
  if (c.email) s += 6
  if (c.industry) s += 6
  if (c.company) s += 5
  if (c.website) s += 5
  return Math.max(0, Math.min(100, s))
}
