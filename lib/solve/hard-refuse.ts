export type HardRefuseCard = {
  title: string
  surface: string
  stainFamily: string
  spottingProtocol: { step: number; instruction: string; side?: string; safetyNote?: string }[]
  materialWarnings: string[]
  escalation: string
  _hardRefuse: true
  meta: {
    stainCanonical: string
    surfaceCanonical: string
    tier: 'hard-refuse'
    riskLevel: 'critical'
  }
}

type HardRefuseRule = {
  id: string
  match: (stain: string, surface: string) => boolean
  build: (stain: string, surface: string) => HardRefuseCard
}

const RULES: HardRefuseRule[] = [
  {
    id: 'HR-1: solvent x acetate',
    match: (stain, surface) => {
      const s = stain.toLowerCase()
      const f = surface.toLowerCase()
      const isSolventClass = /\b(nail\s*polish|nail\s*lacquer|nail\s*varnish|gel\s*polish|acetone|nail\s*polish\s*remover|polish\s*remover|amyl\s*acetate)\b/.test(s)
      const isAcetateClass = /\b(acetate|tri[-\s]?acetate|cellulose\s*acetate)\b/.test(f)
      return isSolventClass && isAcetateClass
    },
    build: (stain, surface) => ({
      title: `${stain} on ${surface} - Do Not Attempt at Home`,
      surface,
      stainFamily: 'specialty-solvent',
      spottingProtocol: [
        {
          step: 1,
          side: 'dry',
          instruction: 'DO NOT use acetone, nail polish remover, amyl acetate, or any solvent. They dissolve acetate fiber completely.',
          safetyNote: 'Acetate dissolves on contact with acetone. There is no safe home solvent for this combination.',
        },
        {
          step: 2,
          side: 'dry',
          instruction: 'Blot gently with a clean dry white cloth to lift any wet polish on the surface. Do not rub. Do not press.',
        },
        {
          step: 3,
          side: 'dry',
          instruction: 'Isolate the garment in a clean bag or wrap it loosely in a white cotton sheet to prevent transfer. Do not soak. Do not pre-treat.',
        },
        {
          step: 4,
          side: 'dry',
          instruction: 'Take it to a professional dry cleaner immediately. Tell them it is nail polish on acetate so they avoid acetone-based solvents.',
        },
      ],
      materialWarnings: [
        'Acetate fiber dissolves on contact with acetone, nail polish remover, and amyl acetate. There is no safe home solvent for this combination.',
        'Do not attempt to soak, scrub, iron, or apply any household product. Each of these makes professional restoration harder.',
        'If unsure whether the fabric is acetate vs. polyester, check the care label. Acetate is often dry-clean-only with no wash symbol.',
      ],
      escalation: 'Take to a professional cleaner immediately. Tell them: "nail polish on acetate - do not use acetone."',
      _hardRefuse: true,
      meta: {
        stainCanonical: stain.toLowerCase().replace(/\s+/g, '-'),
        surfaceCanonical: surface.toLowerCase().replace(/\s+/g, '-'),
        tier: 'hard-refuse',
        riskLevel: 'critical',
      },
    }),
  },
]

export function checkHardRefuseCombo(stainRaw: string, surfaceRaw: string): HardRefuseCard | null {
  if (!stainRaw || !surfaceRaw) return null
  for (const rule of RULES) {
    if (rule.match(stainRaw, surfaceRaw)) {
      return rule.build(stainRaw, surfaceRaw)
    }
  }
  return null
}

export function listHardRefuseRules(): string[] {
  return RULES.map(r => r.id)
}
