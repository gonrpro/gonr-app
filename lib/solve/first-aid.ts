// lib/solve/first-aid.ts
// TASK-232 — deterministic immediate first-aid + explicit hazard answers.
//
// buildFirstAid() is rule-driven from session evidence and attached to EVERY
// consumer card leaving /api/solve (library, AI, fallback, refusal,
// downgrade) so the UI always has a conservative protect-first block to show
// — including while the model is still thinking (the client renders the same
// copy statically pre-response). Copy never implies removal or treatment
// permission: blot, no rubbing, no heat, no chemistry, check label, refer.

import type { SessionEvidence } from './session-evidence'

export interface FirstAid {
  headline: string
  steps: string[]
}

export function buildFirstAid(ev?: Partial<SessionEvidence>): FirstAid {
  const steps: string[] = [
    'Blot gently with a clean white cloth, working from the outside of the stain inward. Do not rub.',
    'Keep heat away — no hot water, no hair dryer, no ironing, no machine drying.',
    'Do not apply any cleaning product yet, and never mix bleach with vinegar, ammonia, or any other cleaner.',
    'Check the care label before anything else touches the fabric.',
  ]
  if (ev?.leatherSuede || ev?.liningOrAcetate || ev?.dryCleanOnly) {
    steps.splice(1, 0, 'Do not soak or flood the area with water — this material holds water marks.')
  }
  if (ev?.priorChems && ev.priorChems.length > 0) {
    steps.push('Since a product already touched this stain: rinse that spot with plain cool water only, then stop.')
  }
  return { headline: 'Right now — before anything else', steps }
}

export type DirectHazardQuestion = 'chlorine-bleach' | 'ammonia' | 'acid-mix' | 'hot-water'

export interface DirectAnswer {
  question: string
  answer: 'No'
  why: string
  instead: string
}

const DIRECT_ANSWERS: Record<DirectHazardQuestion, DirectAnswer> = {
  'chlorine-bleach': {
    question: 'Can I use bleach on this?',
    answer: 'No',
    why: 'Chlorine bleach can set this kind of stain, weaken or yellow the fiber, and strip dye — and it destroys wool, silk, and other protein fibers outright. It is not a spot-treatment product.',
    instead:
      'Never mix bleach with vinegar, ammonia, or any other cleaner — mixing can create toxic gas. If bleach has already touched the item, rinse the area with plain cool water and stop. Follow the safe steps below, or take it to a professional.',
  },
  ammonia: {
    question: 'Can I use ammonia on this?',
    answer: 'No',
    why: 'Household ammonia permanently darkens coffee, tea, wine and similar stains, and damages wool and silk. Used near bleach it can create toxic gas.',
    // "Use only the safe steps…" carried a non-negated action verb that read
    // as active treatment on protect-only cards (TASK-236) — stick to
    // verb-free phrasing here.
    instead:
      'Skip ammonia entirely. Never mix it with bleach or any other cleaner. Stick to the safe steps below, or hand it to a professional.',
  },
  'acid-mix': {
    question: 'Can I mix cleaning products for this?',
    answer: 'No',
    why: 'Mixing cleaners — especially anything with bleach or ammonia — can create toxic gas and unpredictable chemical damage to the fabric.',
    // Protect-only (codex-review P1): this answer can render ABOVE a
    // stop/downgrade card, so it must never contain active product guidance.
    instead:
      'Never combine cleaning products. If something already touched the item: plain cool water on that spot, nothing else, then stop. When in doubt, let a professional take it from here.',
  },
  // TASK-236 (EV-049) — heat is a hazard question too. Copy is protect-only:
  // no action verbs outside negated clauses, no rinse phrasing beyond the
  // sanctioned conditional, never names hot water in an instructing clause.
  'hot-water': {
    question: 'Can I use hot water on this?',
    answer: 'No',
    why: 'Heat is the most common way a removable stain becomes permanent — hot water cooks protein stains into the fiber, sets tannins and dyes, and can shrink or distort delicate fabrics.',
    instead:
      'Keep everything cool: no hot water, no dryer, no iron, no steam until the stain is fully out. Blot gently with a clean white cloth, and let a professional take it from here if the stain matters.',
  },
}

export function buildDirectAnswer(q: DirectHazardQuestion): DirectAnswer {
  return DIRECT_ANSWERS[q]
}
