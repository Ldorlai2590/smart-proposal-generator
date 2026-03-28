export interface Tenant {
  id: string
  clerkOrgId: string
  name: string
  plan: 'free' | 'pro' | 'enterprise'
  createdAt: Date
}

export type Plan = Tenant['plan']

export interface TenantContext {
  tenantId: string
  userId: string
}
