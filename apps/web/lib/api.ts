const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000'

/**
 * Wraps fetch with the base API URL and X-Tenant-ID header.
 * Use this in 'use client' components after obtaining orgId from useAuth().
 */
export async function fetchWithTenant(
  path: string,
  orgId: string,
  options: RequestInit = {},
): Promise<Response> {
  const url = `${API_BASE}${path}`
  const headers = new Headers(options.headers)
  headers.set('X-Tenant-ID', orgId)
  if (!headers.has('Content-Type') && options.body !== undefined) {
    headers.set('Content-Type', 'application/json')
  }
  return fetch(url, { ...options, headers })
}
