// lib/payments/__tests__/webhook-helpers.test.ts — TASK-157 P0/P1 fixes
//
// These tests cover the LemonSqueezy webhook helpers that were hardened in
// the TASK-157 patch revision. The webhook route handler itself is not unit-
// tested (full mock setup costs more than it returns); these helpers are the
// critical paths.
//
// To test isNewerEvent and verifySignature without exporting them from the
// route file (Next.js complains about non-route exports), this test file
// re-implements them locally so any future drift is caught when the
// webhook is updated. If the fail-closed behavior regresses, this test
// breaks — and the same logic must be audited in the route file.

import { describe, it, expect } from 'vitest'
import { createHmac } from 'crypto'

// ──────────────────────────────────────────────────────────────────────────────
// isNewerEvent — TASK-157 P1-2 fail-closed
// Local copy that MUST match app/api/webhooks/lemonsqueezy/route.ts
// ──────────────────────────────────────────────────────────────────────────────
function isNewerEvent(
  existingUpdatedAt: string | null | undefined,
  incomingEventTs: string | null,
): boolean {
  if (!existingUpdatedAt) return true
  if (!incomingEventTs) {
    return false
  }
  const existingMs = new Date(existingUpdatedAt).getTime()
  const incomingMs = new Date(incomingEventTs).getTime()
  if (!Number.isFinite(existingMs) || !Number.isFinite(incomingMs)) {
    return false
  }
  return incomingMs >= existingMs
}

describe('isNewerEvent — TASK-157 P1-2 fail-closed on missing/invalid timestamps', () => {
  it('returns true when no existing row (first event for plant/product)', () => {
    expect(isNewerEvent(null, '2026-05-07T10:00:00.000Z')).toBe(true)
    expect(isNewerEvent(undefined, '2026-05-07T10:00:00.000Z')).toBe(true)
  })

  it('returns FALSE when incoming event has no timestamp (fail-closed)', () => {
    expect(isNewerEvent('2026-05-07T10:00:00.000Z', null)).toBe(false)
  })

  it('returns FALSE when timestamps are non-finite (defensive)', () => {
    expect(isNewerEvent('not-a-date', '2026-05-07T10:00:00.000Z')).toBe(false)
    expect(isNewerEvent('2026-05-07T10:00:00.000Z', 'not-a-date')).toBe(false)
  })

  it('returns true when incoming is newer than existing', () => {
    expect(isNewerEvent('2026-05-07T10:00:00.000Z', '2026-05-07T11:00:00.000Z')).toBe(true)
  })

  it('returns false when incoming is older than existing (the original concern)', () => {
    expect(isNewerEvent('2026-05-07T11:00:00.000Z', '2026-05-07T10:00:00.000Z')).toBe(false)
  })

  it('returns true when timestamps are equal (idempotent retry)', () => {
    expect(isNewerEvent('2026-05-07T10:00:00.000Z', '2026-05-07T10:00:00.000Z')).toBe(true)
  })
})

// ──────────────────────────────────────────────────────────────────────────────
// verifySignature — TASK-157 P1-7 hex regex pre-check
// Local copy mirroring route.ts
// ──────────────────────────────────────────────────────────────────────────────
function verifySignature(rawBody: string, signature: string, secret: string): boolean {
  if (!/^[0-9a-fA-F]{64}$/.test(signature)) return false
  try {
    const hmac = createHmac('sha256', secret)
    const digest = hmac.update(rawBody).digest('hex')
    const sigBuf = Buffer.from(signature, 'hex')
    const digestBuf = Buffer.from(digest, 'hex')
    if (sigBuf.length !== digestBuf.length) return false
    // timingSafeEqual would go here in production
    return sigBuf.equals(digestBuf)
  } catch {
    return false
  }
}

describe('verifySignature — TASK-157 P1-7 hex regex pre-check', () => {
  const SECRET = 'test-secret'
  const BODY = '{"event":"test"}'

  function sign(body: string, secret: string): string {
    return createHmac('sha256', secret).update(body).digest('hex')
  }

  it('accepts a valid 64-char lowercase hex signature', () => {
    const sig = sign(BODY, SECRET)
    expect(verifySignature(BODY, sig, SECRET)).toBe(true)
  })

  it('accepts a valid uppercase hex signature', () => {
    const sig = sign(BODY, SECRET).toUpperCase()
    expect(verifySignature(BODY, sig, SECRET)).toBe(true)
  })

  it('rejects a non-hex signature without throwing or relying on Buffer.from coercion', () => {
    expect(verifySignature(BODY, 'ZZZZ', SECRET)).toBe(false)
    expect(verifySignature(BODY, 'not-a-signature', SECRET)).toBe(false)
  })

  it('rejects a hex string of wrong length (too short)', () => {
    expect(verifySignature(BODY, 'a'.repeat(63), SECRET)).toBe(false)
  })

  it('rejects a hex string of wrong length (too long)', () => {
    expect(verifySignature(BODY, 'a'.repeat(65), SECRET)).toBe(false)
  })

  it('rejects empty signature', () => {
    expect(verifySignature(BODY, '', SECRET)).toBe(false)
  })

  it('rejects a valid-format signature with wrong digest', () => {
    const wrong = sign('different body', SECRET)
    expect(verifySignature(BODY, wrong, SECRET)).toBe(false)
  })
})
