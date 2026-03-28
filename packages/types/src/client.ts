export interface Client {
  id: string
  tenantId: string
  name: string
  company?: string
  email?: string
  industry?: string
  companySize?: string
  score: number
  metadata: Record<string, unknown>
  createdAt: Date
  updatedAt: Date
}

export type CreateClientInput = Pick<Client, 'name' | 'company' | 'email' | 'industry' | 'companySize'>

export type CompanySize = 'startup' | 'pyme' | 'mediana' | 'grande' | 'enterprise'

export const INDUSTRIES = [
  'tecnología',
  'finanzas',
  'salud',
  'educación',
  'retail',
  'manufactura',
  'servicios',
  'construcción',
  'otro',
] as const

export type Industry = typeof INDUSTRIES[number]
