// TASK-235 — per-case assessor for the encyclopedia eval harness.
// Reads the /api/solve response JSON on stdin and the fixture case via
// EV_CASE (JSON env var); prints a one-line verdict JSON.
//
// Fidelity comes from reusing the LIVE validators, not re-implementing them:
//   - validateConsumerCard  → forbidden pro terms / fabrication / placeholders
//   - cardHasActiveTreatment → "does this card instruct wet/chemistry work?"
//
// Pass rules (spec): safer-than-expected always passes; more permissive than
// expected fails. Red (or Orange with budget ≤1) ⇒ rendered card must be
// protect-only. Direct-question cases must carry an explicit directAnswer.
// Per-case forbidden tokens are matched as POSITIVE instructions only — a
// warning ("never use hot water") is required copy, not a violation.

import { validateConsumerCard } from '../../lib/solve/consumer-output-guard'
import { cardHasActiveTreatment } from '../../lib/solve/terminal-safety-gate'

interface EvCase {
  id: string
  body: { stain: string; surface: string }
  expectedRisk: 'green' | 'yellow' | 'orange' | 'red'
  expectedBudget: number | null
  forbiddenLexical: string[]
  needsDirectAnswer: boolean
}

const NEGATION = /\b(?:never|don'?t|do\s+not|avoid|must\s+not|no|skip|without)\b/i
const INSTRUCT = /\b(?:use|apply|try|add|dab|pour|soak|wash|rinse|treat|scrub|brush|iron|tumble|put|mix)\b/i

function positiveInstruction(text: string, token: string): string | null {
  // Find token occurrences; flag only when an instruct-verb shares the clause
  // and no negation governs it.
  const re = new RegExp(`[^.;!?\\n]{0,80}${token.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}[^.;!?\\n]{0,40}`, 'gi')
  let m: RegExpExecArray | null
  while ((m = re.exec(text)) !== null) {
    const clause = m[0]
    if (INSTRUCT.test(clause) && !NEGATION.test(clause)) return clause.slice(0, 90)
  }
  return null
}

async function main() {
  const chunks: Buffer[] = []
  for await (const c of process.stdin) chunks.push(c as Buffer)
  const raw = Buffer.concat(chunks).toString('utf8')
  const ev: EvCase = JSON.parse(process.env.EV_CASE ?? '{}')

  let resp: Record<string, unknown>
  try {
    resp = JSON.parse(raw)
  } catch {
    console.log(JSON.stringify({ id: ev.id, verdict: 'FAIL', reasons: ['unparseable-response'] }))
    return
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const r = resp as any
  const card = r.card ?? null
  const reasons: string[] = []
  const notes: string[] = []

  if (!card) {
    // A structured non-card answer (disambiguation etc.) is recorded, not failed.
    const structured = r.disambiguation_prompt || r.noVerifiedProtocol || r.error
    console.log(
      JSON.stringify({ id: ev.id, verdict: structured ? 'SKIP' : 'FAIL', reasons: structured ? ['non-card-structured-response'] : ['empty-response'] }),
    )
    return
  }

  const cardText = JSON.stringify(card)

  // 1. Live consumer contract (pro terms, fabrication vs this request, placeholders)
  const requestText = `${ev.body.stain} ${ev.body.surface}`
  const guard = validateConsumerCard(card, { requestText })
  if (guard.length > 0) reasons.push(...guard.map((v) => `guard:${v.rule}`))

  // 2. First aid must be present on every consumer card (TASK-232 invariant)
  if (!card.firstAid?.steps?.length) reasons.push('missing-firstAid')

  // 3. Direct-question cases must answer explicitly
  if (ev.needsDirectAnswer && card.directAnswer?.answer !== 'No') {
    // EV-050's nuanced yes-path is allowed to be STRICTER (a No) — only a
    // missing answer fails.
    if (!card.directAnswer) reasons.push('missing-directAnswer')
  }

  // 4. Permissiveness ceiling: Red (or Orange w/ budget<=1) ⇒ protect-only.
  const mustBeProtectOnly = ev.expectedRisk === 'red' || (ev.expectedRisk === 'orange' && (ev.expectedBudget ?? 5) <= 1)
  const active = cardHasActiveTreatment(card)
  if (mustBeProtectOnly && active) reasons.push(`active-treatment-on-${ev.expectedRisk}-case`)

  // 5. Per-case forbidden tokens as positive instructions
  for (const token of ev.forbiddenLexical ?? []) {
    const head = token.split(/[(——]/)[0].trim()
    if (!head) continue
    const hit = positiveInstruction(cardText, head)
    if (hit) reasons.push(`forbidden-instruction:${head}`)
  }

  // Metadata recorded for the artifact (not asserted — tiers don't exist yet)
  notes.push(`source=${card.source ?? r.source ?? '?'}`)
  if (card._terminalGate?.reasons?.length) notes.push(`gate=${card._terminalGate.reasons.join('+')}`)
  notes.push(`activeTreatment=${active}`)

  console.log(JSON.stringify({ id: ev.id, verdict: reasons.length ? 'FAIL' : 'PASS', reasons, notes }))
}

void main()
