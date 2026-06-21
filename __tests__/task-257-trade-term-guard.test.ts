import { describe, it, expect } from 'vitest'
import {
  validateConsumerCard,
  enforceConsumerCard,
  minimalSafeCard,
} from '@/lib/solve/consumer-output-guard'

// TASK-257 (A) — deterministic consumer-output trade-term guard.
// Tyler's live leak ("apply BonGo / StreeTAN / General Formula 209") was MODEL OUTPUT: the
// consumer prompt bans trade names but the model disobeyed. The guard is the enforcement layer —
// prompt disobedience must NOT be able to render a pro/trade product or hazardous purchase term.
// These tests prove that for every term, an AI card carrying it is blocked and the term never
// survives to the rendered card (it fails closed to the clean "use a professional cleaner" card).

// Representative phrasings a disobeying model could emit, one per forbidden term (incl. the 7
// added in TASK-257 (A): tango, streepene, fortex, picrin, solvon, dithionite, thiourea).
const LEAKS: Array<{ label: string; phrase: string }> = [
  { label: 'bongo', phrase: 'If color remains, apply an oxygen oxidizer like BonGo at 1:1.' },
  { label: 'streetan', phrase: 'Use StreeTAN tannin spotter on the residual stain.' },
  { label: 'formula-209', phrase: 'Finish with General Formula No. 209 for the dye.' },
  { label: 'pog', phrase: 'Flush the area with POG to lift the oil.' },
  { label: 'vds', phrase: 'Apply VDS to the spot before rinsing.' },
  { label: 'mulsolite', phrase: 'Pre-treat with Mulsolite NSD solvent cleaner.' },
  { label: 'amyl-acetate', phrase: 'Dab amyl acetate on the polyurethane transfer.' },
  { label: 'sodium-hydrosulfite', phrase: 'Make a sodium hydrosulfite reducing bath.' },
  { label: 'sodium-dithionite', phrase: 'Use sodium dithionite powder to strip the dye.' },
  { label: 'tango', phrase: 'Apply TanGo oxidizer and let it dwell.' },
  { label: 'streepene', phrase: 'Reduce the stain with StreePene (pro stock).' },
  { label: 'fortex', phrase: 'Try Fortex Oxydent on the tannin shadow.' },
  { label: 'picrin', phrase: 'Sponge Picrin onto the grease ring.' },
  { label: 'solvon', phrase: 'Use Solvon to flush the solvent-soluble stain.' },
  { label: 'solvonk4', phrase: 'Use SolvonK4 to flush the solvent-soluble stain.' },
  { label: 'thiourea', phrase: 'Apply thiourea dioxide to reduce the color.' },
  { label: 'chemspec', phrase: 'Use Chemspec tannin spotter on the residue.' },
  { label: 'tannin-spotter', phrase: 'Apply a tannin spotter to the shadow.' },
  { label: 'tannin-spotters-plural', phrase: 'Buy tannin spotters for coffee shadows.' },
  { label: 'protein-spotter', phrase: 'Treat with a protein spotter first.' },
  { label: 'protein-spotters-plural', phrase: 'Protein spotters are the next step.' },
  { label: 'koh', phrase: 'Make a koh solution to break the bond.' },
  { label: 'potassium-hydroxide', phrase: 'Use caustic potash on the residue.' },
  { label: 'naphtha', phrase: 'Flush with naphtha to lift the oil.' },
  { label: 'petroleum-ether', phrase: 'Apply petroleum ether to the grease.' },
  { label: 'perchloroethylene', phrase: 'Use perchloroethylene on the solvent stain.' },
  { label: 'perc', phrase: 'Use perc on the solvent stain.' },
  { label: 'dry-cleaning-solvent', phrase: 'Dab a dry-cleaning solvent on the spot.' },
  { label: 'dry-cleaning-solvents-plural', phrase: 'Try dry-cleaning solvents on the ring.' },
  { label: 'spotting-agent', phrase: 'Apply a spotting agent from the spotting board.' },
  { label: 'spotting-agents-plural', phrase: 'Use spotting agents from the kit.' },
  { label: 'pro-solvents-plural', phrase: 'Try pro solvents on the ring.' },
]

function aiCardWith(phrase: string) {
  // Simulates a model-authored consumer card that disobeyed the prompt's trade-term ban.
  return {
    title: 'Coffee on Cotton',
    stainChemistry: 'Tannin-based beverage stain.',
    whyThisWorks: 'Cool water flush prevents setting.',
    homeSolutions: ['Blot with cool water.', phrase],
    materialWarnings: ['Cool water only.'],
    escalation: { when: 'If the stain persists.', whatToTell: 'Coffee on cotton.' },
  }
}

describe('TASK-257 (A) — trade-term guard: prompt disobedience cannot render pro/trade terms', () => {
  for (const { label, phrase } of LEAKS) {
    it(`blocks "${label}" in AI output and the term never reaches the rendered card`, () => {
      const dirty = aiCardWith(phrase)
      // 1. The validator catches it.
      const violations = validateConsumerCard(dirty, { requestText: '' })
      expect(violations.some((v) => v.rule.startsWith('forbidden-term:'))).toBe(true)
      // 2. Enforcement blocks it and swaps in a clean card (fail closed).
      const res = enforceConsumerCard(dirty, () => minimalSafeCard('coffee', 'cotton'), {
        requestText: '',
        stain: 'coffee',
        surface: 'cotton',
      })
      expect(res.blocked).toBe(true)
      // 3. The rendered card contains NONE of the trade term — extract the distinctive token.
      const token = phrase.match(/BonGo|StreeTAN|Formula No\. 209|POG|VDS|Mulsolite|amyl acetate|sodium hydrosulfite|sodium dithionite|TanGo|StreePene|Fortex|Picrin|SolvonK4|Solvon|thiourea|Chemspec|tannin spotters?|protein spotters?|KOH|caustic potash|naphtha|petroleum ether|perchloroethylene|perc|dry-cleaning solvents?|spotting agents?|pro solvents?/i)?.[0] ?? label
      expect(JSON.stringify(res.card).toLowerCase()).not.toContain(token.toLowerCase())
    })
  }

  it('fails closed to a clean professional-referral card (no trade terms survive)', () => {
    const res = enforceConsumerCard(aiCardWith('apply BonGo'), () => minimalSafeCard('coffee', 'cotton'), {
      requestText: '',
      stain: 'coffee',
      surface: 'cotton',
    })
    const clean = validateConsumerCard(res.card, { requestText: '' })
    expect(clean.length).toBe(0) // the replacement card itself is clean
    expect(JSON.stringify(res.card).toLowerCase()).toMatch(/profession|pro\b|cleaner/)
  })

  it('does NOT block a clean consumer card (no false positives on plain guidance)', () => {
    const clean = aiCardWith('Use a small amount of mild dish soap in cool water.')
    expect(validateConsumerCard(clean, { requestText: '' }).some((v) => v.rule.startsWith('forbidden-term:'))).toBe(false)
  })
})
