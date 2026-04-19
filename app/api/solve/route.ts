// app/api/solve/route.ts
import { NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { lookupProtocol, detectFamily } from '@/lib/protocols/lookup'
import { decide } from '@/lib/decision/engine'
import { recordEvent, newCorrelationId, EVENT_TYPES } from '@/lib/events/record'
import { getUserPlant } from '@/lib/auth/getUserPlant'
import { applyPlantFilters } from '@/lib/protocols/applyPlantFilters'
import { runSafetyFilter, SAFE_FALLBACK } from '@/lib/safety/filter'
import { normalizeAICard } from '@/lib/protocols/normalizeAICard'
import { retrieveForQuery, formatRetrievedContext, applyGroundedAttribution, isRetrievalEnabled, type RetrievalResult } from '@/lib/stainbrain/retrieve'
import { ensureBleachNeutralization } from '@/lib/safety/bleach-neutralization'
import { enrichProductsWithAffiliates } from '@/lib/protocols/enrichProducts'
import { createClient } from '@supabase/supabase-js'
import { identifyStain, readCareLabel } from '@/lib/vision'
import { buildSolveContext } from '@/lib/solve/context'
import type { SolveContext } from '@/lib/solve/context'

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

// ── Server-side solve gating ───────────────────────────────────
const FOUNDER_EMAILS = ['tyler@gonr.pro', 'tyler@nexshift.co', 'twfyke@me.com', 'eval@gonr.app', 'jeff@cleanersupply.com']

const FREE_SOLVE_LIMIT = 3

// Counts and atomically increments a solve_usage row keyed by `key`
// (email for logged-in users, `anon:<ip>` for unauthenticated).
// Pure usage-count gate, no time window. Canonical rule per Learnings:
// 3 free solves after email signup, period. The 7-day trial window was
// removed in TASK-027 to match that rule.
async function consumeSolveFromUsage(
  supabase: ReturnType<typeof getSupabaseAdmin>,
  key: string,
  reasonWhenBlocked: string,
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

  if (usage.solve_count >= FREE_SOLVE_LIMIT) {
    return { allowed: false, reason: reasonWhenBlocked }
  }

  await supabase
    .from('solve_usage')
    .update({ solve_count: usage.solve_count + 1, last_solve_at: now.toISOString() })
    .eq('email', key)

  return { allowed: true }
}

async function checkAndIncrementSolve(email: string | null, clientIp: string): Promise<{ allowed: boolean; reason?: string }> {
  // Founder bypass: exact email match only — outside the try so a Supabase
  // outage cannot lock founders out.
  if (email && FOUNDER_EMAILS.includes(email.toLowerCase())) return { allowed: true }

  try {
    const supabase = getSupabaseAdmin()

    // Authenticated path — check subscription first, then trial usage.
    if (email) {
      const { data: subscription } = await supabase
        .from('subscriptions')
        .select('status, tier')
        .eq('email', email.toLowerCase())
        .single()

      // Paying subscribers (status='active') are not gated.
      if (subscription && subscription.status === 'active') return { allowed: true }

      return await consumeSolveFromUsage(supabase, email.toLowerCase(), 'trial_expired')
    }

    // Unauthenticated path — persistent 3-lifetime-solves per IP,
    // tracked in solve_usage with an `anon:<ip>` key.
    return await consumeSolveFromUsage(supabase, `anon:${clientIp}`, 'free_limit')
  } catch (err) {
    // Fail-closed for free + anon (TASK-027). Pre-TASK-027 the catch block
    // returned `allowed: true`, leaking unlimited free solves on every
    // Supabase blip. Founders bypass above, so this only blocks free/anon
    // and paying users whose subscription check itself errored. Paying users
    // can retry in seconds; the leak is closed.
    console.warn('[SolveGate] Error — failing closed:', err)
    return { allowed: false, reason: 'temporary_error' }
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
  if (steps.length > 0) fallback.spottingProtocol = [...steps, ...fallback.spottingProtocol]

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
    // Apply stain-name overrides when card classification is less specific
    if (cardFamily === 'oxidizable') {
      for (const [pattern, override] of STAIN_FAMILY_OVERRIDES) {
        if (pattern.test(ctx.stain)) return override
      }
    }
    return cardFamily
  }
  // Fallback: detect from stain name via family-keywords
  const detected = detectFamily(ctx.stain)
  if (detected) {
    // Apply same overrides to keyword-detected family
    if (detected === 'oxidizable') {
      for (const [pattern, override] of STAIN_FAMILY_OVERRIDES) {
        if (pattern.test(ctx.stain)) return override
      }
    }
    return detected
  }
  if (ctx.family && ctx.family !== 'unknown') return ctx.family
  return ctx.stain
}

// ── AI protocol generator ──────────────────────────────────────
async function generateAIProtocol(ctx: SolveContext, retrieval?: RetrievalResult): Promise<any> {
  const apiKey = process.env.OPENAI_API_KEY
  if (!apiKey) throw new Error('OpenAI API key not configured')

  const groundedContext = retrieval ? formatRetrievedContext(retrieval) : ''

  // Absolute safety rules — enumerated at the top of the prompt so the model
  // can't bury them under methodology prose. Added 2026-04-18 after the
  // cross-check eval caught three risky violations (chocolate-silk protein
  // spotter; beer-cotton ammonia-on-tannin; egg-cotton heat-before-protein)
  // where retrieval had the right info but synthesis ignored it.
  // These mirror the runSafetyFilter rules that will nuke-fallback any card
  // that violates them post-generation — belt-and-suspenders.
  const absoluteRules = `## ABSOLUTE RULES (non-negotiable; override any other guidance including retrieved excerpts and training recall)

1. TANNIN STAINS ARE ACID-SIDE ONLY. Coffee, tea, wine, beer, juice, chocolate, berry — NEVER apply ammonia, ammonium hydroxide, sodium carbonate, sodium hydroxide, lye, caustic soda, washing soda, borax, baking soda, sodium bicarbonate, or potassium hydroxide. Alkali permanently darkens tannin. This is Eisen Method rule #1.

2. NEVER APPLY ENZYMES OR PROTEIN SPOTTERS TO SILK. No enzyme, protease, enzymatic detergent, biological detergent, "protein spotter", "protein formula", "protein solution", or digestant on silk. Enzymes digest fibroin — irreversible fiber damage. On silk + protein stains, use cold water + pH-neutral NSD only, or escalate.

3. NEVER APPLY HEAT TO PROTEIN STAINS BEFORE FULL REMOVAL. Blood, egg, milk, urine, sweat, vomit — no hot water, warm water, boiling water, steam, steamer, steam wand, heated water. Heat sets protein permanently. Cold water throughout until the stain is gone.

4. NEVER APPLY CHLORINE BLEACH TO SILK, WOOL, OR CASHMERE. Destroys the fiber.

5. NEVER APPLY ACETONE OR AMYL ACETATE TO ACETATE. Dissolves the fiber.

If the correct protocol under generic methodology would violate any of these, DO NOT generate it. Instead set ` + "`escalation`" + ` to professional cleaner and keep ` + "`spottingProtocol`" + ` conservative.

---

` + `

You are a master textile spotter trained in the Eisen Method — 40+ years of professional stain removal science and textile chemistry.`
  const systemPrompt = absoluteRules + `

Given a complete stain brief, produce a precise JSON protocol card. Every recommendation must be safe for the specific fiber and respect all care label restrictions.

## EISEN METHODOLOGY (Non-Negotiable)

ABSOLUTE RULE #1 OVERRIDES THIS CYCLE. If the stain is pure tannin (coffee, tea, wine, beer, juice, chocolate, berry), the ammonia phases below do NOT run — not step 5, not step 10, not any variant. Pure tannin is acid-side only.

SEQUENCING — Follow the pH-oscillation cycle, but treat the ammonia phases as CONDITIONAL on a protein component being present:
1. Cool water (dilute/loosen) → 2. Mild detergent + water (emulsify) → 3. Vinegar + detergent (acid phase for tannin) → 4. Water rinse → 5. [PROTEIN/COMBINATION ONLY] Ammonia + detergent (alkali phase for protein) → 6. Water rinse → 7. Vinegar (neutralize ammonia — MANDATORY to prevent yellowing) → 8. Water rinse → 9. Hydrogen peroxide (oxidative bleaching) → 10. [PROTEIN/COMBINATION ONLY] Ammonia immediately after peroxide (accelerates bleaching on protein residue) → 11. Wait 3 min → 12. Water rinse → 13. Vinegar (neutralize) → 14. Water rinse.

PURE TANNIN PATH: run steps 1-4, skip 5-7 entirely, then 8 → 9 → skip 10 → 11 → 12 → (13 only if vinegar was used earlier) → 14. Peroxide on tannin is acid-activated or plain, NEVER ammonia-accelerated.

Skip phases that don't apply to the stain type. NEVER skip vinegar after ammonia. NEVER introduce ammonia into a pure-tannin flow even when a step labeled "accelerator" tempts it.

COMBINATION STAINS (tannin + protein, e.g. coffee with milk, chocolate, gravy):
- ALWAYS treat tannin FIRST with acid (vinegar). Complete all acid rinses.
- THEN treat protein with ammonia. Reversing this order PERMANENTLY SETS the tannin.

CRITICAL DON'Ts:
- NEVER use ammonia/alkali directly on tannin stains (coffee, tea, wine, beer, juice) — sets them permanently
- NEVER use alcohol on protein stains (blood, milk, egg, sweat) — denatures and sets protein
- NEVER apply heat above 120°F during spotting — heat sets most stains
- NEVER use chlorine bleach on wool, silk, or protein fibers
- NEVER use enzymes on silk or wool (enzymes digest protein fibers)
- NEVER use acetone or amyl acetate on acetate fabric (dissolves fiber)
- NEVER mix ammonia + chlorine bleach (toxic chlorine gas)
- ALWAYS test colors on unexposed area first
- ALWAYS neutralize ammonia with vinegar (prevents yellowing)
- ALWAYS neutralize bleach with vinegar (prevents fiber damage)

FIBER VULNERABILITY (treat blends by most vulnerable fiber):
- Silk: EXTREME — no chlorine bleach, no strong alkali, no enzymes, no heat, minimal water
- Wool: HIGH — no chlorine bleach, no hot water, test enzymes, no rubbing when wet
- Acetate: HIGH — no acetone, no amyl acetate, no heat, test everything
- Rayon: MODERATE — loses 50% strength when wet, no rubbing, no hot water
- Cotton: LOW — tolerates most agents, test colors, avoid heat during spotting
- Polyester: LOW — avoid high heat, test solvents

PROFESSIONAL AGENTS:
- NSD (neutral synthetic detergent), POG (paint/oil/grease remover), Protein formula (enzyme-based), Tannin formula (oxidizing), Acetic acid 28% → 20% working strength, Amyl acetate (adhesives — NOT on acetate), H₂O₂ 3-6%, Feathering agent, Steam gun (4-6 inch minimum distance)

BLEACH SELECTION:
- Tannin traces (pure): H₂O₂ alone (acid-activated with vinegar if needed), or sodium perborate bath. NEVER H₂O₂ + ammonia on pure tannin — alkali darkens tannin permanently, overriding any "accelerator" heuristic.
- Protein traces: H₂O₂ + ammonia
- Combination tannin + protein: treat tannin first (acid side), fully rinse, then H₂O₂ + ammonia on residual protein
- Dye stains: sodium hydrosulphite (reducing bleach) or titanium sulfate
- Mildew: sodium hypochlorite (cellulose only)
- Yellowing: sodium perborate/percarbonate
- Every 18°F temperature increase doubles bleach reaction speed

FORMATTING RULES:
- Never recommend "distilled water" — use "cold water" instead. Home users don't have distilled water.
- Agent names must be in Title Case (e.g. "Cold Water", "Neutral Dish Soap", "White Vinegar Solution").
- Step instructions must be complete sentences with proper capitalization and punctuation.
- Keep steps concise and direct — one action per step.
- Include repeat cycling note for stubborn stains (turmeric, rust, old wine often need 2-3 passes).

LENGTH + SHAPE (match the verified library norm):
- Output 5 to 8 primary steps. NEVER more than 8. Aim for 5-6 on easy stains, 7-8 only when the chemistry truly needs them.
- CONSOLIDATE repetitive rinses: one rinse step after a chemistry phase covers the whole phase. Do not emit "Rinse with cold water" as a standalone step after every other action — rinses are folded into the action that precedes them, OR appear as one closing rinse.
- Do NOT prescribe numeric dwell times in instruction prose. Use soft language ("Monitor and reapply as needed", "Work briefly; check frequently"). The dwellTime struct field should also be soft language, never a number range.
- Keep each instruction under ~200 characters. Move longer chemistry context to stainChemistry or whyThisWorks.
- STAIN FAMILY CLASSIFICATION RULES (override any ambiguity):
  • rust/corrosion on any surface = "mineral"
  • mold/mildew/fungus = "mildew"
  • nail polish/lacquer = "dye"
  • mineral deposits/hard water = "particulate"
  • wax/candle wax = "wax-gum"
  • NEVER return "unknown" if the stain can be reasonably classified

Return ONLY valid JSON:
{
  "id": "<stain-slug>-<surface-slug>",
  "title": "<descriptive title>",
  "stainFamily": "<protein|tannin|oil-grease|dye|mineral|oxidizable|combination|particulate|wax-gum|bleach-damage|adhesive|pigment|mildew> — MANDATORY: always classify. NEVER use 'unknown'. Examples: wine/coffee/tea/beer = tannin; blood/egg/dairy/sweat/urine = protein; oil/grease/butter/cooking oil = oil-grease; ink/dye transfer/permanent marker = dye; rust/iron = mineral; mold/mildew/fungus = mildew; nail polish/resin = dye; bird droppings = protein; grass = pigment; sunscreen = combination; chocolate/tomato sauce = combination.",
  "surface": "<surface>",
  "source": "ai-generated",
  "stainChemistry": "<1-2 sentences on the chemistry of this stain on this surface>",
  "whyThisWorks": "<1-2 sentences explaining why the recommended approach works>",
  "spottingProtocol": [
    {
      "step": 1,
      "agent": "<professional chemical or tool>",
      "technique": "<brief technique>",
      "temperature": "<temperature guidance>",
      "dwellTime": "<time range>",
      "instruction": "<clear, direct instruction — one action per step>"
    }
  ],
  "homeSolutions": ["<paragraph 1>", "<paragraph 2>"],
  "materialWarnings": ["<warning 1>", "<warning 2>"],
  "products": {
    "professional": [{"name": "<product>", "use": "<use case>", "note": "<note>"}],
    "consumer": [{"name": "<product>", "use": "<use case>", "note": "<note>"}]
  },
  "escalation": {
    "when": "<when to escalate>",
    "whatToTell": "<what to tell the cleaner>",
    "specialistType": "<type of specialist>"
  },
  "difficulty": 5,
  "meta": { "riskLevel": "medium", "tier": "ai-generated" }
}`

  // Prepend retrieved grounding context when available. Sits at the top of
  // the system prompt so the model weighs excerpts above the generic
  // methodology when they conflict (see formatRetrievedContext).
  const fullSystemPrompt = groundedContext
    ? `${groundedContext}\n${systemPrompt}`
    : systemPrompt

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
export async function POST(req: Request) {
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

      // Text-only solve — no vision needed
      ctx = buildSolveContext({
        stainResult: null,
        labelResult: null,
        stainHint: body.stain || '',
        surfaceHint: body.surface || '',
      })
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
    if (!isEvalRunner) {
      const gateResult = await checkAndIncrementSolve(email, clientIp)
      if (!gateResult.allowed) {
        // 503 for transient Supabase errors (client should retry); 402 for real
        // payment-required block (trial_expired / free_limit / anon_limit).
        const isTransient = gateResult.reason === 'temporary_error'
        return NextResponse.json(
          { error: gateResult.reason || 'trial_expired', reason: gateResult.reason },
          { status: isTransient ? 503 : 402 }
        )
      }
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
          card: buildContextualFallback(ctx),
          tier: 4, confidence: 0, source: 'library-safety-blocked', stainType: resolveStainType(null, ctx), _safetyBlocked: true,
        })
      }
      const filteredCard = librarySafety.card
      ensureBleachNeutralization(filteredCard)
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
      return NextResponse.json({ ...result, card: plantTunedCard, stainType: resolveStainType(plantTunedCard, ctx), correlationId })
    }

    // ── AI fallback ────────────────────────────────────────────
    try {
      // Stain Brain retrieval (TASK-005 Phase 2) — fetch grounded context
      // from sb_chunks when the kill switch is on. Returns a non-retrieving
      // result when disabled or on missing creds — no behavior change.
      let retrieval: RetrievalResult | undefined
      if (isRetrievalEnabled()) {
        retrieval = await retrieveForQuery(`${ctx.stain} on ${ctx.surface}`, { topK: 5 })
        console.log('[stainbrain] retrieval', {
          query: retrieval.query,
          retrieved: retrieval.retrieved,
          chunks: retrieval.chunks.length,
          top_source_ids: retrieval.top_source_ids,
          latency_ms: retrieval.latency_ms,
          error: retrieval.error,
        })
      }

      const aiCardRaw = await generateAIProtocol(ctx, retrieval)
      // Normalize shape before any downstream processing — caps step count,
      // merges adjacent rinses, strips numeric dwell, caps instruction length.
      // See lib/protocols/normalizeAICard.ts (2026-04-18 Atlas call).
      const aiCard = normalizeAICard(aiCardRaw)
      // Deterministic source attribution — don't trust the model to self-cite
      // (preview verification 2026-04-18 showed the model ignored the "name
      // source families" directive). Populates `grounded_sources` and
      // appends a grounded-in tail to whyThisWorks if absent. No-op when
      // retrieval didn't run.
      if (retrieval?.retrieved) applyGroundedAttribution(aiCard, retrieval)
      injectContextWarnings(aiCard, ctx)
      if (ctx.fiber) aiCard._fiberContext = { fiber: ctx.fiber, careSymbols: ctx.careSymbols, warnings: ctx.labelWarnings }

      const safetyResult = runSafetyFilter(aiCard, ctx.stain, ctx.surface)

      if (!safetyResult.safe) {
        console.error(`[SafetyFilter] BLOCKED: ${safetyResult.violations.map((v: any) => v.rule).join(', ')}`)
        return NextResponse.json({
          card: buildContextualFallback(ctx),
          tier: 4, confidence: 0, source: 'ai', stainType: resolveStainType(null, ctx), _safetyBlocked: true,
        })
      }

      const safeCard = safetyResult.card
      if (safetyResult.filtered) {
        console.log(`[SafetyFilter] Auto-corrected ${safetyResult.violations.length} violation(s)`)
        safeCard._safetyFiltered = true
      }

      queueForReview(safeCard, ctx, safetyResult).catch(() => {})
      ensureBleachNeutralization(safeCard)
      enrichProductsWithAffiliates(safeCard)
      // Apply plant-level filters to AI-generated cards too — bleach policy
      // and house rules must be respected regardless of card source.
      const plantTunedAi = applyPlantFilters(safeCard, userPlant)
      logSolveHistory({ stain: ctx.stain, surface: ctx.surface, title: plantTunedAi.title || ctx.stain, source: userPlant ? 'ai-plant-tuned' : 'ai', confidence: 0.5 }).catch(() => {})

      return NextResponse.json({ card: plantTunedAi, tier: 4, confidence: 0.5, source: 'ai', stainType: resolveStainType(plantTunedAi, ctx), correlationId })
    } catch (err) {
      console.error('AI fallback failed:', err)
      return NextResponse.json({
        card: buildContextualFallback(ctx),
        tier: 4, confidence: 0, source: 'ai-unavailable', stainType: resolveStainType(null, ctx), _aiUnavailable: true,
      })
    }

  } catch (err) {
    console.error('Solve error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
