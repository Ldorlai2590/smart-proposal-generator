import { describe, it, expect, vi } from 'vitest'

vi.mock('@/lib/auth', () => ({
  requireAuth: vi.fn().mockResolvedValue({
    tenantId: 'tenant-abc',
    userId: 'user-1',
    email: 'test@test.com',
  }),
}))

const mockUpdate = vi.fn(() => ({
  eq: vi.fn().mockReturnThis(),
  // second .eq() call returns final result
}))

// Make the chained .eq() return a Promise the last time
const mockEqChain = {
  eq: vi.fn().mockResolvedValue({ error: null }),
}
const mockEqFirst = {
  eq: vi.fn(() => mockEqChain),
}
mockUpdate.mockReturnValue(mockEqFirst)

vi.mock('@/lib/supabase/admin', () => ({
  createAdminClient: vi.fn(() => ({
    from: vi.fn(() => ({ update: mockUpdate })),
  })),
}))

describe('POST /api/proposals/autosave', () => {
  it('returns 200 with saved:true when sections are valid', async () => {
    const { POST } = await import('@/app/api/proposals/autosave/route')
    const req = new Request('http://localhost/api/proposals/autosave', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        proposalId: 'prop-123',
        sections: { portada: '<p>Test portada</p>', diagnostico: '<p>Test</p>' },
      }),
    })

    const res = await POST(req)
    expect(res.status).toBe(200)
    const json = await res.json() as { saved: boolean }
    expect(json.saved).toBe(true)
  })

  it('returns 400 when proposalId is missing', async () => {
    const { POST } = await import('@/app/api/proposals/autosave/route')
    const req = new Request('http://localhost/api/proposals/autosave', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sections: { portada: '<p>Test</p>' } }),
    })

    const res = await POST(req)
    expect(res.status).toBe(400)
  })

  it('returns 400 when body is not valid JSON', async () => {
    const { POST } = await import('@/app/api/proposals/autosave/route')
    const req = new Request('http://localhost/api/proposals/autosave', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: 'not-json',
    })

    const res = await POST(req)
    expect(res.status).toBe(400)
  })
})
