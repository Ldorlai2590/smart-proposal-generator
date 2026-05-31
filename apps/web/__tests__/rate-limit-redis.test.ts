import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock must be hoisted before any imports that use @upstash/redis
const mockExec = vi.fn()
const mockPipeline = vi.fn(() => ({
  incr: vi.fn().mockReturnThis(),
  expire: vi.fn().mockReturnThis(),
  exec: mockExec,
}))
const mockRedisInstance = { pipeline: mockPipeline }

vi.mock('@upstash/redis', () => ({
  Redis: vi.fn(() => mockRedisInstance),
}))

vi.stubEnv('UPSTASH_REDIS_REST_URL', 'https://test.upstash.io')
vi.stubEnv('UPSTASH_REDIS_REST_TOKEN', 'test-token')

describe('Redis-backed checkLimit', () => {
  beforeEach(() => {
    vi.resetModules()
    mockExec.mockReset()
    mockPipeline.mockClear()
  })

  it('returns allowed:true when count is below limit', async () => {
    mockExec.mockResolvedValueOnce([2, 1]) // count=2, limit=3

    const { checkLimit } = await import('@/lib/rate-limit')
    const result = await checkLimit('1.2.3.4', 'proposals:stream', 3, 60)

    expect(result.allowed).toBe(true)
    expect(result.remaining).toBe(1) // 3 - 2 = 1
  })

  it('returns allowed:false when count exceeds limit', async () => {
    mockExec.mockResolvedValueOnce([4, 1]) // count=4 > limit=3

    const { checkLimit } = await import('@/lib/rate-limit')
    const result = await checkLimit('1.2.3.4', 'proposals:stream', 3, 60)

    expect(result.allowed).toBe(false)
    expect(result.remaining).toBe(0)
    expect(result.retryAfter).toBeGreaterThan(0)
  })

  it('falls back to allow-all when Redis env vars are missing', async () => {
    vi.stubEnv('UPSTASH_REDIS_REST_URL', '')
    vi.stubEnv('UPSTASH_REDIS_REST_TOKEN', '')

    const { checkLimit } = await import('@/lib/rate-limit')
    const result = await checkLimit('1.2.3.4', 'proposals:stream', 3, 60)

    expect(result.allowed).toBe(true)
  })
})
