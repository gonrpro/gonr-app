// lib/entitlements/__tests__/founders.test.ts — TASK-154
//
// Verifies env-driven founder bypass (Atlas decision: explicit/configured,
// not magical inference).

import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { isFounderEmail, listFounderEmails, plantHasFounderMember } from '../founders'

const ENV_KEY = 'PLANT_ENTITLEMENT_FOUNDER_EMAILS'
const original = process.env[ENV_KEY]

function setEnv(value: string | undefined) {
  if (value === undefined) delete process.env[ENV_KEY]
  else process.env[ENV_KEY] = value
}

describe('founders — env-driven', () => {
  beforeEach(() => setEnv(undefined))
  afterEach(() => setEnv(original))

  it('returns false when env is unset', () => {
    expect(isFounderEmail('tyler@nexshift.co')).toBe(false)
    expect(listFounderEmails()).toEqual([])
  })

  it('returns false when env is empty string', () => {
    setEnv('   ')
    expect(isFounderEmail('tyler@nexshift.co')).toBe(false)
  })

  it('matches founder email case-insensitively', () => {
    setEnv('tyler@nexshift.co,alice@example.com')
    expect(isFounderEmail('TYLER@nexshift.co')).toBe(true)
    expect(isFounderEmail('alice@example.com')).toBe(true)
    expect(isFounderEmail('bob@example.com')).toBe(false)
  })

  it('handles whitespace in env value', () => {
    setEnv('  tyler@nexshift.co , alice@example.com  ')
    expect(isFounderEmail('tyler@nexshift.co')).toBe(true)
    expect(isFounderEmail('alice@example.com')).toBe(true)
  })

  it('plantHasFounderMember returns true when any member is founder', () => {
    setEnv('tyler@nexshift.co')
    expect(plantHasFounderMember(['op1@plant.com', 'tyler@nexshift.co'])).toBe(true)
  })

  it('plantHasFounderMember returns false when no member is founder', () => {
    setEnv('tyler@nexshift.co')
    expect(plantHasFounderMember(['op1@plant.com', 'op2@plant.com'])).toBe(false)
  })

  it('plantHasFounderMember returns false on empty list', () => {
    setEnv('tyler@nexshift.co')
    expect(plantHasFounderMember([])).toBe(false)
  })

  it('plantHasFounderMember returns false when env unset, even with founder-like emails', () => {
    expect(plantHasFounderMember(['tyler@nexshift.co'])).toBe(false)
  })

  it('returns false for null/undefined emails', () => {
    setEnv('tyler@nexshift.co')
    expect(isFounderEmail(null)).toBe(false)
    expect(isFounderEmail(undefined)).toBe(false)
    expect(isFounderEmail('')).toBe(false)
  })
})
