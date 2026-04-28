/**
 * Provider company profile (Step 1 of the v2 flow).
 * The "selling" company that creates proposals.
 */
export type CompanyCurrency = 'USD' | 'CLP' | 'MXN' | 'COP' | 'ARS' | 'PEN'

export interface CompanyProfile {
  id: string
  tenant_id: string
  // Identidad
  name: string
  website?: string
  email?: string
  phone?: string
  country: string
  currency: CompanyCurrency
  // RRSS
  instagram?: string
  facebook?: string
  linkedin?: string
  tiktok?: string
  // Negocio
  what_we_do?: string
  purpose?: string
  differentiators?: string[]
  ideal_clients?: string
  focus_industries?: string[]
  // Branding
  logo_url?: string
  brand_manual_url?: string
  example_proposal_url?: string
  primary_color?: string
  secondary_color?: string
  accent_color?: string
  font_heading?: string
  font_body?: string
  has_brand_manual: boolean
  has_example_proposal: boolean
  // Meta
  onboarding_completed: boolean
  created_at: string
  updated_at: string
}
