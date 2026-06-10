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
  it('rewrites bare gonr.app/ → /solve-v2 (rewrite, not redirect, so the share URL stays gonr.app/ and social caches re-scrape clean)', () => {
    const res = proxy(req('https://gonr.app/'))
    // Rewrite serves /solve-v2 content at the bare URL: no Location redirect,
    // but the internal rewrite target points at /solve-v2.
    expect(res.headers.get('location')).toBeNull()
    expect(res.headers.get('x-middleware-rewrite')).toContain('/solve-v2')
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

  // ── API allowlist (TASK-218): consumer APIs pass; operator/legacy APIs 404 ──
  it('passes every consumer API on the GONR host (no redirect, not 404)', () => {
    const consumer = [
      '/api/intake',
      '/api/solve',
      '/api/solves',
      '/api/solves/history',
      '/api/profile',
      '/api/protocols/save',
      '/api/protocols/saved',
      '/api/protocols/saved/abc123',
      '/api/scan-stain',
      '/api/scan-label',
      // public Brand/Vendor partner form (posts from /partners)
      '/api/partner-inquiry',
      // server-side-only (intake calls it) + payment webhook — must stay reachable
      '/api/scan-packet',
      '/api/webhooks/lemonsqueezy',
    ]
    for (const path of consumer) {
      const res = proxy(req(`https://gonr.app${path}`))
      expect(res.headers.get('location')).toBeNull()
      expect(res.status).not.toBe(404)
    }
  })

  it('blocks pro/operator/admin APIs on the GONR host with a 404', () => {
    const pro = [
      '/api/deep-solve',
      '/api/handoff',
      '/api/plant',
      '/api/stain-brain',
      '/api/tts',
      '/api/usage',
      '/api/auth/tier',
      '/api/events/record',
      '/api/operator-waitlist',
      '/api/garment-analysis',
      '/api/flag-garment',
      '/api/admin/protocol-library',
      '/api/ratings/submit',
      '/api/mission-control/protocols',
      // look-alikes by name that are legacy-only, NOT consumer:
      '/api/solve/outcome',
      '/api/protocols/translate',
      '/api/protocols/custom',
    ]
    for (const path of pro) {
      const res = proxy(req(`https://gonr.app${path}`))
      expect(res.status).toBe(404)
      // blocked APIs 404 rather than redirect, so fetch() callers get API semantics
      expect(res.headers.get('location')).toBeNull()
    }
  })

  it('does NOT redirect /auth (login / magic link)', () => {
    expect(proxy(req('https://gonr.app/auth/login')).headers.get('location')).toBeNull()
  })

  it('leaves the SpottingBoard host on its own routing (never sent to /solve-v2)', () => {
    const loc = proxy(req('https://spottingboard.com/')).headers.get('location')
    if (loc) expect(loc).not.toContain('/solve-v2')
  })

  // The specific legacy/pro leaks Atlas found live on gonr.app (returned 200) — these
  // MUST redirect to the one consumer version, plus a few more legacy surfaces.
  it.each([
    '/landing',
    '/profile',
    '/operator',
    '/pro',
    '/spotter',
    '/deep-solve',
    '/spottingboard',
    '/plant-brain',
    '/courses',
  ])('redirects legacy/pro surface %s → /solve-v2', (path) => {
    expect(proxy(req(`https://gonr.app${path}`)).headers.get('location')).toContain('/solve-v2')
  })

  it('keeps legal + partner pages reachable (privacy / terms / contact / partners)', () => {
    expect(proxy(req('https://gonr.app/privacy')).headers.get('location')).toBeNull()
    expect(proxy(req('https://gonr.app/terms')).headers.get('location')).toBeNull()
    expect(proxy(req('https://gonr.app/contact')).headers.get('location')).toBeNull()
    // /partners hosts the footer's Brand/Vendor partner form — must not redirect away
    expect(proxy(req('https://gonr.app/partners')).headers.get('location')).toBeNull()
  })
})
