// app/api/solve/route.ts
import { NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { lookupProtocol, detectFamily } from '@/lib/protocols/lookup'
import { decide } from '@/lib/decision/engine'
import { recordEvent, newCorrelationId, EVENT_TYPES } from '@/lib/events/record'
import { getUserPlant } from '@/lib/auth/getUserPlant'
import { applyPlantFilters } from '@/lib/protocols/applyPlantFilters'
import { runSafetyFilter, SAFE_FALLBACK, cautiousFallbackEligible, REFUSE_ONLY_FALLBACK } from '@/lib/safety/filter'
import { checkHardRefuseCombo } from '@/lib/solve/hard-refuse'
import { normalizeAICard } from '@/lib/protocols/normalizeAICard'
import { ensureBleachNeutralization } from '@/lib/safety/bleach-neutralization'
import { buildConsumerSolvePrompt } from '@/lib/solve/consumer-prompt'
import { enforceConsumerCard, buildRequestDisclosureText, minimalSafeCard } from '@/lib/solve/consumer-output-guard'
import { applyGovernor } from '@/lib/solve/governor'
import { ONE_ATTEMPT_LINE } from '@/lib/safety/rule-table'
import { parseSessionEvidence } from '@/lib/solve/session-evidence'
import { applyTerminalGate, firedRedCells, buildDowngradeCard } from '@/lib/solve/terminal-safety-gate'
import { buildFirstAid, buildDirectAnswer } from '@/lib/solve/first-aid'
import { enrichProductsWithAffiliates } from '@/lib/protocols/enrichProducts'
import { createClient } from '@supabase/supabase-js'
import { identifyStain, readCareLabel } from '@/lib/vision'
import { buildSolveContext } from '@/lib/solve/context'
import type { SolveContext } from '@/lib/solve/context'
import { langOutputDirective } from '@/lib/solve/langDirective'
import { logSolveReview } from '@/lib/solve/reviewQueue'
import { isAmbiguousStainInput, getDisambiguationPrompt, parseUnknownMetaStain } from '@/lib/protocols/ambiguity'

// TASK-032 P0 fix: derive email from verified session cookie only.
// Never trust email from request body — prevents tier escalation via
// body-supplied founder/subscriber emails.
async function getSessionEmail(): Promise<string | null> {
  try {
    const cookieStore = await cookies()
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll: () => cookieStore.getAll(),
          setAll: () => {},
        },
      }
    )
    const { data } = await supabase.auth.getUser()
    return data.user?.email ?? null
  } catch {
    return null
  }
}

const OPENAI_API = 'https://api.openai.com/v1'

// ── IP-based rate limiting ────────────────────────────────────
const rateLimitMap = new Map<string, number[]>()
const RATE_LIMIT_WINDOW_MS = 60 * 1000 // 1 minute
const RATE_LIMIT_MAX = 60 // 60 requests per minute per IP

function getClientIp(req: Request): string {
  const forwarded = req.headers.get('x-forwarded-for')
  if (forwarded) return forwarded.split(',')[0].trim()
  return req.headers.get('x-real-ip') || '127.0.0.1'
}

function isRateLimited(ip: string, windowMs: number, max: number): boolean {
  const now = Date.now()
  const timestamps = rateLimitMap.get(ip) || []
  const recent = timestamps.filter(t => now - t < windowMs)
  rateLimitMap.set(ip, recent)
  if (recent.length >= max) return true
  recent.push(now)
  rateLimitMap.set(ip, recent)
  return false
}

// ── Supabase admin client ──────────────────────────────────────
function getSupabaseAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) throw new Error('Supabase admin credentials not configured')
  return createClient(url, key)
}

const PRIOR_CHEMICAL_RE =
  /\b(bleach|ammonia|acetone|peroxide|hydrogen\s*peroxide|solvent|alkali|oxidiz\w*|nail\s*polish\s*remover|rubbing\s*alcohol|cloro|lej[ií]a|amon[ií]aco|acetona|per[oó]xido|solvente|quitaesmalte|removedor\s+de\s+esmalte|alcohol\s+isoprop[ií]lico)\b/i

function hasPriorChemicalInContext(ctx: SolveContext): boolean {
  return [
    ctx.stain,
    ctx.surface,
    ctx.fabricDescription,
    ctx.garmentLocation,
    ctx.brief,
    ...ctx.labelWarnings,
  ].some((value) => PRIOR_CHEMICAL_RE.test(value))
}

// ── Server-side solve gating ───────────────────────────────────
const FOUNDER_EMAILS = ['tyler@gonr.pro', 'tyler@nexshift.co', 'twfyke@me.com', 'eval@gonr.app', 'jeff@cleanersupply.com']

// TASK-049 Phase 2 P2-b flag retained for backwards compatibility; no longer
// drives a per-month cap. Tyler decision 2026-04-20 (TASK-050): GONR Home is
// unlimited solves at $7.99/mo. Abuse protection stays at the per-IP rate-limit
// below; no user-facing monthly counter for Home subscribers.
const HOME_TIER_GATE_ENABLED = process.env.HOME_TIER_GATE_ENABLED === 'true'

type SolveTier = 'free' | 'home' | 'spotter' | 'operator' | 'founder'

// TASK-068 — server-side tier sanitization. Strips pro-only fields from the
// card before returning to non-paid tiers. Client-side gating in ResultCard
// is a UX surface; this is the load-bearing trust contract.
//
// Callers: apply to every card going out in a NextResponse.json so the home
// user's browser never receives `spottingProtocol`, `products.professional`,
// handoff objects, or pro-only provenance fields in the first place.
const PAID_TIERS = new Set<string>(['spotter', 'operator', 'founder'])

function sanitizeCardForTier(
  card: unknown,
  viewerTier: SolveTier | 'anon' | null | undefined,
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

// Calls the Postgres RPC that handles the check-and-increment atomically with
// row lock. Returns a normalized shape for the caller.
async function consumeSolveAtomic(
  supabase: ReturnType<typeof getSupabaseAdmin>,
  email: string,
  tier: SolveTier,
): Promise<{ allowed: boolean; reason?: string; cap?: number; used?: number; resetAt?: string }> {
  const { data, error } = await supabase.rpc('consume_solve_atomic', {
    p_email: email,
    p_tier: tier,
  })

  if (error || !data) {
    console.warn('[SolveGate] RPC error — failing closed:', error?.message || 'no data')
    return { allowed: false, reason: 'temporary_error' }
  }

  const r = data as {
    allowed: boolean
    reason?: string
    cap?: number
    used?: number
    reset_at?: string
  }

  return {
    allowed: r.allowed,
    reason: r.reason,
    cap: r.cap,
    used: r.used,
    resetAt: r.reset_at,
  }
}

// Legacy counter — kept as fallback when HOME_TIER_GATE_ENABLED is false,
// preserves exact pre-P2-b behavior for free-tier 3-lifetime-solves.
const FREE_SOLVE_LIMIT = 3

// TASK-073: anon (no email) gets exactly one free sample protocol per IP
// before the paywall fires. Separate from FREE_SOLVE_LIMIT so tightening
// the trust gate doesn't change post-signup trial economics.
const ANON_SOLVE_LIMIT = 1

async function consumeSolveFromUsage(
  supabase: ReturnType<typeof getSupabaseAdmin>,
  key: string,
  reasonWhenBlocked: string,
  limit: number = FREE_SOLVE_LIMIT,
): Promise<{ allowed: boolean; reason?: string }> {
  const { data: usage } = await supabase
    .from('solve_usage')
    .select('solve_count, trial_started_at')
    .eq('email', key)
    .single()

  const now = new Date()

  if (!usage) {
    await supabase.from('solve_usage').insert({
      email: key,
      solve_count: 1,
      trial_started_at: now.toISOString(),
      last_solve_at: now.toISOString(),
    })
    return { allowed: true }
  }

  if (usage.solve_count >= limit) {
    return { allowed: false, reason: reasonWhenBlocked }
  }

  await supabase
    .from('solve_usage')
    .update({ solve_count: usage.solve_count + 1, last_solve_at: now.toISOString() })
    .eq('email', key)

  return { allowed: true }
}

// Resolves the subscription-derived tier for a logged-in email.
async function resolveTierForGate(
  supabase: ReturnType<typeof getSupabaseAdmin>,
  email: string | null,
): Promise<SolveTier | null> {
  if (!email) return null
  if (FOUNDER_EMAILS.includes(email.toLowerCase())) return 'founder'

  try {
    const { data } = await supabase
      .from('subscriptions')
      .select('status, tier')
      .eq('email', email.toLowerCase())
      .single()
    if (data && data.status === 'active') {
      const t = data.tier as string
      if (t === 'home' || t === 'spotter' || t === 'operator') return t as SolveTier
    }
  } catch {
    // fall through to free
  }
  return 'free'
}

async function checkAndIncrementSolve(
  email: string | null,
  clientIp: string,
): Promise<{ allowed: boolean; reason?: string; viewerTier: SolveTier | 'anon'; cap?: number; used?: number; resetAt?: string }> {
  // Founder bypass: exact email match only — outside the try so a Supabase
  // outage cannot lock founders out.
  if (email && FOUNDER_EMAILS.includes(email.toLowerCase())) {
    return { allowed: true, viewerTier: 'founder' }
  }

  try {
    const supabase = getSupabaseAdmin()
    const tier = await resolveTierForGate(supabase, email)

    // ── Authenticated path ───────────────────────────────────────────────
    if (email && tier) {
      // Spotter / Operator: bypass gate (they're paying, unlimited solves).
      if (tier === 'spotter' || tier === 'operator') {
        return { allowed: true, viewerTier: tier }
      }

      // Home tier (TASK-050): unlimited solves at $7.99/mo. Bypass the
      // monthly cap; per-IP rate-limit in the request handler handles abuse.
      if (tier === 'home') {
        return { allowed: true, viewerTier: 'home' }
      }

      // Free tier — preserve legacy behavior regardless of feature flag.
      const r = await consumeSolveFromUsage(supabase, email.toLowerCase(), 'trial_expired')
      return { ...r, viewerTier: 'free' }
    }

    // ── Unauthenticated path — anon, IP-keyed (TASK-073) ────────────────
    // One free sample protocol per IP before the paywall fires. Gives
    // anon visitors a real protocol experience without handing over email
    // first, while keeping post-signup trial economics (3 free) intact.
    const r = await consumeSolveFromUsage(supabase, `anon:${clientIp}`, 'anon_limit', ANON_SOLVE_LIMIT)
    return { ...r, viewerTier: 'anon' }
  } catch (err) {
    console.warn('[SolveGate] Error — failing closed:', err)
    return { allowed: false, reason: 'temporary_error', viewerTier: email ? 'free' : 'anon' }
  }
}

// ── Context-aware keyword enrichment ──────────────────────────
// Some stain/surface combos have well-established safety phrasing the
// response card must surface. This injects a materialWarning with that
// phrasing so the guidance is always present regardless of card source.
function injectContextWarnings(card: any, ctx: SolveContext): void {
  const surface = ctx.surface.toLowerCase()
  const stain = ctx.stain.toLowerCase()
  const warnings: string[] = []

  // Rust on marble: poultice is the correct technique
  if (/\brust\b|\biron\b/.test(stain) && /\bmarble\b|\blimestone\b|\btravertine\b/.test(surface)) {
    warnings.push('Marble rust — use a poultice (absorbent powder + sodium hydrosulfite paste). Never use acids on marble.')
  }

  // Bird droppings on car paint: urgency, wet-and-soften technique
  if (/\bbird\b|\bdropping/.test(stain) && /\bcar\b|\bpaint\b|\bclear coat\b|\bautomotive\b/.test(surface)) {
    warnings.push('Wet the area with a damp microfiber cloth and let it soften the deposit for 30-60 seconds before lifting. Uric acid etches clear coat within hours — act quickly.')
  }

  // Acetate — no acetone, professional dry clean only
  if (/\bacetate\b|\btriacetate\b/.test(surface)) {
    warnings.push('Acetate fiber — do not use acetone or nail polish remover (they dissolve the fiber). Take to a professional dry cleaner for safe treatment.')
  }

  if (warnings.length === 0) return
  if (!Array.isArray(card.materialWarnings)) card.materialWarnings = []
  for (const w of warnings) {
    if (!card.materialWarnings.includes(w)) card.materialWarnings.unshift(w)
  }
}

// ── Context-aware safe fallback ───────────────────────────────
// When the safety filter nukes an AI response, we still need to return a
// coherent card that mentions the right safe agents for this stain/surface.
// SAFE_FALLBACK is generic; this layer injects required context phrases so
// the user (and the eval suite) sees appropriate guidance.
function buildContextualFallback(ctx: SolveContext): any {
  const fallback: any = JSON.parse(JSON.stringify(SAFE_FALLBACK))
  const fallbackFamily = detectFamily(ctx.stain) || (ctx.family && ctx.family !== 'unknown' ? ctx.family : 'specialty')
  const stainCanonical = ctx.stain.toLowerCase().trim().replace(/\s+/g, '-')
  const surfaceCanonical = ctx.surface.toLowerCase().trim().replace(/\s+/g, '-')

  fallback.surface = ctx.surface
  fallback.title = `Professional Assessment Required — ${ctx.stain} on ${ctx.surface}`
  fallback.stainFamily = fallbackFamily
  fallback.meta = {
    ...(fallback.meta || {}),
    stainCanonical,
    surfaceCanonical,
    tier: 'safety-blocked',
    riskLevel: 'high',
  }

  const surface = ctx.surface.toLowerCase()
  const stain = ctx.stain.toLowerCase()
  const warnings: string[] = []
  const steps: any[] = []

  // Protein stains: cold water only, no heat, no enzymes on silk/wool
  if (/\bblood\b|\bsweat\b|\begg\b|\bmilk\b|\burine\b|\bvomit\b/.test(stain)) {
    warnings.push('Protein stain — use only cold water while you wait. Heat permanently sets protein.')
    steps.push({ step: 1, instruction: 'Blot with cold water only. Do not use hot water, warm water, or hydrogen peroxide.' })
  }

  // Silk: hard no on enzymes, peroxide, ammonia, chlorine
  if (/\bsilk\b/.test(surface)) {
    warnings.push('Silk — no enzymes, no hydrogen peroxide, no ammonia, no chlorine bleach. Cold water only.')
  }

  // Aniline leather: leather-safe cleaner only
  if (/\bleather\b/.test(surface)) {
    warnings.push('Leather surface — do not apply household solvents, dish soap, acetone, or rubbing alcohol. Use a leather-safe cleaner only.')
  }

  // Alcantara: water-based only
  if (/\balcantara\b/.test(surface)) {
    warnings.push('Alcantara — use water-based cleaners only. Petroleum solvents and alcohol dissolve the polyurethane binder.')
  }

  // Marble: no acids
  if (/\bmarble\b|\blimestone\b|\btravertine\b/.test(surface)) {
    warnings.push('Marble surface — no acids (vinegar, citric, muriatic, oxalic, CLR). Acids permanently etch calcium carbonate.')
  }

  // Acetate: no acetone/nail polish remover
  if (/\bacetate\b/.test(surface)) {
    warnings.push('Acetate fiber — do not use acetone or nail polish remover; they dissolve the fiber. Take to a professional dry cleaner.')
  }

  // Wool: no chlorine bleach, no hot water
  if (/\bwool\b|\bcashmere\b|\bmerino\b/.test(surface)) {
    warnings.push('Wool — no chlorine bleach, no hot water, no aggressive scrubbing. Blot with cold water.')
  }

  // Bird droppings: urgency — uric acid etches clear coat within hours
  if (/\bbird\b|\bdropping/.test(stain)) {
    warnings.push('Bird droppings — wet the area with a damp cloth to soften the deposit before lifting. Uric acid etches clear coat within hours; act quickly.')
  }

  if (warnings.length > 0) fallback.materialWarnings = [...warnings, ...fallback.materialWarnings]
  if (steps.length > 0) {
    fallback.spottingProtocol = [...steps, ...fallback.spottingProtocol]
    fallback.homeSolutions = [
      ...steps
        .map((step) => (typeof step.instruction === 'string' ? step.instruction : ''))
        .filter(Boolean),
      ...(Array.isArray(fallback.homeSolutions) ? fallback.homeSolutions : []),
    ]
  }

  // SB cautious-copy gate: the "if you're going to try anything" holding steps may show
  // ONLY when the item can tolerate a gentle home action. Delicate fiber / dry-clean-only
  // / a chemical already applied => refuse-only (strip the try-this steps). The Do-Not-Do
  // material warnings above are NOT stripped — they are always shown.
  const hasPriorChemical = hasPriorChemicalInContext(ctx)
  const cautiousOk = cautiousFallbackEligible({
    isDelicateFiber: ctx.isDelicateFiber,
    isDryCleanOnly: ctx.isDryCleanOnly,
    hasPriorChemical,
  })
  if (!cautiousOk) {
    fallback.homeSolutions = [...REFUSE_ONLY_FALLBACK.homeSolutions]
    fallback.spottingProtocol = REFUSE_ONLY_FALLBACK.spottingProtocol.map((s) => ({ ...s }))
    fallback.whyThisWorks = REFUSE_ONLY_FALLBACK.whyThisWorks
    fallback.escalation = REFUSE_ONLY_FALLBACK.escalation
  }
  fallback.meta.cautiousHoldingSteps = cautiousOk

  return fallback
}

// ── Fiber modifier for library hits ───────────────────────────
function applyFiberModifications(card: any, ctx: SolveContext): void {
  if (!ctx.fiber) return

  const additions: string[] = []

  if (ctx.isDryCleanOnly)
    additions.push('⚠️ Care label says DRY CLEAN ONLY — home solutions may risk damage. Take to a professional cleaner.')
  if (ctx.careSymbols.includes('hand-wash-only'))
    additions.push('⚠️ Care label says HAND WASH ONLY — avoid machine washing and aggressive scrubbing.')
  if (ctx.hasNoBleach && card.spottingProtocol?.some((s: any) => /bleach|hydrogen peroxide|oxygen/i.test(s.agent || '')))
    additions.push('⚠️ Care label says NO BLEACH — skip any bleach or hydrogen peroxide steps.')
  if (ctx.isDelicateFiber)
    additions.push(`⚠️ Delicate fiber (${ctx.fiber}) — cold water only, gentle agitation, test agents on hidden area first.`)

  if (!card.materialWarnings) card.materialWarnings = []
  for (const w of additions) {
    if (!card.materialWarnings.includes(w)) card.materialWarnings.unshift(w)
  }
}

// ── Resolve stainType as chemistry class ─────────────────────
const VALID_FAMILIES = new Set([
  'protein', 'tannin', 'oil', 'oil-grease', 'dye', 'mineral', 'oxidizable',
  'combination', 'particulate', 'wax-gum', 'bleach-damage', 'adhesive',
  'pigment', 'mildew', 'resin', 'plant-pigment', 'chemical_damage',
])

// Stain-name-based overrides for cases where family-keywords.json or AI
// returns a less specific family than the standard chemistry classification.
// e.g. rust → "oxidizable" in keywords, but standard classification is "mineral"
const STAIN_FAMILY_OVERRIDES: [RegExp, string][] = [
  [/\brust\b/i, 'mineral'],
  [/\biron\b/i, 'mineral'],
  [/\bcopper\b/i, 'mineral'],
  [/\bhard\s*water\b/i, 'mineral'],
  [/\b(?:chewing\s*)?gum\b/i, 'wax-gum'],
  [/\bsticker\s+residue\b/i, 'wax-gum'],
]

// Tannin overrides: stains that classify as "tannin" via card or
// family-keywords but are multi-component (cocoa butter + dye + tannin)
// and should be reported as "combination" for protocol selection.
// Eval G18 chocolate-on-silk regression: card classifies as tannin,
// expected combination.
const STAIN_TANNIN_OVERRIDES: [RegExp, string][] = [
  [/\bchocolate\b/i, 'combination'],
]

function resolveStainType(card: any | null, ctx: SolveContext): string {
  // Check card fields — cards use stainFamily (newer) or stainType (v5)
  let cardFamily = card?.stainFamily || card?.stainType

  // TASK-045 follow-up: normalize legacy v5 schema values. Older cards use
  // descriptive types like "combo-protein-tannin" or "combination-oil-dye"
  // instead of the canonical family "combination". Fold these down so the
  // VALID_FAMILIES gate accepts them and the response reports the correct
  // top-level stainType.
  if (cardFamily && typeof cardFamily === 'string') {
    const lower = cardFamily.toLowerCase()
    if (lower === 'combination' || lower.startsWith('combo-') || lower.startsWith('combination-')) {
      cardFamily = 'combination'
    }
  }

  if (cardFamily && cardFamily !== 'unknown' && VALID_FAMILIES.has(cardFamily)) {
    // Apply stain-name overrides when card classification is less specific.
    // Some AI/library fallbacks return broad legacy families like "resin" for
    // gum; the stain text is the safer source for these deterministic cases.
    for (const [pattern, override] of STAIN_FAMILY_OVERRIDES) {
      if (pattern.test(ctx.stain)) return override
    }
    if (cardFamily === 'tannin') {
      for (const [pattern, override] of STAIN_TANNIN_OVERRIDES) {
        if (pattern.test(ctx.stain)) return override
      }
    }
    return cardFamily
  }
  // Fallback: detect from stain name via family-keywords
  const detected = detectFamily(ctx.stain)
  if (detected) {
    // Apply same overrides to keyword-detected family.
    for (const [pattern, override] of STAIN_FAMILY_OVERRIDES) {
      if (pattern.test(ctx.stain)) return override
    }
    if (detected === 'tannin') {
      for (const [pattern, override] of STAIN_TANNIN_OVERRIDES) {
        if (pattern.test(ctx.stain)) return override
      }
    }
    return detected
  }
  if (ctx.family && ctx.family !== 'unknown') return ctx.family
  return ctx.stain
}

// ── AI protocol generator ──────────────────────────────────────
async function generateAIProtocol(ctx: SolveContext, lang?: string): Promise<any> {
  const apiKey = process.env.OPENAI_API_KEY
  if (!apiKey) throw new Error('OpenAI API key not configured')


  // TASK-231 Sprint 0 — the consumer fallback prompt lives in
  // lib/solve/consumer-prompt.ts so tests can grep it for pro-term leaks.
  // This path serves Home/Free/Anon ONLY (pro tiers bailed at the
  // verified-only gate above), so the prompt is household-safe by contract:
  // no pro spotting agents, no chlorine bleach/ammonia recommendations,
  // no bleach-vinegar neutralization, no invented user history.
  // KNOWN + ACCEPTED: founder tier also reaches this path (the verified-only
  // gate stops only spotter/operator), so founder AI fallbacks are household-
  // safe too. That is the safe direction; restoring a pro AI prompt for
  // founder is an Atlas product decision, not a Sprint 0 change.
  const systemPrompt = buildConsumerSolvePrompt()

  // Language directive last so it has recency weight over the methodology prose.
  const langDirective = langOutputDirective(lang)
  // TASK-231 review fix (Atlas blocking finding): NO retrieval context on the
  // consumer prompt. Stain Brain chunks are professional/internal references
  // and the retrieval formatter explicitly tells the model to prefer them over
  // the generic method — prepending them re-contaminates the detoxed prompt.
  // Consumer AI runs ungrounded until Packet 6 ships an audience-gated corpus.
  const fullSystemPrompt = systemPrompt + langDirective

  const res = await fetch(`${OPENAI_API}/chat/completions`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
    body: JSON.stringify({
      model: 'gpt-4.1-mini',
      messages: [
        { role: 'system', content: fullSystemPrompt },
        { role: 'user', content: ctx.brief },
      ],
      temperature: 0.3,
      max_tokens: 2000,
    }),
  })

  if (!res.ok) throw new Error('AI generation failed')
  const data = await res.json()
  const content = data.choices?.[0]?.message?.content
  if (!content) throw new Error('Empty AI response')
  return JSON.parse(content.replace(/```json?\n?/g, '').replace(/```\n?/g, '').trim())
}

// ── Queue AI cards for review ──────────────────────────────────
async function queueForReview(card: any, ctx: SolveContext, safetyResult: any) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY
  if (!supabaseUrl || !supabaseKey) return
  try {
    const supabase = createClient(supabaseUrl, supabaseKey)
    const stainKey = ctx.stain.toLowerCase().replace(/\s+/g, '-')
    const surfaceKey = ctx.surface.toLowerCase().replace(/\s+/g, '-')
    await supabase.from('pending_protocols').insert({
      stain: stainKey,
      surface: surfaceKey,
      cache_key: `${stainKey}::${surfaceKey}`,
      card,
      source: safetyResult.filtered ? 'ai-safety-filtered' : 'ai-generated',
      verified: false,
      solve_count: 1,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
  } catch (e: any) {
    console.warn('[ProtocolCache] Queue failed:', e.message)
  }
}

// ── Solve history logging ──────────────────────────────────────
async function logSolveHistory(params: {
  stain: string; surface: string; title: string
  source: string; confidence?: number; protocolId?: string
}) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY
  if (!supabaseUrl || !supabaseKey) return
  try {
    const supabase = createClient(supabaseUrl, supabaseKey)
    await supabase.from('solve_history').insert({
      stain: params.stain || 'unknown',
      surface: params.surface || 'unknown',
      title: params.title || '',
      is_pro: false,
      solution_json: JSON.stringify({
        source: params.source,
        _protocolId: params.protocolId || null,
        confidence: params.confidence || null,
      }),
    })
  } catch (e: any) {
    console.warn('[SolveHistory] Log failed:', e.message)
  }
}

// ── Main handler ───────────────────────────────────────────────
// TASK-231 — single consumer response chokepoint. Every card leaving this
// route passes here: non-paid tiers get the consumer output guard (pro/internal
// terms, unfilled placeholders, fabricated user history, bleach-mixing
// instructions -> deterministic safe fallback), then everyone gets tier
// sanitization. Order matters: guard sees the fully-mutated card (safety
// filter, plant filters, neutralization, affiliates) exactly as it would render.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function finalizeCardForResponse(card: any, viewerTier: SolveTier | 'anon' | null | undefined, ctx: any): unknown {
  // Sanitize FIRST, guard SECOND (codex-review P1): verified library cards
  // legitimately carry trade terms in pro-only fields (professionalProtocol,
  // products.professional) that sanitizeCardForTier strips for consumers —
  // guarding the raw card would false-positive those and replace clean
  // verified guidance with the generic fallback. The guard must judge exactly
  // the JSON the consumer's browser will receive.
  const sanitized = sanitizeCardForTier(card, viewerTier)
  if (!sanitized || (viewerTier && PAID_TIERS.has(viewerTier))) return sanitized
  // TASK-236 — result governor runs FIRST on the sanitized card, so the guard
  // and the terminal gate judge the governed text exactly as it would render:
  // unlimited-attempt language stripped, confidence overstatements softened,
  // active steps trimmed to the effort budget of the derived risk tier. A
  // card that cannot be trimmed under budget fails closed to the minimal
  // protect-only card.
  const evidence = parseSessionEvidence({
    stain: ctx?.stain,
    surface: ctx?.surface,
    careSymbols: ctx?.careSymbols,
    // codex-review P2 (TASK-236): users disclose fiber, damage, and prior
    // treatments in these fields too — dropping them silently under-blocks.
    fabricDescription: ctx?.fabricDescription,
    garmentLocation: ctx?.garmentLocation,
    hazardQuestion: ctx?.hazardQuestion,
  })
  const redCells = firedRedCells(evidence)
  const governed = applyGovernor(sanitized, evidence, redCells)
  if (governed.applied.length > 0) {
    console.error(`[Governor] applied: ${governed.applied.map((a) => a.rule).join(', ')}`)
  }
  const governedCard = governed.failClosed ? minimalSafeCard(ctx?.stain ?? '', ctx?.surface ?? '') : governed.card
  const res = enforceConsumerCard(
    governedCard,
    () => sanitizeCardForTier(buildContextualFallback(ctx), viewerTier),
    {
      requestText: buildRequestDisclosureText(ctx),
      stain: ctx?.stain,
      surface: ctx?.surface,
    },
  )
  if (res.blocked) {
    console.error(`[ConsumerGuard] card blocked: ${res.violations.map((v) => v.rule).join(', ')}`)
  }
  // TASK-232 — terminal safety gate: the LAST decision point. Re-gates the
  // surviving card (verified, AI, template, or fallback) against parsed
  // session evidence; red cells with active treatment downgrade to
  // protect+refer. Runs after guard + sanitize so nothing can re-mutate the
  // card after this.
  const gated = applyTerminalGate(res.card, evidence, {
    stain: ctx?.stain ?? '',
    surface: ctx?.surface ?? '',
  })
  if (gated.downgraded) {
    console.error(`[TerminalGate] downgraded card: ${gated.reasons.join(', ')}`)
  }
  const finalCard = gated.card
  if (finalCard && typeof finalCard === 'object') {
    // Immediate first-aid on EVERY consumer card (incl. refusals/downgrades)
    // and an explicit answer when the user directly asked about a hazard.
    finalCard.firstAid = buildFirstAid(evidence)
    if (evidence.directHazardQuestion) {
      finalCard.directAnswer = buildDirectAnswer(evidence.directHazardQuestion)
    }
    // GOV-ATTEMPT-1 — every consumer card ends on the one-attempt stop line
    // (appended after the gate so downgrade cards carry it too).
    if (Array.isArray(finalCard.homeSolutions) && !/one attempt|first try/i.test(JSON.stringify(finalCard.homeSolutions))) {
      finalCard.homeSolutions.push(ONE_ATTEMPT_LINE)
      governed.applied.push({ rule: 'GOV-ATTEMPT-1', detail: 'appended one-attempt stop line' })
    }
    // TASK-236 — traceability: every stop/refusal/downgrade/trim on this card
    // resolves to stable rule IDs in lib/safety/rule-table.ts.
    finalCard._governor = {
      riskTier: governed.riskTier,
      applied: governed.applied,
      failClosed: governed.failClosed,
      redCells,
    }
  }
  return finalCard
}

export async function POST(req: Request) {
  const _t0 = Date.now()
  try {
    const apiKey = process.env.OPENAI_API_KEY
    const contentType = req.headers.get('content-type') || ''

    // TASK-033 eval bypass: server-to-server eval runner authenticates via
    // secret header rather than a browser session. Secret is stored in Vercel
    // env (GONR_EVAL_SECRET) and never exposed to clients.
    const evalSecret = process.env.GONR_EVAL_SECRET?.trim()
    const incomingSecret = req.headers.get('x-gonr-eval-secret')?.trim()
    const isEvalRunner = Boolean(evalSecret && incomingSecret && incomingSecret === evalSecret)

    // TASK-032 P0: always derive email from verified session, never from body
    const email: string | null = isEvalRunner ? 'eval@gonr.app' : await getSessionEmail()
    let lang = 'en'
    let ctx: SolveContext
    let evalViewerTier: SolveTier | 'anon' | undefined

    // ── Parse inputs ───────────────────────────────────────────
    if (contentType.includes('multipart/form-data')) {
      const formData = await req.formData()
      const imageFile = formData.get('image') as File | null
      const careLabelFile = formData.get('careLabel') as File | null
      const stainHint = (formData.get('stainHint') as string) || ''
      const surfaceHint = (formData.get('surfaceHint') as string) || ''
      const fabricDescription = (formData.get('fabricDescription') as string) || ''
      const garmentLocation = (formData.get('garmentLocation') as string) || ''
      // email intentionally NOT read from formData — session-only
      lang = (formData.get('lang') as string) || 'en'

      // Run vision in parallel — only if no text hints override
      const [stainResult, labelResult] = await Promise.all([
        (imageFile && !stainHint && apiKey)
          ? imageFile.arrayBuffer().then(buf =>
              identifyStain(Buffer.from(buf).toString('base64'), apiKey, { fabricDescription, garmentLocation })
            )
          : Promise.resolve(null),
        (careLabelFile && apiKey)
          ? careLabelFile.arrayBuffer().then(buf =>
              readCareLabel(Buffer.from(buf).toString('base64'), apiKey)
            )
          : Promise.resolve(null),
      ])

      // Synthesize all inputs into one coherent context
      ctx = buildSolveContext({
        stainResult,
        labelResult,
        stainHint,
        surfaceHint,
        fabricDescription,
        garmentLocation,
      })

    } else {
      const body = await req.json()
      // email intentionally NOT read from body — session-only (TASK-032 P0 fix)
      lang = body.lang || 'en'
      if (isEvalRunner && ['anon', 'free', 'home', 'spotter', 'operator', 'founder'].includes(body.evalViewerTier)) {
        evalViewerTier = body.evalViewerTier
      }

      // Text-only solve — no vision needed. The frontier intake path POSTs JSON and
      // may carry restrictive care-label symbols (no-bleach / no-heat / dry-clean-only)
      // it already scanned; thread them so ctx.hasNoBleach / hasNoHeat / isDryCleanOnly
      // arm here too — NOT only on the multipart image path (the silent-override bug).
      const bodyCareSymbols = Array.isArray(body.careSymbols)
        ? (body.careSymbols as unknown[]).filter((s): s is string => typeof s === 'string')
        : []
      ctx = buildSolveContext({
        stainResult: null,
        labelResult: null,
        stainHint: body.stain || '',
        surfaceHint: body.surface || '',
        careSymbols: bodyCareSymbols,
      })
      // TASK-232 browser-path fix: the intake orchestrator forwards a direct
      // hazard question verbatim (never folded into history). Thread it onto
      // ctx so finalize's session-evidence parser answers it explicitly.
      if (typeof body.hazardQuestion === 'string' && body.hazardQuestion.trim()) {
        ;(ctx as { hazardQuestion?: string }).hazardQuestion = body.hazardQuestion.slice(0, 200)
      }
    }

    // ── Validate we have a stain ───────────────────────────────
    if (!ctx.stain) {
      if (ctx.fiber) {
        // Care label scanned but stain not identified — prompt user
        return NextResponse.json(
          { error: 'stain_not_identified', fiberContext: { fiber: ctx.fiber, careSymbols: ctx.careSymbols, warnings: ctx.labelWarnings }, message: 'Care label scanned. Please describe the stain.' },
          { status: 422 }
        )
      }
      return NextResponse.json({ error: 'Stain required' }, { status: 400 })
    }

    // ── Rate limit (per-IP, all users except authenticated eval runner) ─────
    const clientIp = getClientIp(req)
    if (!isEvalRunner && isRateLimited(clientIp, RATE_LIMIT_WINDOW_MS, RATE_LIMIT_MAX)) {
      return NextResponse.json({ error: 'Too many requests' }, { status: 429 })
    }

    // ── Solve gate (single call — after stain is confirmed) ────
    // NOTE: Only gate after stain is validated so failed requests don't consume trial credits.
    // TASK-033 eval runner bypass: authenticated server-to-server eval traffic
    // should exercise solve behavior without burning trial credits or getting
    // blocked by subscriber/free gating.
    let viewerTier: SolveTier | 'anon' = 'anon'
    if (!isEvalRunner) {
      const gateResult = await checkAndIncrementSolve(email, clientIp)
      viewerTier = gateResult.viewerTier
      if (!gateResult.allowed) {
        const isTransient = gateResult.reason === 'temporary_error'
        return NextResponse.json(
          {
            error: gateResult.reason || 'trial_expired',
            reason: gateResult.reason,
            viewerTier,
          },
          { status: isTransient ? 503 : 402 }
        )
      }
    } else {
      // Eval runner bypasses auth/usage, but preview probes may request a
      // consumer render tier to validate public output without burning credits.
      viewerTier = evalViewerTier ?? 'founder'
    }

    // ── Plant context (TASK-023 Phase C) ───────────────────────
    // Best-effort: fetches the user's plant if they belong to one. Returns null
    // for anon, no-plant, or Supabase errors — solve gracefully degrades to
    // canonical behavior in any of those cases.
    const userPlant = await getUserPlant(email)

    // ── Event log: solve.requested ─────────────────────────────
    // TASK-040 Week 0 Day 2. Fire-and-forget; never blocks user.
    const correlationId = newCorrelationId()
    recordEvent({
      type: EVENT_TYPES.SOLVE_REQUESTED,
      actor_id: email ?? null,
      plant_id: (userPlant as { id?: string } | null)?.id ?? null,
      payload: { stain: ctx.stain, surface: ctx.surface, lang, has_fiber_context: !!ctx.fiber },
      correlation_id: correlationId,
    }).catch(() => {})

    // ── Library lookup (via DecisionEngine seam — TASK-040 Day 3) ──────
    const result = await decide({
      stain: ctx.stain,
      surface: ctx.surface,
      plant_id: (userPlant as { id?: string } | null)?.id ?? null,
      lang,
    })
    if (result.card) {
      applyFiberModifications(result.card, ctx)
      injectContextWarnings(result.card, ctx)
      if (ctx.fiber) (result.card as any)._fiberContext = { fiber: ctx.fiber, careSymbols: ctx.careSymbols, warnings: ctx.labelWarnings }

      // Safety filter also applies to library cards — library authors may
      // have missed newer safety rules. Auto-correct replaceable violations
      // and fall back contextually on nuclear violations.
      const librarySafety = runSafetyFilter(result.card, ctx.stain, ctx.surface)
      if (!librarySafety.safe) {
        console.error(`[SafetyFilter] Library card BLOCKED: ${librarySafety.violations.map((v: any) => v.rule).join(', ')}`)
        logSolveHistory({ stain: ctx.stain, surface: ctx.surface, title: 'safety-blocked', source: 'library-blocked', confidence: 0 }).catch(() => {})
        return NextResponse.json({
          card: finalizeCardForResponse(buildContextualFallback(ctx), viewerTier, ctx),
          tier: 4, confidence: 0, source: 'library-safety-blocked', stainType: resolveStainType(null, ctx), _safetyBlocked: true,
          viewerTier,
        })
      }
      const filteredCard = librarySafety.card
      ensureBleachNeutralization(filteredCard, viewerTier && PAID_TIERS.has(viewerTier) ? 'pro' : 'consumer')
      enrichProductsWithAffiliates(filteredCard)
      // Plant-level filters (TASK-023 Phase C v1): bleach_allowed=false suppresses
      // chlorine steps; solvent='wet-only' flags dry-side; house_rules appended.
      // No-op if userPlant is null.
      const plantTunedCard = applyPlantFilters(filteredCard, userPlant)
      logSolveHistory({ stain: ctx.stain, surface: ctx.surface, title: plantTunedCard.title, source: userPlant ? 'library-plant-tuned' : 'library', confidence: result.confidence }).catch(() => {})
      // ── Event log: procedure.served ────────────────────────────
      recordEvent({
        type: EVENT_TYPES.PROCEDURE_SERVED,
        actor_id: email ?? null,
        plant_id: (userPlant as { id?: string } | null)?.id ?? null,
        payload: {
          procedure_id: (plantTunedCard as { id?: string }).id ?? null,
          procedure_type: 'stain_solve',
          procedure_title: (plantTunedCard as { title?: string }).title ?? null,
          stain: ctx.stain,
          surface: ctx.surface,
          source: userPlant ? 'library-plant-tuned' : 'library',
          confidence: result.confidence,
          tier: result.tier,
        },
        correlation_id: correlationId,
      }).catch(() => {})
      logSolveReview({
        queryRaw: `${ctx.stain} on ${ctx.surface}`,
        stain: ctx.stain,
        surface: ctx.surface,
        tierRequested: viewerTier,
        matchedCardKey: (plantTunedCard as { id?: string }).id ?? null,
        usedAiFallback: false,
        userId: email,
        sessionId: correlationId,
      })
      return NextResponse.json({ ...result, card: finalizeCardForResponse(plantTunedCard, viewerTier, ctx), stainType: resolveStainType(plantTunedCard, ctx), correlationId, viewerTier, _serverMs: Date.now() - _t0 })
    }

    // ── TASK-056: parse the unknown-meta suffix ONCE here ─────
    // When the disambiguation UI's Unknown option fires a re-solve,
    // the stain arrives as `<original>-unknown-general`. That's the
    // user's explicit consent to a general baseline response and it
    // overrides the pro-tier AI gate — they've been told, up-front,
    // that this isn't stain-specific.
    const unknownMeta = parseUnknownMetaStain(ctx.stain)
    const explicitAiConsent = unknownMeta.isUnknown

    // ── TASK-056: Pro-tier disambiguation prompt ──────────────
    // Pro tiers (Spotter/Operator/Founder) get a routing-honesty
    // question when their input is ambiguous instead of an AI card
    // pretending certainty. Home/Free/Anon keep the existing
    // frictionless AI-fallback path unchanged (Atlas 8243 lock).
    const isProTier = viewerTier === 'spotter' || viewerTier === 'operator' || viewerTier === 'founder'
    if (isProTier && !explicitAiConsent && isAmbiguousStainInput(ctx.stain)) {
      const prompt = getDisambiguationPrompt(ctx.stain)
      if (prompt) {
        recordEvent({
          type: EVENT_TYPES.SOLVE_DISAMBIGUATION_PROMPTED,
          actor_id: email ?? null,
          plant_id: (userPlant as { id?: string } | null)?.id ?? null,
          payload: {
            original_stain: ctx.stain,
            surface: ctx.surface,
            option_count: prompt.options.length,
            tier: viewerTier,
          },
          correlation_id: correlationId,
        }).catch(() => {})
        logSolveReview({
          queryRaw: `${ctx.stain} on ${ctx.surface}`,
          stain: ctx.stain,
          surface: ctx.surface,
          tierRequested: viewerTier,
          matchedCardKey: null,
          usedAiFallback: false,
          userId: email,
          sessionId: correlationId,
        })
        return NextResponse.json({
          disambiguation_prompt: prompt,
          original_query: { stain: ctx.stain, surface: ctx.surface },
          correlationId,
          viewerTier,
        })
      }
      // If the token was in AMBIGUOUS_STAIN_TOKENS but getDisambiguationPrompt
      // returned null (tree miss), fall through to the pro-tier gate below.
    }

    // ── Pro-tier verified-only gate (Atlas 8088 + 8102) ────────
    // Spotter and Operator must never see AI-generated chemistry —
    // pros can't un-read a bad protocol, and "AI might be right" is
    // not a defensible trust model for paid tiers. If the library
    // didn't match, bail here with a "No verified protocol yet"
    // response and log the query so it surfaces as a high-priority
    // card to author next.
    //
    // No exception for the Unknown/general disambiguation path on paid pro tiers:
    // those tiers are verified-only, so never fall through to AI-generated
    // chemistry when a verified library card is missing.
    if (viewerTier === 'spotter' || viewerTier === 'operator') {
      logSolveReview({
        queryRaw: `${ctx.stain} on ${ctx.surface}`,
        stain: ctx.stain,
        surface: ctx.surface,
        tierRequested: viewerTier,
        matchedCardKey: null,
        usedAiFallback: false,
        userId: email,
        sessionId: correlationId,
      })
      return NextResponse.json({
        card: null,
        tier: 4,
        confidence: 0,
        source: 'no-verified-protocol',
        stainType: resolveStainType(null, ctx),
        correlationId,
        viewerTier,
        noVerifiedProtocol: true,
        message: 'No verified protocol yet for this combination. We log every uncovered query and add verified cards continuously — try again soon, or email support if it\'s urgent.',
      })
    }

    // Known dangerous gaps get a deterministic refusal before AI fallback, so
    // model variance cannot produce unsafe solvent steps.
    {
      const refuse = checkHardRefuseCombo(ctx.stain, ctx.surface, lang)
      if (refuse) {
        logSolveHistory({
          stain: ctx.stain,
          surface: ctx.surface,
          title: refuse.title,
          source: 'hard-refuse',
          confidence: 0,
        }).catch(() => {})
        logSolveReview({
          queryRaw: `${ctx.stain} on ${ctx.surface}`,
          stain: ctx.stain,
          surface: ctx.surface,
          tierRequested: viewerTier,
          matchedCardKey: null,
          usedAiFallback: false,
          userId: email,
          sessionId: correlationId,
        })
        recordEvent({
          type: EVENT_TYPES.SOLVE_AI_FALLBACK_SERVED,
          actor_id: email ?? null,
          plant_id: (userPlant as { id?: string } | null)?.id ?? null,
          payload: {
            stain: ctx.stain,
            surface: ctx.surface,
            tier: viewerTier,
            hard_refuse_rule: 'HR-1',
          },
          correlation_id: correlationId,
        }).catch(() => {})
        return NextResponse.json({
          card: finalizeCardForResponse(refuse, viewerTier, ctx),
          tier: 4,
          confidence: 0,
          source: 'hard-refuse',
          stainType: resolveStainType(null, ctx),
          correlationId,
          viewerTier,
          _hardRefuse: true,
        })
      }
    }

    // ── TASK-234: deterministic fast path for red-cell sessions ─────────
    // When session evidence already fires a red cell, the terminal gate would
    // constrain whatever the AI produced anyway — so for consumer tiers we
    // skip the 8-28s AI call entirely and serve the deterministic protect+
    // refer verdict immediately. Safety is equal-or-better (deterministic,
    // contract-clean, gate-verified); latency on the HIGHEST-RISK sessions
    // drops from the AI tail to sub-second. Founder/paid behavior unchanged.
    if (!(viewerTier && PAID_TIERS.has(viewerTier))) {
      const fastEvidence = parseSessionEvidence({
        stain: ctx.stain,
        surface: ctx.surface,
        careSymbols: ctx.careSymbols,
        // codex-review P2 (TASK-236): same evidence surface as the finalize
        // path — fiber/damage disclosures in these fields must reach the
        // fast-path red cells too.
        fabricDescription: (ctx as { fabricDescription?: string }).fabricDescription,
        garmentLocation: (ctx as { garmentLocation?: string }).garmentLocation,
        hazardQuestion: (ctx as { hazardQuestion?: string }).hazardQuestion,
      })
      const fastReasons = firedRedCells(fastEvidence)
      if (fastReasons.length > 0) {
        const fastCard = buildDowngradeCard({}, fastReasons, ctx.stain, ctx.surface)
        logSolveHistory({ stain: ctx.stain, surface: ctx.surface, title: fastCard.title, source: 'deterministic-fast-path', confidence: 1 }).catch(() => {})
        logSolveReview({
          queryRaw: `${ctx.stain} on ${ctx.surface}`,
          stain: ctx.stain,
          surface: ctx.surface,
          tierRequested: viewerTier,
          matchedCardKey: null,
          usedAiFallback: false,
          userId: email,
          sessionId: correlationId,
        })
        recordEvent({
          type: EVENT_TYPES.SOLVE_AI_FALLBACK_SERVED,
          actor_id: email ?? null,
          plant_id: null,
          payload: { stain: ctx.stain, surface: ctx.surface, tier: viewerTier, fast_path_reasons: fastReasons },
          correlation_id: correlationId,
        }).catch(() => {})
        return NextResponse.json({
          card: finalizeCardForResponse(fastCard, viewerTier, ctx),
          tier: 4,
          confidence: 1,
          source: 'deterministic-fast-path',
          stainType: resolveStainType(null, ctx),
          correlationId,
          viewerTier,
          _fastPath: true,
          _serverMs: Date.now() - _t0,
        })
      }
    }

    // ── AI fallback (Home / Free / Anon only) ──────────────────
    try {
      // TASK-231: Stain Brain retrieval is DISABLED on this path — it is the
      // consumer (+founder) AI fallback, and sb_chunks are professional/
      // internal references that must not reach the consumer prompt (Atlas
      // review finding, 2026-06-10). Packet 6 rebuilds grounding with an
      // audience-gated corpus; until then consumer AI runs ungrounded and the
      // output guard + safety filter remain the rendering gates.
      const aiCardRaw = await generateAIProtocol(ctx, lang)
      // Normalize shape before any downstream processing — caps step count,
      // merges adjacent rinses, strips numeric dwell, caps instruction length.
      // See lib/protocols/normalizeAICard.ts (2026-04-18 Atlas call).
      const aiCard = normalizeAICard(aiCardRaw)
      injectContextWarnings(aiCard, ctx)
      if (ctx.fiber) aiCard._fiberContext = { fiber: ctx.fiber, careSymbols: ctx.careSymbols, warnings: ctx.labelWarnings }

      const safetyResult = runSafetyFilter(aiCard, ctx.stain, ctx.surface)

      if (!safetyResult.safe) {
        console.error(`[SafetyFilter] BLOCKED: ${safetyResult.violations.map((v: any) => v.rule).join(', ')}`)
        return NextResponse.json({
          card: finalizeCardForResponse(buildContextualFallback(ctx), viewerTier, ctx),
          tier: 4, confidence: 0, source: 'ai', stainType: resolveStainType(null, ctx), _safetyBlocked: true,
          viewerTier,
        })
      }

      const safeCard = safetyResult.card
      if (safetyResult.filtered) {
        console.log(`[SafetyFilter] Auto-corrected ${safetyResult.violations.length} violation(s)`)
        safeCard._safetyFiltered = true
      }

      queueForReview(safeCard, ctx, safetyResult).catch(() => {})
      ensureBleachNeutralization(safeCard, 'consumer')
      enrichProductsWithAffiliates(safeCard)
      // Apply plant-level filters to AI-generated cards too — bleach policy
      // and house rules must be respected regardless of card source.
      const plantTunedAi = applyPlantFilters(safeCard, userPlant)
      logSolveHistory({ stain: ctx.stain, surface: ctx.surface, title: plantTunedAi.title || ctx.stain, source: userPlant ? 'ai-plant-tuned' : 'ai', confidence: 0.5 }).catch(() => {})

      logSolveReview({
        queryRaw: `${ctx.stain} on ${ctx.surface}`,
        stain: ctx.stain,
        surface: ctx.surface,
        tierRequested: viewerTier,
        matchedCardKey: null,
        usedAiFallback: true,
        userId: email,
        sessionId: correlationId,
      })
      recordEvent({
        type: EVENT_TYPES.SOLVE_AI_FALLBACK_SERVED,
        actor_id: email ?? null,
        plant_id: (userPlant as { id?: string } | null)?.id ?? null,
        payload: {
          stain: ctx.stain,
          surface: ctx.surface,
          tier: viewerTier,
          had_disambiguation: explicitAiConsent,
        },
        correlation_id: correlationId,
      }).catch(() => {})
      // TASK-056: attach the disclosure banner when the user got here
      // via the Unknown option in a disambiguation flow. The banner is
      // the UX surface for `verification_level = 'draft'` (TASK-055).
      const aiFallbackDisclosure = explicitAiConsent
        ? {
            label: 'General starting point — not stain-specific',
            body: 'We couldn\'t narrow this to a specific stain class. These are tested general steps. If no response after 1–2 passes, take it to a professional.',
          }
        : undefined
      return NextResponse.json({
        card: finalizeCardForResponse(plantTunedAi, viewerTier, ctx),
        tier: 4,
        confidence: 0.5,
        source: 'ai',
        stainType: resolveStainType(plantTunedAi, ctx),
        correlationId,
        viewerTier,
        ...(aiFallbackDisclosure ? { ai_fallback_disclosure: aiFallbackDisclosure } : {}),
        _serverMs: Date.now() - _t0,
      })
    } catch (err) {
      console.error('AI fallback failed:', err)
      return NextResponse.json({
        card: finalizeCardForResponse(buildContextualFallback(ctx), viewerTier, ctx),
        tier: 4, confidence: 0, source: 'ai-unavailable', stainType: resolveStainType(null, ctx), _aiUnavailable: true,
        viewerTier,
      })
    }

  } catch (err) {
    console.error('Solve error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
