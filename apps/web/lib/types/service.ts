/**
 * Reusable service catalog (Step 1 sub-section, used in proposals).
 */
export type BillingType = 'monthly' | 'one_time' | 'quarterly' | 'project'

export interface Service {
  id: string
  tenant_id: string
  company_id: string
  name: string
  category: string
  description: string
  objective?: string
  scope?: string
  includes: string[]
  excludes: string[]
  duration_estimate?: string
  deliverables: string[]
  base_price: number
  currency: string
  customizable: boolean
  billing_type: BillingType
  desired_margin?: number
  active: boolean
  created_at: string
}
