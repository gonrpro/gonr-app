// TASK-122.2 — Question pool for Plant Brain Builder chat cockpit
// 30 sharp operator-language questions across the 8 profile modules.
// Concrete and operational, not abstract (per Atlas spec).
// Each question carries metadata that drives:
//   - the chat message renderer (type)
//   - the question selector (module, weight, dependencies)
//   - the predictive completion chips (suggestedCompletions for text questions)
//   - the "why I'm asking" explainer (optional)
//   - profile inference (which module fields fill on answer)
//   - solve card section unlock (which sections become eligible to render)
//
// Tyler should sanity-check operator language. Lab can swap any of these in place.

export type ModuleId =
  | 'spotting'
  | 'fiber-surface'
  | 'chemicals'
  | 'escalation'
  | 'equipment'
  | 'customer-comm'
  | 'qc'
  | 'exceptions'

export type QuestionType =
  | 'chips'
  | 'yesno'
  | 'ranked'
  | 'multiselect'
  | 'text'
  | 'scenario'

export type Question = {
  id: string
  module: ModuleId
  type: QuestionType
  weight: number // priority for selection (higher = ask earlier)
  ask: string
  whyAsking?: string
  options?: string[]
  suggestedCompletions?: string[]
  // Map answer to profile field updates
  fieldKey: string // dotted path, e.g., "chemicals.aniline_leather"
  // Whether answering this question unlocks a particular solve card scenario
  unlocksScenario?: string
}

export const QUESTIONS: Question[] = [
  // -------------------------------------------------------------------------
  // Spotting defaults — how the plant approaches stains generically
  // -------------------------------------------------------------------------
  {
    id: 'spotting-pretest-default',
    module: 'spotting',
    type: 'chips',
    weight: 95,
    ask: "When a stained garment comes in, when does your plant pre-test before treating?",
    whyAsking: "This sets your plant's safety baseline — knowing when you patch-test versus go straight in shapes every protocol downstream.",
    options: [
      'Always — every garment, every time',
      'Only colored or fragile fabrics',
      'Only if the customer flagged a concern',
      'Almost never — the spotter judges in the moment',
    ],
    fieldKey: 'spotting.pretest_default',
  },
  {
    id: 'spotting-blood-on-cotton',
    module: 'spotting',
    type: 'chips',
    weight: 88,
    ask: "Fresh blood on a cotton shirt walks in. What does your plant do first?",
    whyAsking: "Blood is your plant's most common protein test — your answer shapes the protein-stain protocol.",
    options: [
      'Cool-water flush from the back',
      'Enzyme presoak',
      'Hydrogen peroxide spotting',
      'Send straight to the spotter — no first-touch at counter',
    ],
    fieldKey: 'spotting.blood_cotton_first_step',
  },
  {
    id: 'spotting-coffee-on-silk',
    module: 'spotting',
    type: 'scenario',
    weight: 90,
    ask: "A customer brings in a silk blouse with a 3-day-old coffee stain. Walk me through what your plant does.",
    whyAsking: "Coffee on silk is the canonical 'tannin meets protein fiber' test — your answer is high-signal for how you handle delicate substrates.",
    suggestedCompletions: [
      "Pre-test acid side on inside seam, light tamping with cool water + mild acid, no peroxide.",
      "Refer to specialist — we don't take silk over 48 hours old.",
      "Owner-only spot test, then route based on result.",
    ],
    fieldKey: 'spotting.coffee_silk_protocol',
    unlocksScenario: 'red-wine-silk-3day',
  },

  // -------------------------------------------------------------------------
  // Fiber / surface handling — what plants accept, refuse, or restrict
  // -------------------------------------------------------------------------
  {
    id: 'fiber-aniline-leather',
    module: 'fiber-surface',
    type: 'chips',
    weight: 92,
    ask: "Aniline leather. What's your plant's stance?",
    whyAsking: "Aniline is the high-stakes leather call. Your stance shapes every leather scenario from here.",
    options: [
      "Pro-only from minute one — we don't touch it",
      "Take in but route to specialist",
      "Attempt with waiver",
      "We treat it like any other leather",
    ],
    fieldKey: 'fiber-surface.aniline_leather_stance',
  },
  {
    id: 'fiber-acetate',
    module: 'fiber-surface',
    type: 'yesno',
    weight: 78,
    ask: "Does your plant accept acetate?",
    whyAsking: "Acetate is solvent-sensitive (acetone destroys it). Knowing your acceptance rule prevents one of the most common ruined-garment scenarios.",
    fieldKey: 'fiber-surface.acetate_accepted',
  },
  {
    id: 'fiber-vintage-couture',
    module: 'fiber-surface',
    type: 'chips',
    weight: 75,
    ask: "Vintage couture with no labels — how does your plant handle it?",
    options: [
      'Owner-only intake; full waiver',
      'Treat as silk-or-worse until proven otherwise',
      'Refuse — too much risk',
      'Standard protocol with extra care',
    ],
    fieldKey: 'fiber-surface.vintage_unlabeled',
  },
  {
    id: 'fiber-wedding-gown',
    module: 'fiber-surface',
    type: 'chips',
    weight: 82,
    ask: "Wedding gown intake — first move?",
    options: [
      "Photo-document everything before treatment",
      "Owner-only, quote-first, full waiver",
      "Standard delicate protocol",
      "Refer to couture specialist",
    ],
    fieldKey: 'fiber-surface.wedding_gown_intake',
  },

  // -------------------------------------------------------------------------
  // Chemical boundaries — what's never used, always used
  // -------------------------------------------------------------------------
  {
    id: 'chem-bleach-policy',
    module: 'chemicals',
    type: 'multiselect',
    weight: 90,
    ask: "Which of these does your plant NEVER use?",
    whyAsking: "Lock-in your hard nos. These shape every staff guidance the brain produces.",
    options: [
      'Chlorine bleach',
      'Acetone',
      'Ammonia',
      'Hydrogen peroxide on silk',
      'Strong alkali on wool',
      'Oxalic acid',
    ],
    fieldKey: 'chemicals.never_use',
  },
  {
    id: 'chem-primary-solvent',
    module: 'chemicals',
    type: 'chips',
    weight: 85,
    ask: "Your plant's primary dry-cleaning solvent?",
    options: ['Perc', 'Hydrocarbon', 'GreenEarth (siloxane)', 'Solvon-K4', 'Wet-clean only', 'Other'],
    fieldKey: 'chemicals.primary_solvent',
  },
  {
    id: 'chem-spotting-products',
    module: 'chemicals',
    type: 'multiselect',
    weight: 70,
    ask: "Which spotting agents does your plant keep on the board?",
    options: [
      'POG (paint-oil-grease)',
      'NSD (neutral synthetic detergent)',
      'Tannin formula',
      'Protein formula',
      'Amyl acetate',
      'Acetic acid',
      'Rust remover',
      'Leveling agent',
    ],
    fieldKey: 'chemicals.spotting_arsenal',
  },

  // -------------------------------------------------------------------------
  // Escalation / refusal rules
  // -------------------------------------------------------------------------
  {
    id: 'escalation-spotter-tier',
    module: 'escalation',
    type: 'chips',
    weight: 88,
    ask: "Who in your plant can decide to refuse a job?",
    whyAsking: "This is your authority chain for the 'not worth the risk' call. The brain needs to mirror it.",
    options: ['Owner only', 'Owner or senior spotter', 'Any senior staff', 'Counter staff with manager OK'],
    fieldKey: 'escalation.refuse_authority',
  },
  {
    id: 'escalation-rush-policy',
    module: 'escalation',
    type: 'chips',
    weight: 80,
    ask: "Same-day rush on a delicate piece — your plant's default?",
    options: [
      'Refuse — too much risk under time pressure',
      'Accept with explicit waiver only',
      'Accept with rush surcharge',
      'Standard pricing, standard care',
    ],
    fieldKey: 'escalation.rush_delicate',
  },
  {
    id: 'escalation-senior-only-cases',
    module: 'escalation',
    type: 'multiselect',
    weight: 75,
    ask: "Which jobs ALWAYS go to your senior spotter (not junior staff)?",
    options: [
      'Wedding gowns',
      'Vintage couture',
      'Aniline leather',
      'Suede',
      'Multi-stain combinations',
      'Customer-attempted prior treatment',
      'Anything over $500 retail',
    ],
    fieldKey: 'escalation.senior_only_categories',
  },

  // -------------------------------------------------------------------------
  // Equipment / process steps
  // -------------------------------------------------------------------------
  {
    id: 'equipment-machines',
    module: 'equipment',
    type: 'multiselect',
    weight: 70,
    ask: "What machines does your plant run?",
    options: [
      'Sankosha finisher',
      'Forenta press',
      'Cissell tunnel',
      'Realstar wet-clean',
      'Union dryclean',
      'Hoffman pressing',
      'Other / multiple',
    ],
    fieldKey: 'equipment.machines',
  },
  {
    id: 'equipment-wetclean-fraction',
    module: 'equipment',
    type: 'ranked',
    weight: 65,
    ask: "What share of your volume goes to wet-clean vs dry-clean?",
    options: ['Mostly dry-clean', 'Roughly even split', 'Mostly wet-clean', 'Wet-clean only'],
    fieldKey: 'equipment.wet_dry_split',
  },
  {
    id: 'equipment-press-temp-policy',
    module: 'equipment',
    type: 'chips',
    weight: 60,
    ask: "Your press temperature policy on unknown synthetic blends?",
    options: ['Lowest setting + test', 'Standard with caution', 'Refer to senior before press', 'Refuse to press until fiber confirmed'],
    fieldKey: 'equipment.unknown_synthetic_press',
  },

  // -------------------------------------------------------------------------
  // Customer communication
  // -------------------------------------------------------------------------
  {
    id: 'comm-staff-language',
    module: 'customer-comm',
    type: 'multiselect',
    weight: 88,
    ask: "What languages does your team speak with customers?",
    whyAsking: "Bilingual or multilingual matters — Plant Brain delivers staff-facing guidance in their language.",
    options: ['English', 'Spanish', 'Haitian Creole', 'Portuguese', 'Vietnamese', 'Mandarin', 'Other'],
    fieldKey: 'customer-comm.languages',
  },
  {
    id: 'comm-disclosure-policy',
    module: 'customer-comm',
    type: 'chips',
    weight: 75,
    ask: "When you can't guarantee a stain comes out, what do you tell the customer at intake?",
    options: [
      "Explicit verbal warning + signed waiver",
      "Verbal warning only",
      "We try first and call if it fails",
      "We just attempt and explain after if needed",
    ],
    fieldKey: 'customer-comm.uncertain_outcome',
  },
  {
    id: 'comm-rush-script',
    module: 'customer-comm',
    type: 'text',
    weight: 55,
    ask: "What does your team say when a customer asks for same-day on a delicate piece you don't want to rush?",
    suggestedCompletions: [
      "We can't safely promise same-day on this fabric. Earliest is [day] with care.",
      "I'd rather get this right than fast — let me check with our spotter.",
      "Rush is possible but with a waiver — risk goes up.",
    ],
    fieldKey: 'customer-comm.rush_pushback_script',
  },

  // -------------------------------------------------------------------------
  // QC / rework
  // -------------------------------------------------------------------------
  {
    id: 'qc-recheck-trigger',
    module: 'qc',
    type: 'chips',
    weight: 70,
    ask: "When does a finished garment go back through your QC step?",
    options: [
      'Every garment, every time',
      'Spot check (~1 in 5)',
      'Owner-driven cases only',
      'Customer complaint only',
    ],
    fieldKey: 'qc.recheck_policy',
  },
  {
    id: 'qc-redo-threshold',
    module: 'qc',
    type: 'chips',
    weight: 65,
    ask: "What's your plant's redo threshold? (When do you choose to redo vs. release)",
    options: [
      "Any visible mark — redo",
      "If senior spotter would redo on their own garment",
      "Customer-facing test: would I show this to them?",
      "Cost-driven: redo only if cheap",
    ],
    fieldKey: 'qc.redo_threshold',
  },

  // -------------------------------------------------------------------------
  // Plant-specific exceptions
  // -------------------------------------------------------------------------
  {
    id: 'exceptions-signature-treatment',
    module: 'exceptions',
    type: 'text',
    weight: 50,
    ask: "What's one thing your plant does that you've never seen at any other shop?",
    whyAsking: "Your plant's edge cases are the highest-value rules — they're what makes your brain different from anyone else's.",
    suggestedCompletions: [
      "We always [step] before [step].",
      "We never use [chemical] on [fabric] — we learned the hard way.",
      "Our owner taught us a [technique] for [scenario].",
    ],
    fieldKey: 'exceptions.signature_practice',
  },
  {
    id: 'exceptions-customer-stories',
    module: 'exceptions',
    type: 'text',
    weight: 45,
    ask: "Any kind of garment or scenario your team always handles differently because of past customer history?",
    suggestedCompletions: [
      "We pre-test more aggressively after [past incident].",
      "We always quote first when [scenario] because [reason].",
      "We refuse [scenario] outright — we tried once and it cost us.",
    ],
    fieldKey: 'exceptions.history_driven_rules',
  },
  {
    id: 'exceptions-walk-in-no',
    module: 'exceptions',
    type: 'multiselect',
    weight: 60,
    ask: "What kinds of jobs do you refuse at intake without even attempting?",
    options: [
      'Self-treated stains (customer tried something first)',
      'Old leather without history',
      'Fur',
      'Beaded couture',
      'Latex/rubber-backed garments',
      'Heat-set athletic wear with custom graphics',
      'Mystery upholstery / non-garment',
    ],
    fieldKey: 'exceptions.walk_in_refusals',
  },
  {
    id: 'exceptions-pricing-tier',
    module: 'exceptions',
    type: 'chips',
    weight: 50,
    ask: "How does your plant price specialty work (couture, vintage, leather)?",
    options: [
      'Quote-first, every time',
      'Tiered surcharge above standard',
      'Standard pricing, no special tier',
      'Owner sets case-by-case',
    ],
    fieldKey: 'exceptions.specialty_pricing',
  },
]

// Module metadata for the BrainPanel coverage display
export const MODULES: { id: ModuleId; label: string; description: string }[] = [
  { id: 'spotting', label: 'Spotting defaults', description: 'How your plant approaches stains generically' },
  { id: 'fiber-surface', label: 'Fiber & surface', description: 'What you accept, refuse, or restrict by material' },
  { id: 'chemicals', label: 'Chemical boundaries', description: 'What your plant uses and never uses' },
  { id: 'escalation', label: 'Escalation & refusal', description: 'Who decides what at your plant' },
  { id: 'equipment', label: 'Equipment & process', description: 'Machines and how you run them' },
  { id: 'customer-comm', label: 'Customer comm', description: 'Languages and how you talk to customers' },
  { id: 'qc', label: 'QC & rework', description: 'Your quality bar and redo policy' },
  { id: 'exceptions', label: 'Plant exceptions', description: 'What makes your plant different' },
]

// Phase transition thresholds (per Atlas spec)
export const PHASE_THRESHOLDS = {
  // After ≥4 of 8 modules pass 60% coverage, AI starts mixing in verify-style messages
  formingMinModules: 4,
  formingMinCoverage: 60,
  // After ≥6 of 8 modules pass 75% coverage, AI shifts primary mode to verifying
  verifyingMinModules: 6,
  verifyingMinCoverage: 75,
}
