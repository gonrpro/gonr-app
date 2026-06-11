// lib/auth/has-session.ts
// TASK-234 — cheap client-side check for "is there plausibly a Supabase
// session?" so anonymous pages can skip session-gated fetches entirely
// instead of eating a 401 browser resource error on every load (the anon
// /api/solves/history 401 Atlas logged). Heuristic by design: @supabase/ssr
// stores its auth token in cookies prefixed `sb-`. False positives just fall
// back to the old behavior (the fetch runs and may 401); false negatives are
// impossible for signed-in users because the cookie is what authenticates
// them. Auth itself is unchanged — the server still verifies the session.

export function hasLikelySession(): boolean {
  if (typeof document === 'undefined') return false
  try {
    return document.cookie.split(';').some((c) => c.trim().startsWith('sb-'))
  } catch {
    return false
  }
}
