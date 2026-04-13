import { describe, it, expect, vi, beforeEach } from 'vitest'

// Stub next/headers cookies() — returns no auth cookies (logged-out state)
vi.mock('next/headers', () => ({
  cookies: vi.fn().mockResolvedValue({
    getAll: () => [],
    set: vi.fn(),
  }),
}))

// Stub Supabase SSR — getUser returns no user
vi.mock('@supabase/ssr', () => ({
  createServerClient: () => ({
    auth: {
      getUser: vi.fn().mockResolvedValue({ data: { user: null } }),
    },
  }),
}))

// Stub Supabase admin client used by checkProAccess
vi.mock('@supabase/supabase-js', () => ({
  createClient: () => ({
    from: () => ({
      select: () => ({
        eq: () => ({
          single: vi.fn().mockResolvedValue({ data: null, error: { message: 'not found' } }),
        }),
      }),
    }),
  }),
}))

async function postRoute(handler: Function, body: Record<string, unknown> = {}) {
  const req = new Request('http://localhost/api/test', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  return handler(req)
}

describe('Protected API routes — logged-out user', () => {
  beforeEach(() => {
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://test.supabase.co'
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'test-anon-key'
    process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-service-key'
    process.env.OPENAI_API_KEY = 'test-openai-key'
  })

  it('/api/deep-solve returns 401 for unauthenticated request', async () => {
    const { POST } = await import('../app/api/deep-solve/route')
    const res = await postRoute(POST, { stain: 'coffee on cotton' })
    expect(res.status).toBe(401)
    const data = await res.json()
    expect(data.error).toBe('login_required')
  })

  it('/api/handoff returns 401 for unauthenticated request', async () => {
    const { POST } = await import('../app/api/handoff/route')
    const res = await postRoute(POST, { stain: 'blood', outcome: 'improved' })
    expect(res.status).toBe(401)
    const data = await res.json()
    expect(data.error).toBe('login_required')
  })

  it('/api/garment-analysis returns 401 for unauthenticated request', async () => {
    const { POST } = await import('../app/api/garment-analysis/route')
    const res = await postRoute(POST, { description: 'yellowing on collar' })
    expect(res.status).toBe(401)
    const data = await res.json()
    expect(data.error).toBe('login_required')
  })

  it('/api/stain-brain returns 401 for unauthenticated request', async () => {
    const { POST } = await import('../app/api/stain-brain/route')
    const res = await postRoute(POST, { messages: [{ role: 'user', content: 'help' }] })
    expect(res.status).toBe(401)
    const data = await res.json()
    expect(data.error).toBe('login_required')
  })

  it('401 response does not leak internal error codes beyond reason', async () => {
    const { POST } = await import('../app/api/deep-solve/route')
    const res = await postRoute(POST, { stain: 'test' })
    const data = await res.json()
    expect(['login_required', 'tier_required', 'auth_error']).toContain(data.error)
    expect(data).not.toHaveProperty('email')
    expect(data).not.toHaveProperty('tier')
  })
})

describe('Protected API routes — authenticated founder', () => {
  beforeEach(async () => {
    vi.resetModules()

    process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://test.supabase.co'
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'test-anon-key'
    process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-service-key'
    process.env.OPENAI_API_KEY = 'test-openai-key'

    // Re-mock with a logged-in founder
    vi.doMock('@supabase/ssr', () => ({
      createServerClient: () => ({
        auth: {
          getUser: vi.fn().mockResolvedValue({
            data: { user: { email: 'tyler@gonr.pro' } },
          }),
        },
      }),
    }))
  })

  it('/api/deep-solve does not return 401 for founder', async () => {
    const { POST } = await import('../app/api/deep-solve/route')
    const res = await postRoute(POST, { stain: 'coffee on cotton' })
    // Should not be 401 — it will fail for other reasons (no real OpenAI key) but that's fine
    expect(res.status).not.toBe(401)
  })
})
