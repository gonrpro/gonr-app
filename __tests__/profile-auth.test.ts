import { beforeEach, describe, expect, it, vi } from 'vitest'

type Filter = { column: string; value: string }
type Call = {
  table: string
  action: string
  filters: Filter[]
  updates?: Record<string, unknown>
  inserted?: Record<string, unknown>
}

let sessionEmail: string | null = null
let calls: Call[] = []

function makeBuilder(call: Call) {
  const builder = {
    select: () => builder,
    update: (updates: Record<string, unknown>) => {
      call.action = 'update'
      call.updates = updates
      return builder
    },
    insert: (row: Record<string, unknown>) => {
      call.action = 'insert'
      call.inserted = row
      return builder
    },
    eq: (column: string, value: string) => {
      call.filters.push({ column, value })
      return builder
    },
    single: async () => ({ data: { email: sessionEmail, role: 'spotter' }, error: null }),
  }
  return builder
}

beforeEach(() => {
  vi.resetModules()
  sessionEmail = 'owner@example.com'
  calls = []
  process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://test.supabase.co'
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'anon'
  process.env.SUPABASE_SERVICE_ROLE_KEY = 'service'

  vi.doMock('@/lib/supabase/server', () => ({
    createServerSupabaseClient: async () => ({
      auth: {
        getUser: async () => ({
          data: {
            user: sessionEmail ? { email: sessionEmail } : null,
          },
        }),
      },
    }),
  }))

  vi.doMock('@supabase/supabase-js', () => ({
    createClient: () => ({
      from: (table: string) => {
        const call: Call = { table, action: 'select', filters: [] }
        calls.push(call)
        return makeBuilder(call)
      },
    }),
  }))
})

describe('profile auth boundary', () => {
  it('reads the session user profile, ignoring query-string email', async () => {
    const { GET } = await import('../app/api/profile/route')

    const res = await GET(new Request('http://localhost/api/profile?email=victim@example.com'))

    expect(res.status).toBe(200)
    expect(calls[0]).toMatchObject({
      table: 'users',
      action: 'select',
      filters: [{ column: 'email', value: 'owner@example.com' }],
    })
  })

  it('rejects profile reads without a session', async () => {
    sessionEmail = null
    const { GET } = await import('../app/api/profile/route')

    const res = await GET(new Request('http://localhost/api/profile?email=victim@example.com'))
    const body = await res.json()

    expect(res.status).toBe(401)
    expect(body.error).toBe('login_required')
    expect(calls).toHaveLength(0)
  })

  it('updates only the session user profile and ignores body email and role', async () => {
    const { PATCH } = await import('../app/api/profile/route')

    const res = await PATCH(
      new Request('http://localhost/api/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: 'victim@example.com',
          name: 'Owner',
          role: 'founder',
          shop_name: 'Safe Shop',
        }),
      }),
    )

    expect(res.status).toBe(200)
    const updateCall = calls.find((call) => call.action === 'update')
    expect(updateCall).toMatchObject({
      table: 'users',
      filters: [{ column: 'email', value: 'owner@example.com' }],
      updates: { name: 'Owner', shop_name: 'Safe Shop' },
    })
    expect(updateCall?.updates).not.toHaveProperty('role')
  })
})
