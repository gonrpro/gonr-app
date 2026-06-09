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
  build: (stain: string, surface: string, lang?: string) => HardRefuseCard
}

function isSpanish(lang?: string): boolean {
  return lang?.toLowerCase().startsWith('es') ?? false
}

const RULES: HardRefuseRule[] = [
  {
    id: 'HR-1: solvent x acetate',
    match: (stain, surface) => {
      const s = stain.toLowerCase()
      const f = surface.toLowerCase()
      const isSolventClass = /\b(nail\s*polish|nail\s*lacquer|nail\s*varnish|gel\s*polish|acetone|nail\s*polish\s*remover|polish\s*remover|amyl\s*acetate|esmalte\s+de\s+u[ñn]as|laca\s+de\s+u[ñn]as|quitaesmalte|removedor\s+de\s+esmalte|acetona)\b/.test(s)
      const isAcetateClass = /\b(acetate|tri[-\s]?acetate|cellulose\s*acetate|acetato|triacetato)\b/.test(f)
      return isSolventClass && isAcetateClass
    },
    build: (stain, surface, lang) => {
      const spanish = isSpanish(lang)
      return {
        title: spanish
          ? `${stain} en ${surface} - No trate esto en casa`
          : `${stain} on ${surface} - Do Not Attempt at Home`,
        surface,
        stainFamily: 'specialty-solvent',
        spottingProtocol: spanish
          ? [
              {
                step: 1,
                side: 'dry',
                instruction: 'NO use acetona, quitaesmalte, acetato de amilo ni ningún solvente. Disuelven la fibra de acetato.',
                safetyNote: 'El acetato se disuelve al contacto con acetona. No hay un solvente casero seguro para esta combinación.',
              },
              {
                step: 2,
                side: 'dry',
                instruction: 'Seque suavemente con un paño blanco limpio y seco para levantar esmalte húmedo en la superficie. No frote. No presione.',
              },
              {
                step: 3,
                side: 'dry',
                instruction: 'Aísle la prenda en una bolsa limpia o envuélvala floja en una sábana blanca de algodón para evitar transferencia. No remoje. No pretrate.',
              },
              {
                step: 4,
                side: 'dry',
                instruction: 'Llévela de inmediato a una tintorería profesional. Dígales que es esmalte de uñas en acetato para que eviten solventes con acetona.',
              },
            ]
          : [
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
        materialWarnings: spanish
          ? [
              'La fibra de acetato se disuelve al contacto con acetona, quitaesmalte y acetato de amilo. No hay un solvente casero seguro para esta combinación.',
              'No remoje, frote, planche ni aplique productos domésticos. Cada uno de esos pasos dificulta la restauración profesional.',
              'Si no sabe si la tela es acetato o poliéster, revise la etiqueta de cuidado. El acetato suele ser solo limpieza en seco y sin símbolo de lavado.',
            ]
          : [
              'Acetate fiber dissolves on contact with acetone, nail polish remover, and amyl acetate. There is no safe home solvent for this combination.',
              'Do not attempt to soak, scrub, iron, or apply any household product. Each of these makes professional restoration harder.',
              'If unsure whether the fabric is acetate vs. polyester, check the care label. Acetate is often dry-clean-only with no wash symbol.',
            ],
        escalation: spanish
          ? 'Llévela de inmediato a una tintorería profesional. Dígales: "esmalte de uñas en acetato - no use acetona".'
          : 'Take to a professional cleaner immediately. Tell them: "nail polish on acetate - do not use acetone."',
        _hardRefuse: true,
        meta: {
          stainCanonical: stain.toLowerCase().replace(/\s+/g, '-'),
          surfaceCanonical: surface.toLowerCase().replace(/\s+/g, '-'),
          tier: 'hard-refuse',
          riskLevel: 'critical',
        },
      }
    },
  },
]

export function checkHardRefuseCombo(stainRaw: string, surfaceRaw: string, lang?: string): HardRefuseCard | null {
  if (!stainRaw || !surfaceRaw) return null
  for (const rule of RULES) {
    if (rule.match(stainRaw, surfaceRaw)) {
      return rule.build(stainRaw, surfaceRaw, lang)
    }
  }
  return null
}

export function listHardRefuseRules(): string[] {
  return RULES.map(r => r.id)
}
