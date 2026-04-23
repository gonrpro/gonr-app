// lib/auth/viewerTier.ts — TASK-057b founder preview mode (client-side).
//
// Founder-only preview of home/spotter/operator tier rendering, without
// changing real entitlements. Per Atlas 2026-04-21 locked design:
//   effectiveViewerTier = previewTier ?? realViewerTier
// Server entitlement checks (/api/solve gate, admin routes, checkout paths)
// ALWAYS read the real tier from the session. Preview is RENDER-ONLY.
//
// Entry paths:
//   - Query param:  ?preview=home|spotter|operator|founder  (primary)
//   - localStorage: 'gonr_preview_tier' (sticky across navigations)
//   - Reset:        clearPreviewTier() from the PreviewBanner
//
// Founder gate: only founder emails can activate preview mode. Non-founder
// URLs with ?preview=home do NOTHING — no banner, no render change,
// no warnings. This keeps the preview URL from being an unlock primitive.

import type { Tier } from '@/lib/types'

type ViewerTier = Tier | 'anon'

// NOTE: matches the canonical list in app/api/solve/route.ts and
// app/api/admin/ratings/*/route.ts. Keep them in sync.
const FOUNDER_EMAILS = [
  'tyler@gonr.pro',
  'tyler@nexshift.co',
  'twfyke@me.com',
  'eval@gonr.app',
  'jeff@cleanersupply.com',
]

const STORAGE_KEY = 'gonr_preview_tier'
const QUERY_PARAM = 'preview'

const ALLOWED_PREVIEW_TIERS: Tier[] = ['home', 'spotter', 'operator', 'founder']

/** Returns true if the given email belongs to a founder account. */
export function isFounder(email: string | null | undefined): boolean {
  if (!email) return false
  return FOUNDER_EMAILS.includes(email.toLowerCase())
}

/** Read the active preview tier (query param overrides localStorage). Returns
 *  null unless the current user is a founder AND a valid tier is requested. */
export function getPreviewTier(email: string | null | undefined): Tier | null {
  if (typeof window === 'undefined') return null
  if (!isFounder(email)) return null

  // Query param takes precedence — easier to link-to-preview.
  const params = new URLSearchParams(window.location.search)
  const fromQuery = params.get(QUERY_PARAM)
  if (fromQuery && isValidTier(fromQuery)) {
    // Persist to localStorage so subsequent navigations within the session
    // stay in preview mode until the user explicitly resets.
    try { window.localStorage.setItem(STORAGE_KEY, fromQuery) } catch { /* private mode */ }
    return fromQuery as Tier
  }

  // Fall back to stored value.
  try {
    const stored = window.localStorage.getItem(STORAGE_KEY)
    if (stored && isValidTier(stored)) return stored as Tier
  } catch { /* private mode */ }

  return null
}

/** Explicitly set a preview tier (banner-controlled switcher, if we add one). */
export function setPreviewTier(tier: Tier, email: string | null | undefined): boolean {
  if (typeof window === 'undefined') return false
  if (!isFounder(email)) return false
  if (!isValidTier(tier)) return false
  try { window.localStorage.setItem(STORAGE_KEY, tier) } catch { return false }
  // Remove query param from URL so the UI reflects "sticky via storage" not "forced via URL"
  try {
    const url = new URL(window.location.href)
    url.searchParams.delete(QUERY_PARAM)
    window.history.replaceState({}, '', url.toString())
  } catch { /* ignore */ }
  return true
}

/** Clear preview mode — returns to real-tier rendering. Called by the Reset link. */
export function clearPreviewTier(): void {
  if (typeof window === 'undefined') return
  try { window.localStorage.removeItem(STORAGE_KEY) } catch { /* ignore */ }
  try {
    const url = new URL(window.location.href)
    url.searchParams.delete(QUERY_PARAM)
    window.history.replaceState({}, '', url.toString())
  } catch { /* ignore */ }
}

/** The rendering contract: preview tier overrides real tier, but only when
 *  valid (founder + allowed tier). Rendering surfaces (ResultCard, Nav, etc.)
 *  call this and render from the result. */
export function getEffectiveViewerTier(realTier: ViewerTier, email: string | null | undefined): ViewerTier {
  const preview = getPreviewTier(email)
  return preview ?? realTier
}

function isValidTier(s: string): boolean {
  return (ALLOWED_PREVIEW_TIERS as string[]).includes(s)
}
