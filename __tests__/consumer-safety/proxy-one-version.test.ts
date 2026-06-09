import { describe, expect, it } from 'vitest'
import { NextRequest } from 'next/server'
import { proxy } from '@/proxy'

// TASK-218 — one visible consumer version (Tyler 2026-06-09). On the GONR host the bare
// domain and the old /solve operator/editorial surface redirect to /solve-v2; the new
// app, its APIs, /auth, and the SpottingBoard host pass through untouched.

function req(url: string): NextRequest {
  const u = new URL(url)
  return new NextRequest(u, { headers: { host: u.host } })
}

describe('proxy — GONR one-version routing', () => {
  it('redirects bare gonr.app/ → /solve-v2', () => {
    const loc = proxy(req('https://gonr.app/')).headers.get('location')
    expect(loc).toContain('/solve-v2')
  })

  it('redirects the old /solve → /solve-v2', () => {
    expect(proxy(req('https://gonr.app/solve')).headers.get('location')).toContain('/solve-v2')
  })

  it('redirects old /solve/* → /solve-v2', () => {
    expect(proxy(req('https://gonr.app/solve/anything')).headers.get('location')).toContain('/solve-v2')
  })

  it('does NOT redirect the new app at /solve-v2', () => {
    expect(proxy(req('https://gonr.app/solve-v2')).headers.get('location')).toBeNull()
  })

  it('does NOT redirect /solve-v2 subroutes (startsWith /solve/ must not catch /solve-v2/)', () => {
    expect(proxy(req('https://gonr.app/solve-v2/solve')).headers.get('location')).toBeNull()
    expect(proxy(req('https://gonr.app/solve-v2/history')).headers.get('location')).toBeNull()
  })

  it('does NOT redirect the app APIs the consumer flow needs', () => {
    expect(proxy(req('https://gonr.app/api/intake')).headers.get('location')).toBeNull()
    expect(proxy(req('https://gonr.app/api/solve')).headers.get('location')).toBeNull()
  })

  it('does NOT redirect /auth (login / magic link)', () => {
    expect(proxy(req('https://gonr.app/auth/login')).headers.get('location')).toBeNull()
  })

  it('leaves the SpottingBoard host on its own routing (never sent to /solve-v2)', () => {
    const loc = proxy(req('https://spottingboard.com/')).headers.get('location')
    if (loc) expect(loc).not.toContain('/solve-v2')
  })
})
