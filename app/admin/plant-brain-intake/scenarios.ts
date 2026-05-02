// Seed scenarios for Plant Brain Intake v0
// 10 plausible scenarios drawn from Stain Brain card library — picked because they're
// cases plants commonly handle differently. Tyler can edit any of these in the UI before
// answering, or add custom scenarios.

export type AxisValue = string

export type StockAxes = {
  preTreatment: 'none' | 'pre-test inconspicuous' | 'pre-test required' | 'sign waiver first'
  solventRouting: 'perc' | 'hydrocarbon' | 'wet clean' | 'specialist outsource' | 'refuse'
  riskLevel: 'standard' | 'flag for owner' | 'sign waiver' | 'no go'
  timeCharge: 'standard' | 'rush surcharge' | 'specialty surcharge' | 'quote first'
  teamEscalation: 'any spotter' | 'senior only' | 'owner only'
}

export type SeedScenario = {
  id: string
  description: string        // customer-facing situation
  garment: string             // e.g. "silk blouse"
  stain: string               // e.g. "red wine, 3 days old"
  stockDefault: string        // prose default protocol from stock GONR
  stockAxes: StockAxes        // 5-axis interpretation of the stock default
}

export const SEED_SCENARIOS: SeedScenario[] = [
  {
    id: 'red-wine-silk-3day',
    description: 'Customer brings in a silk blouse with a red wine stain. They say it has been sitting for 3 days.',
    garment: 'silk blouse',
    stain: 'red wine, 3 days old (tannin)',
    stockDefault:
      'Tannin protocol on protein fiber: acid-side spotting only. Pre-test on inside seam first (silk is alkali-sensitive). Cool water flush from back, then mild acid (white vinegar dilution) with light tamping. NO peroxide on silk (yellowing risk). NO heat until tannin is fully neutralized. If discoloration remains after one pass, escalate to specialist — silk records every wet area as a permanent ring if mishandled.',
    stockAxes: {
      preTreatment: 'pre-test required',
      solventRouting: 'wet clean',
      riskLevel: 'flag for owner',
      timeCharge: 'specialty surcharge',
      teamEscalation: 'senior only',
    },
  },
  {
    id: 'coffee-cream-cotton-fresh',
    description: 'White cotton shirt comes in with fresh coffee + cream stain (combination tannin + protein). Customer just spilled it that morning.',
    garment: 'white cotton dress shirt',
    stain: 'coffee with cream, fresh (tannin + protein combination)',
    stockDefault:
      'Combination stain: protein side first (cool water + alkali like ammonia or enzyme), THEN tannin side (acid-side after thorough rinse). Order matters — heat sets protein, alkali sets tannin. Rinse fully between sides so chemistries do not interact on the fiber. Cotton tolerates standard wet protocol; risk is mainly sequencing.',
    stockAxes: {
      preTreatment: 'none',
      solventRouting: 'wet clean',
      riskLevel: 'standard',
      timeCharge: 'standard',
      teamEscalation: 'any spotter',
    },
  },
  {
    id: 'grease-aniline-leather',
    description: 'Leather jacket with a fresh grease stain. Inside label says aniline finish.',
    garment: 'aniline leather jacket',
    stain: 'fresh grease, identified aniline leather',
    stockDefault:
      'Aniline leather has no protective topcoat — dye sits in the fiber. Solvents will pull color permanently. Dish soap or detergent will strip surface oils and the dye with them. Pro-only routing. Cornstarch preload to lift loose oil, do NOT attempt wet treatment in-shop. If customer insists on attempting in-shop, refuse and recommend specialist leather restorer. Do NOT use any solvent or surfactant.',
    stockAxes: {
      preTreatment: 'sign waiver first',
      solventRouting: 'specialist outsource',
      riskLevel: 'no go',
      timeCharge: 'quote first',
      teamEscalation: 'owner only',
    },
  },
  {
    id: 'blood-wool-dried',
    description: 'Wool sweater with a dried blood stain. Customer says it has been there for at least a week.',
    garment: 'wool sweater (worsted)',
    stain: 'dried blood, ~1 week old (protein)',
    stockDefault:
      'Protein on protein fiber. Cool water only — heat sets blood permanently and damages wool. Enzyme presoak can help but use caution: enzymes can break down wool keratin under prolonged exposure or wrong pH. Test first. NO chlorine bleach (dissolves wool). NO alkaline detergent (weakens fiber). Acid-side neutralize after enzyme. Press only after fully dry to avoid water rings.',
    stockAxes: {
      preTreatment: 'pre-test required',
      solventRouting: 'wet clean',
      riskLevel: 'flag for owner',
      timeCharge: 'specialty surcharge',
      teamEscalation: 'senior only',
    },
  },
  {
    id: 'ink-ballpoint-polyester',
    description: 'Polyester blouse with a ballpoint pen ink mark on the front. Customer noticed it that morning.',
    garment: 'polyester blouse',
    stain: 'ballpoint pen ink, fresh',
    stockDefault:
      'Ink solvent (amyl acetate or ink-specific) on cotton terry from back of garment. Polyester is solvent-tolerant but has heat-sensitive trims and can melt under iron — keep heat low. Tamp from back, blot to clean towel. Multiple light passes beat one heavy pass. Avoid acetone (dissolves polyester at higher concentrations).',
    stockAxes: {
      preTreatment: 'pre-test inconspicuous',
      solventRouting: 'wet clean',
      riskLevel: 'standard',
      timeCharge: 'standard',
      teamEscalation: 'any spotter',
    },
  },
  {
    id: 'foundation-silk-dress',
    description: 'Silk evening dress with cosmetic foundation makeup smear at the neckline. Customer wore it last weekend.',
    garment: 'silk evening dress',
    stain: 'cosmetic foundation (oil + pigment), ~1 week old',
    stockDefault:
      'Oil-based pigmented stain on protein fiber. POG (paint-oil-grease) treatment on cotton terry, light tamping only. Silk records pressure marks and water rings — feather edges, do not center-sponge. Pre-test acid pH first. NO peroxide. Multiple short dwells beat one long one. If pigment remains after solvent pass, escalate — pigment is mechanical, not chemical removal.',
    stockAxes: {
      preTreatment: 'pre-test required',
      solventRouting: 'specialist outsource',
      riskLevel: 'flag for owner',
      timeCharge: 'specialty surcharge',
      teamEscalation: 'senior only',
    },
  },
  {
    id: 'mildew-linen-musty',
    description: 'Linen shirt comes in with a strong musty smell and visible spotting. Customer says it sat in a hamper for two weeks.',
    garment: 'linen shirt',
    stain: 'mildew + odor (microbial), 2 weeks growth',
    stockDefault:
      'Mildew is microbial — surface treatment alone will not address spores in the fiber. Hot wash + disinfectant additive (oxygen bleach safe on linen). Sun-dry if possible to UV-sterilize. Linen tolerates aggressive wet protocol. Odor often persists after one cycle — repeat or escalate. NO chlorine bleach if dye is unstable. Document customer expectation that musty odor may not fully clear.',
    stockAxes: {
      preTreatment: 'pre-test inconspicuous',
      solventRouting: 'wet clean',
      riskLevel: 'flag for owner',
      timeCharge: 'specialty surcharge',
      teamEscalation: 'any spotter',
    },
  },
  {
    id: 'wax-wool-slacks',
    description: 'Dark wool slacks with hardened candle wax on one knee from a dinner.',
    garment: 'dark wool slacks',
    stain: 'candle wax (hardened), ~1 day old',
    stockDefault:
      'Mechanical removal first: freeze the wax (cold spray or ice through cloth), crack with blunt edge, lift with plastic card. Brown paper + warm iron (low) to absorb residual wax — change paper between passes. Solvent (POG) for color residue from candle dye. Wool tolerates dry-side solvent at low heat. Watch for steam-set creases when pressing.',
    stockAxes: {
      preTreatment: 'none',
      solventRouting: 'perc',
      riskLevel: 'standard',
      timeCharge: 'standard',
      teamEscalation: 'any spotter',
    },
  },
  {
    id: 'yellowing-silk-stored',
    description: 'White silk blouse with overall yellowing — customer pulled from long-term storage and wants it whitened for a wedding.',
    garment: 'white silk blouse, vintage / long-stored',
    stain: 'overall yellowing (oxidation, prolonged storage)',
    stockDefault:
      'Oxidative yellowing on silk — tricky. Hydrogen peroxide is the standard whitener but can yellow silk further if pH or temperature is wrong. Sodium perborate-based oxygen bleach at low concentration, controlled pH, room temp. Always pre-test on hidden seam — fugitive dyes or finishes may bleed. Set realistic expectations — long-stored silk yellowing rarely returns to true white. Quote first, do not promise.',
    stockAxes: {
      preTreatment: 'pre-test required',
      solventRouting: 'wet clean',
      riskLevel: 'flag for owner',
      timeCharge: 'quote first',
      teamEscalation: 'owner only',
    },
  },
  {
    id: 'wedding-gown-combination',
    description: 'Wedding gown bodice has a combination stain — looks like champagne (tannin + sugars) plus what may be foundation makeup. Customer needs it preserved for boxing.',
    garment: 'wedding gown bodice (silk + beading + lace)',
    stain: 'champagne + cosmetic foundation, mixed (tannin + protein + oil + pigment)',
    stockDefault:
      'Multi-fiber, multi-stain, high-value, irreversible-if-wrong garment. Owner-only handling. Map the stain layers first (which is on top?), pre-test EVERY agent on inside hem, treat in order: protein (cool, alkali, careful) → tannin (acid-side, separate rinse) → oil/pigment (POG, mechanical). Beading and lace are heat-sensitive and may require disassembly for press. Document everything photographically before treatment. If any layer fails to lift cleanly, stop and quote a couture textile restorer. Do NOT promise full removal.',
    stockAxes: {
      preTreatment: 'pre-test required',
      solventRouting: 'specialist outsource',
      riskLevel: 'no go',
      timeCharge: 'quote first',
      teamEscalation: 'owner only',
    },
  },
]

export const AXIS_OPTIONS = {
  preTreatment: ['none', 'pre-test inconspicuous', 'pre-test required', 'sign waiver first'] as const,
  solventRouting: ['perc', 'hydrocarbon', 'wet clean', 'specialist outsource', 'refuse'] as const,
  riskLevel: ['standard', 'flag for owner', 'sign waiver', 'no go'] as const,
  timeCharge: ['standard', 'rush surcharge', 'specialty surcharge', 'quote first'] as const,
  teamEscalation: ['any spotter', 'senior only', 'owner only'] as const,
}

export const AXIS_LABELS = {
  preTreatment: 'Pre-treatment',
  solventRouting: 'Solvent routing',
  riskLevel: 'Risk level',
  timeCharge: 'Time & charge',
  teamEscalation: 'Team escalation',
}
