// lib/ui/quickReferenceContent.ts
//
// Chemistry-family quick-reference content — the short, first-principles
// brief that pops up when a user taps a colored chemistry badge.
//
// Copy locked by Nova 2026-04-24 (AtlasOps 8061). TASK-061 voice:
// confident + calm + first-principles, realistic outcome framing, no hype.
// Every entry has three concentric layers:
//   explainer — what the family is, mental-model first
//   caution   — the one mistake that permanently sets the stain
//   examples  — 3 lines: common stains · home recipe · pro recipe
//
// `unknown` is intentionally omitted — per Atlas 8053, unknown badges stay
// non-clickable for now until we have useful content for them.

import type { FamilyKey } from '@/lib/ui/chemistryFamily'

export interface FamilyQuickContent {
  explainer: string
  caution: string
  examples: string[]
}

type FamilyContentMap = Partial<Record<FamilyKey, FamilyQuickContent>>

export const quickReferenceContent: FamilyContentMap = {
  tannin: {
    explainer: 'Tannins are plant-based pigments that bind tightly to fibers. They respond best to acidic treatment before any heat or alkaline cleaners are used.',
    caution: 'Alkaline cleaners or heat will set them permanently — always use cold water first.',
    examples: [
      'Coffee, tea, wine, berries, fruit juice',
      'Home: white vinegar + Dawn dish soap',
      'Pro: PRENETT A (blue) or citric acid solution',
    ],
  },
  protein: {
    explainer: 'Proteins are complex molecules that harden when heated. Cold water and enzymatic action break them down before they can bind to the fiber.',
    caution: 'Hot water or alcohol will cook the protein and make the stain permanent.',
    examples: [
      'Blood, milk, egg, sweat, baby formula',
      'Home: cold water + enzyme detergent',
      'Pro: PRENETT B (red) or protease-based spotter',
    ],
  },
  oil: {
    explainer: 'Oils are lipids that spread easily and oxidize over time. They require emulsification with detergent or solvent before water is introduced.',
    caution: 'Water first will drive the oil deeper into the fiber — always start dry or with absorbent powder.',
    examples: [
      'Cooking oil, makeup, grease, sebum',
      'Home: cornstarch + Dawn dry-work',
      'Pro: PRENETT C (green) or POG',
    ],
  },
  dye: {
    explainer: 'Dyes are designed to bond with fibers. Once set, they require reduction or careful bleaching to lift without damaging the material.',
    caution: 'Heat and some oxidizers will set synthetic dyes permanently — test first on hidden areas.',
    examples: [
      'Ink, hair dye, food coloring, dye bleed',
      'Home: isopropyl alcohol + absorbent pad',
      'Pro: reducing agent or targeted dye remover',
    ],
  },
  rust: {
    explainer: 'Rust is oxidized iron that stains through chemical reaction. It responds to mild acids that convert it into a soluble form.',
    caution: 'Never use chlorine bleach on rust — it creates a permanent dark brown compound.',
    examples: [
      'Rust from metal, old blood, well water',
      'Home: lemon juice or white vinegar',
      'Pro: rust remover (oxalic acid based)',
    ],
  },
  combination: {
    explainer: 'Most real-world stains are combinations. Attack in the correct order — fats first, then proteins, then pigments — or you can set earlier layers.',
    caution: 'Wrong order is the most common reason home attempts fail.',
    examples: [
      'BBQ sauce, chocolate, curry, gravy',
      'Home: Dawn first, then enzyme, then peroxide',
      'Pro: full spotting sequence (POG → NSD → tannin remover)',
    ],
  },
}

/** Returns quick-reference content for a family, or null if none. */
export function getQuickReference(family: FamilyKey): FamilyQuickContent | null {
  return quickReferenceContent[family] ?? null
}
