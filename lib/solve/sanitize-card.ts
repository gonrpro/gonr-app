// TASK-068 — server-side tier sanitization. Strips pro-only fields from the
// card before returning to non-paid tiers. Client-side gating in ResultCard
// is a UX surface; this is the load-bearing trust contract.
//
// Callers: apply to every card going out in a NextResponse.json so the home
// user's browser never receives `spottingProtocol`, `products.professional`,
// handoff objects, or pro-only provenance fields in the first place.
//
// TASK-247 — moved verbatim out of app/api/solve/route.ts so the repo-level
// consumer-card guard test can run the same sanitize the API runs.
export const PAID_TIERS = new Set<string>(['spotter', 'operator', 'founder'])

export function sanitizeCardForTier(
  card: unknown,
  viewerTier: string | null | undefined,
): unknown {
  if (!card || typeof card !== 'object') return card
  if (viewerTier && PAID_TIERS.has(viewerTier)) return card

  const c = card as Record<string, unknown>
  const out: Record<string, unknown> = { ...c }

  // Pro protocol steps — home/anon never see these. Client fallback uses
  // homeSolutions. Deleting instead of nulling so the field is absent from
  // the JSON payload entirely.
  delete out.spottingProtocol
  delete (out as { professionalProtocol?: unknown }).professionalProtocol

  // Products — keep consumer/household; drop professional.
  const products = out.products as
    | { professional?: unknown; consumer?: unknown; household?: unknown }
    | Array<{ name?: string }>
    | undefined
  if (products && !Array.isArray(products)) {
    const { professional: _pro, ...homeProducts } = products
    void _pro
    out.products = homeProducts
  }

  // Pro-only callout / action fields. Keep escalation + customerExplanation
  // since those are appropriate home-tier content ("take to a pro" is fine
  // for home users). Drop Customer Handoff / Deep Solve / pro-specific
  // chemistry callouts.
  delete out.customerHandoff
  delete (out as { deepSolve?: unknown }).deepSolve
  delete (out as { deepSolvePrompt?: unknown }).deepSolvePrompt

  // Source-attribution — for non-paid tiers we still want a lightweight
  // hint but not the full pro-vendor provenance chain. The card's generic
  // `scienceNote` / `stainChemistry` fields already cover the consumer angle.
  // Leave `sources` in only when it's already a short array (typical anon
  // cards have 0–1 sources). If it's long, truncate to the first entry so
  // consumer cards don't expose the full pro source ladder.
  const srcs = out.sources
  if (Array.isArray(srcs) && srcs.length > 1) {
    out.sources = srcs.slice(0, 1)
  }

  // Pro tier metadata — never needed by home clients.
  delete (out as { pro?: unknown }).pro
  delete (out as { pro_es?: unknown }).pro_es

  return out
}
