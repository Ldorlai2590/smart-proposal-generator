import { auth, currentUser } from '@clerk/nextjs/server'

export async function getTenantId(): Promise<string> {
  const { orgId } = await auth()
  if (!orgId) throw new Error('No organization selected')
  return orgId
}

export async function requireAuth() {
  const { userId, orgId } = await auth()
  if (!userId) throw new Error('Unauthenticated')
  if (!orgId) throw new Error('No organization selected')
  return { userId, tenantId: orgId }
}

export async function getApiHeaders(): Promise<HeadersInit> {
  const { orgId } = await auth()
  if (!orgId) throw new Error('No organization selected')
  return {
    'X-Tenant-ID': orgId,
    'Content-Type': 'application/json',
  }
}
