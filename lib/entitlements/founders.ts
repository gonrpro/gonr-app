// lib/entitlements/founders.ts
//
// Founder bypass for plant-scoped entitlements.
//
// Atlas wiring decision (TASK-154 review 2026-05-07): "Founder bypass: yes
// for internal testing, but keep it explicit/configured, not magical. Prefer
// env/config founder emails; do not infer from any plant member unless
// configured."
//
// Implementation: a comma-separated env list of founder emails. If any
// `plant_users` member of the queried plant matches, the resolver short-
// circuits and returns all entitlements as active.
//
// This is intentionally NOT the same list as FOUNDER_EMAILS in
// `lib/auth/tier.ts` — that hard-coded list is for the user-scoped GONR tier
// resolver. Plant-scoped founder bypass is opt-in via env so it can be
// disabled/rotated without a code change.
//
// Env: PLANT_ENTITLEMENT_FOUNDER_EMAILS="alice@example.com,bob@example.com"

const ENV_KEY = 'PLANT_ENTITLEMENT_FOUNDER_EMAILS'

function parseFounderList(): readonly string[] {
  const raw = process.env[ENV_KEY] ?? ''
  if (!raw.trim()) return []
  return raw
    .split(',')
    .map((s) => s.trim().toLowerCase())
    .filter((s) => s.length > 0)
}

/**
 * Returns true if the given email is in the founder allowlist.
 * Case-insensitive. Empty/missing env disables the bypass entirely.
 */
export function isFounderEmail(email: string | null | undefined): boolean {
  if (!email) return false
  const founders = parseFounderList()
  if (founders.length === 0) return false
  return founders.includes(email.toLowerCase())
}

/**
 * Returns the founder list (already-lowercased) for diagnostics/admin UIs.
 * Returns a frozen empty array if the env is unset.
 */
export function listFounderEmails(): readonly string[] {
  return parseFounderList()
}

/**
 * Convenience: given a list of plant member emails, returns true if any are
 * founders. The resolver passes the full `plant_users` member list and gets
 * back a single yes/no.
 */
export function plantHasFounderMember(memberEmails: readonly string[]): boolean {
  const founders = parseFounderList()
  if (founders.length === 0) return false
  for (const email of memberEmails) {
    if (founders.includes(email.toLowerCase())) return true
  }
  return false
}
