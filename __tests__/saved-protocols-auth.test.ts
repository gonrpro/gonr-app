import { beforeEach, describe, expect, it, vi } from 'vitest'

type Filter = { column: string; value: string }
type Call = {
  table: string
  action: string
  filters: Filter[]
  inserted?: Record<string, unknown>
}

let sessionEmail: string | null = null
let calls: Call[] = []

function makeBuilder(call: Call) {
  const builder = {
    select: () => builder,
    delete: () => {
      call.action = 'delete'
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
    order: async () => ({ data: [], error: null }),
    single: async () => ({ data: { id: 'saved-1' }, error: null }),
    then: (resolve: (value: { data: unknown[]; count: number; error: null }) => void) =>
      resolve({ data: [], count: 0, error: null }),
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

  vi.doMock('@/lib/auth/tier', () => ({
    resolveTier: async (email: string) => ({
      email,
      tier: 'free',
      isFounder: false,
      isActive: true,
    }),
  }))
})

describe('saved protocol auth boundary', () => {
  it('lists saved protocols for the session email, ignoring query-string email', async () => {
    const { GET } = await import('../app/api/protocols/saved/route')

    const res = await GET(new Request('http://localhost/api/protocols/saved?email=victim@example.com'))

    expect(res.status).toBe(200)
    expect(calls[0]).toMatchObject({
      table: 'saved_protocols',
      action: 'select',
      filters: [{ column: 'user_email', value: 'owner@example.com' }],
    })
  })

  it('rejects saved protocol reads without a session', async () => {
    sessionEmail = null
    const { GET } = await import('../app/api/protocols/saved/route')

    const res = await GET(new Request('http://localhost/api/protocols/saved?email=victim@example.com'))
    const body = await res.json()

    expect(res.status).toBe(401)
    expect(body.error).toBe('login_required')
    expect(calls).toHaveLength(0)
  })

  it('scopes deletes by protocol id and session email', async () => {
    const { DELETE } = await import('../app/api/protocols/saved/[id]/route')

    const res = await DELETE(new Request('http://localhost/api/protocols/saved/saved-1'), {
      params: Promise.resolve({ id: 'saved-1' }),
    })

    expect(res.status).toBe(200)
    expect(calls[0]).toMatchObject({
      table: 'saved_protocols',
      action: 'delete',
      filters: [
        { column: 'id', value: 'saved-1' },
        { column: 'user_email', value: 'owner@example.com' },
      ],
    })
  })

  it('saves protocols under the session email, ignoring request body email', async () => {
    const { POST } = await import('../app/api/protocols/save/route')

    const res = await POST(
      new Request('http://localhost/api/protocols/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: 'victim@example.com',
          protocol: { id: 'p1', title: 'Coffee on cotton' },
        }),
      }),
    )

    expect(res.status).toBe(200)
    const insertCall = calls.find((call) => call.action === 'insert')
    expect(insertCall?.inserted?.user_email).toBe('owner@example.com')
  })
})
