'use client'

import { useState } from 'react'

const CHEMICALS = [
  {
    id: 'protein',
    name: 'Protein',
    aka: 'Enzyme Digester, Protease Spotter',
    color: '#3b82f6',
    what: 'Enzyme-based spotter containing proteases that break peptide bonds in protein-based stains.',
    targets: ['Blood', 'Urine', 'Sweat', 'Egg', 'Milk', 'Vomit', 'Grass'],
    family: 'Protein',
    mechanism: 'Proteases hydrolyze the peptide bonds in protein chains, breaking large protein molecules into small fragments that flush out easily.',
    safe: ['Cotton', 'Polyester', 'Linen', 'Nylon', 'Denim'],
    unsafe: ['Silk', 'Wool', 'Cashmere', 'Angora'],
    unsafeReason: 'Silk and wool ARE protein fibers — protease will digest the fiber itself, weakening and eventually dissolving it.',
    dilution: 'Use per manufacturer directions. Typically apply full strength or diluted 1:1 with warm water.',
    temperature: 'Warm (40-45°C) — heat activates enzyme. NEVER hot.',
    dwellTime: '5-15 minutes. Dried stains may need 20-30 min.',
    neverUse: ['Silk', 'Wool', 'Cashmere'],
    neverWith: ['Chlorine bleach (denatures enzyme)', 'Very hot water (kills enzyme activity)'],
    proTip: 'Fresh protein stains respond in minutes. Dried/set protein stains need rehydration with cold water first, then enzyme. Heat-set protein (through a dryer) is permanent — no enzyme will fix it.',
  },
  {
    id: 'tannin',
    name: 'Tannin',
    aka: 'Tannin Spotter, Acetic Acid Spotter',
    color: '#8b5cf6',
    what: 'Acidic spotter formulated to break hydrogen bonds in tannin-based pigments.',
    targets: ['Red Wine', 'Coffee', 'Tea', 'Beer', 'Fruit Juice', 'Tomato'],
    family: 'Tannin',
    mechanism: 'Tannin pigments bond to fibers through hydrogen bonding. Tannin spotter disrupts these bonds, releasing the pigment for flushing.',
    safe: ['Cotton', 'Polyester', 'Linen', 'Nylon', 'Silk (cautiously)', 'Wool (cautiously)'],
    unsafe: [],
    unsafeReason: '',
    dilution: 'Apply full strength to stain. Can dilute 1:1 with cool water on delicate fibers.',
    temperature: 'Cool water — warm water can set tannin permanently.',
    dwellTime: '3-8 minutes. Check for color lift.',
    neverUse: [],
    neverWith: ['Alkaline agents (ammonia, baking soda) — permanently darkens tannin', 'Hot water — sets pigment permanently'],
    proTip: 'TANNIN FIRST on combo stains (coffee with cream, chocolate). If you use Protein first, it can lock in the tannin pigment. Always Tannin → Protein → POG for combo stains.',
  },
  {
    id: 'nsd',
    name: 'NSD',
    aka: 'Neutral Synthetic Detergent',
    color: '#22c55e',
    what: 'pH-neutral synthetic detergent used to flush and emulsify after other spotting agents.',
    targets: ['General soil', 'Flush/rinse step for all stain types'],
    family: 'Universal',
    mechanism: 'Surfactants lower surface tension, emulsifying loosened stain particles and spotting agent residue so they flush out of the fiber.',
    safe: ['All fibers'],
    unsafe: [],
    unsafeReason: '',
    dilution: 'Typically 1 tsp per cup of water, or as directed. Use cool to lukewarm water.',
    temperature: 'Cool to lukewarm. Match to fiber sensitivity.',
    dwellTime: '1-3 minutes. Flush thoroughly.',
    neverUse: [],
    neverWith: ['Nothing — NSD is the universal safe flush agent'],
    proTip: 'Always flush with NSD after every spotting treatment. Residual chemistry left in fabric causes secondary damage — yellowing, fiber breakdown, or continued bleaching.',
  },
  {
    id: 'pog',
    name: 'POG',
    aka: 'Paint Oil Grease Remover, Dry Solvent',
    color: '#f59e0b',
    what: 'Dry-side solvent spotter that dissolves oil, grease, and resin-based stains.',
    targets: ['Cooking Oil', 'Motor Oil', 'Butter', 'Lipstick', 'Cosmetics', 'Wax', 'Adhesive residue'],
    family: 'Oil & Grease',
    mechanism: 'Organic solvents dissolve the lipid bonds in oil and grease, breaking the stain away from the fiber without water.',
    safe: ['All fibers'],
    unsafe: [],
    unsafeReason: '',
    dilution: 'Apply full strength. Do not dilute with water — water causes rings on solvent-applied areas.',
    temperature: 'Room temperature only.',
    dwellTime: '2-5 minutes. Blot — do not rub.',
    neverUse: [],
    neverWith: ['Water (use dry side first, water side after)', 'Open flame (solvent is flammable)'],
    proTip: 'Always start on the DRY SIDE for oil stains. Water activates and spreads oil. POG first, blot, then NSD to emulsify, then water flush.',
  },
  {
    id: 'h2o2',
    name: 'H₂O₂',
    aka: 'Hydrogen Peroxide, Oxidizer',
    color: '#06b6d4',
    what: 'Oxidizing bleach that breaks chromophores (color-producing molecular structures) in organic stains.',
    targets: ['Residual tannin color', 'Mustard', 'Curry', 'Rust (in combo)', 'Yellowing'],
    family: 'Oxidizable',
    mechanism: 'H₂O₂ releases active oxygen that attacks the chromophore chains in organic pigments, oxidizing them to colorless compounds.',
    safe: ['White cotton', 'White linen', 'White polyester', 'Colorfast fabrics (test first)'],
    unsafe: ['Silk (high concentration)', 'Wool (bleaches and weakens fiber)', 'Dark or bright dyed fabrics'],
    unsafeReason: 'Hydrogen peroxide oxidizes fiber and dye indiscriminately — can bleach and weaken delicate fibers and will strip color from dyed fabrics.',
    dilution: '3% = mild (drugstore). 6% = standard spotting strength. 30% = professional (handle with caution).',
    temperature: 'Room temperature. Heat accelerates action but also increases fiber damage risk.',
    dwellTime: '3-10 minutes. Watch for color change — remove when target color is gone.',
    neverUse: ['Silk', 'Wool', 'Any dyed fabric without colorfastness test'],
    neverWith: ['Reducing agents', 'Ammonia (can cause dangerous reaction)'],
    proTip: 'Test colorfastness on a hidden seam EVERY TIME before applying H₂O₂ to colored fabric. Once bleached, color cannot be restored. For silk: 3% maximum, short dwell, immediate flush.',
  },
  {
    id: 'acetic-acid',
    name: 'Acetic Acid',
    aka: '28% Acetic Acid, Neutralizing Rinse',
    color: '#ef4444',
    what: 'Dilute acid used as a neutralizing rinse after alkaline spotting agents and to restore fiber pH.',
    targets: ['Neutralizer for alkaline treatments', 'Mild action on some tannin stains'],
    family: 'Universal (neutralizer)',
    mechanism: 'Acetic acid neutralizes residual alkaline chemistry in the fiber, restoring pH balance and preventing fiber degradation from alkaline buildup.',
    safe: ['All fibers when properly diluted'],
    unsafe: [],
    unsafeReason: '',
    dilution: '28% stock diluted 1:10 with water for standard use. Never apply undiluted to fabric.',
    temperature: 'Cool to room temperature.',
    dwellTime: '1-2 minutes. Flush thoroughly with water.',
    neverUse: [],
    neverWith: ['Alkaline bleaches simultaneously', 'Undiluted application to fabric'],
    proTip: 'Always finish protein and tannin treatments with a dilute acetic acid rinse to restore fabric pH. Alkaline residue left in fabric can cause fiber degradation over time, especially on silk and wool.',
  },
  {
    id: 'ipa',
    name: 'IPA',
    aka: 'Isopropyl Alcohol, Rubbing Alcohol',
    color: '#6366f1',
    what: 'Alcohol solvent used for ink, dye, and resin stains.',
    targets: ['Ballpoint Ink', 'Permanent Marker', 'Certain Dyes', 'Adhesive residue'],
    family: 'Dye',
    mechanism: 'Alcohol dissolves the resin binders in ink and some dyes, releasing the pigment from the fiber for blotting.',
    safe: ['Most fibers — test first on delicates'],
    unsafe: ['Acetate', 'Triacetate'],
    unsafeReason: 'Alcohol dissolves acetate and triacetate fibers on contact.',
    dilution: '70-91% isopropyl. Apply sparingly.',
    temperature: 'Room temperature.',
    dwellTime: '1-3 minutes. Blot immediately — do not let dry on fabric.',
    neverUse: ['Acetate', 'Triacetate'],
    neverWith: ['Nothing specific — but always neutralize and flush after'],
    proTip: 'For ballpoint ink: apply IPA to a cotton blot placed under the stain, then use another blot on top to lift the ink upward. Avoid spreading. Work from edges to center.',
  },
  {
    id: 'rust-remover',
    name: 'Rust Remover',
    aka: 'Oxalic Acid, Iron Remover',
    color: '#dc2626',
    what: 'Chelating acid that removes iron oxide (rust) and some tannin stains through chemical complexation.',
    targets: ['Rust', 'Iron stains', 'Some mineral stains'],
    family: 'Oxidizable (rust/mineral)',
    mechanism: 'Oxalic acid forms a soluble complex with iron ions, pulling rust out of the fiber structure. Very specific to iron compounds.',
    safe: ['Cotton', 'Linen', 'Polyester'],
    unsafe: ['Silk', 'Wool', 'Nylon (prolonged exposure)'],
    unsafeReason: 'Oxalic acid is aggressive — damages protein fibers and weakens nylon with prolonged contact.',
    dilution: 'Per product directions. Typically use warm solution.',
    temperature: 'Warm — heat improves chelation speed.',
    dwellTime: '3-10 minutes. Flush immediately once rust is removed.',
    neverUse: ['Silk', 'Wool'],
    neverWith: ['Oxidizers (can cause reaction)', 'Alkalis'],
    proTip: 'Rust stains from metal zippers, buttons, or outdoor furniture require Rust Remover — no other chemistry works. Always flush extremely thoroughly — residual oxalic acid can weaken fiber over time.',
  },
  {
    id: 'reducing-agent',
    name: 'Reducing Agent',
    aka: 'Sodium Hydrosulfite, Color Remover',
    color: '#f97316',
    what: 'Reducing bleach that removes color by the opposite mechanism from oxidizing bleach.',
    targets: ['Reactive dyes', 'Vat dyes', 'Color runs', 'Some oxidized stains that H₂O₂ cannot remove'],
    family: 'Dye',
    mechanism: 'Donates electrons to chromophores (color structures), reducing them to colorless forms. Works on different dye classes than oxidizing bleach.',
    safe: ['Cotton', 'Linen — with caution'],
    unsafe: ['Silk', 'Wool', 'Any fiber with oxidized finish'],
    unsafeReason: 'Reducing agents can strip dye from delicate fibers and disrupt oxidized fiber finishes.',
    dilution: 'Per product directions. Handle in ventilated area.',
    temperature: 'Warm to hot for best results.',
    dwellTime: '5-15 minutes. Monitor closely.',
    neverUse: ['Silk', 'Wool'],
    neverWith: ['Oxidizing bleach (H₂O₂, chlorine) — dangerous reaction'],
    proTip: 'When H₂O₂ fails on a stubborn color stain, try reducing agent — they work on different chromophore bonds. Never use both simultaneously. Professional-level chemistry — use with caution.',
  },
  {
    id: 'leveling-agent',
    name: 'Leveling Agent',
    aka: 'Dye Leveler, Migrator',
    color: '#84cc16',
    what: 'Surfactant that equalizes dye concentration in fiber, used after dye stains or color runs.',
    targets: ['Color runs', 'Uneven dye after treatment', 'Bleeding dyes'],
    family: 'Dye',
    mechanism: 'Migrates dye molecules from areas of high concentration to low concentration, leveling the color across the fiber.',
    safe: ['Most fibers'],
    unsafe: [],
    unsafeReason: '',
    dilution: 'Per product directions.',
    temperature: 'Warm to hot.',
    dwellTime: '10-20 minutes.',
    neverUse: [],
    neverWith: [],
    proTip: 'Used primarily after a color run incident or when a previous treatment has left uneven spotting. Not a first-line stain remover — used for color correction.',
  },
]

export default function ChemicalReferencePage() {
  const [selected, setSelected] = useState<string | null>(null)

  const activeChemical = CHEMICALS.find(c => c.id === selected)

  return (
    <div className="space-y-4 pb-8">
      <div>
        <h1 className="text-xl font-bold" style={{ color: 'var(--text)' }}>Chemical Reference</h1>
        <p className="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>
          Professional spotting agents — what they do, when to use them, when not to.
        </p>
      </div>

      {/* Chemical chips */}
      <div className="flex flex-wrap gap-2">
        {CHEMICALS.map(c => (
          <button
            key={c.id}
            type="button"
            onClick={() => setSelected(selected === c.id ? null : c.id)}
            className="px-3 py-2 rounded-xl text-sm font-semibold transition-all"
            style={{
              background: selected === c.id ? `${c.color}20` : 'var(--surface)',
              border: `1.5px solid ${selected === c.id ? c.color : 'var(--border-strong)'}`,
              color: selected === c.id ? c.color : 'var(--text)',
            }}
          >
            {c.name}
          </button>
        ))}
      </div>

      {/* Detail card */}
      {activeChemical && (
        <div className="space-y-4 rounded-xl p-4" style={{ background: 'var(--surface)', border: '1px solid var(--border-strong)' }}>
          {/* Header */}
          <div>
            <div className="flex items-center gap-2 mb-1">
              <h2 className="text-lg font-bold" style={{ color: activeChemical.color }}>{activeChemical.name}</h2>
              <span className="text-xs px-2 py-0.5 rounded-full" style={{ background: `${activeChemical.color}15`, color: activeChemical.color }}>{activeChemical.family}</span>
            </div>
            <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>Also known as: {activeChemical.aka}</p>
          </div>

          {/* What it is */}
          <div>
            <p className="text-sm leading-relaxed" style={{ color: 'var(--text)' }}>{activeChemical.what}</p>
          </div>

          {/* Mechanism */}
          <div className="rounded-lg p-3" style={{ background: 'var(--surface-2)' }}>
            <p className="text-xs font-semibold uppercase tracking-wider mb-1" style={{ color: 'var(--text-secondary)' }}>How It Works</p>
            <p className="text-sm" style={{ color: 'var(--text)' }}>{activeChemical.mechanism}</p>
          </div>

          {/* Targets */}
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: 'var(--text-secondary)' }}>Use For</p>
            <div className="flex flex-wrap gap-1.5">
              {activeChemical.targets.map(t => (
                <span key={t} className="px-2 py-1 rounded-lg text-xs font-medium" style={{ background: `${activeChemical.color}15`, color: activeChemical.color }}>{t}</span>
              ))}
            </div>
          </div>

          {/* Safe / Unsafe fibers */}
          <div className="grid grid-cols-2 gap-3">
            {activeChemical.safe.length > 0 && (
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider mb-1.5" style={{ color: '#22c55e' }}>✓ Safe On</p>
                <div className="space-y-1">
                  {activeChemical.safe.map(f => (
                    <p key={f} className="text-xs" style={{ color: 'var(--text)' }}>{f}</p>
                  ))}
                </div>
              </div>
            )}
            {activeChemical.unsafe.length > 0 && (
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider mb-1.5" style={{ color: '#ef4444' }}>✗ Avoid On</p>
                <div className="space-y-1">
                  {activeChemical.unsafe.map(f => (
                    <p key={f} className="text-xs" style={{ color: 'var(--text)' }}>{f}</p>
                  ))}
                </div>
                {activeChemical.unsafeReason && (
                  <p className="text-xs mt-1.5 italic" style={{ color: 'var(--text-secondary)' }}>{activeChemical.unsafeReason}</p>
                )}
              </div>
            )}
          </div>

          {/* Application details */}
          <div className="space-y-2">
            <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--text-secondary)' }}>Application</p>
            <div className="grid grid-cols-3 gap-2">
              <div className="rounded-lg p-2" style={{ background: 'var(--surface-2)' }}>
                <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>Dilution</p>
                <p className="text-xs font-medium mt-0.5" style={{ color: 'var(--text)' }}>{activeChemical.dilution}</p>
              </div>
              <div className="rounded-lg p-2" style={{ background: 'var(--surface-2)' }}>
                <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>Temp</p>
                <p className="text-xs font-medium mt-0.5" style={{ color: 'var(--text)' }}>{activeChemical.temperature}</p>
              </div>
              <div className="rounded-lg p-2" style={{ background: 'var(--surface-2)' }}>
                <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>Dwell</p>
                <p className="text-xs font-medium mt-0.5" style={{ color: 'var(--text)' }}>{activeChemical.dwellTime}</p>
              </div>
            </div>
          </div>

          {/* Never use with */}
          {activeChemical.neverWith.length > 0 && (
            <div className="rounded-lg p-3" style={{ background: 'rgba(239,68,68,0.06)', border: '1px solid rgba(239,68,68,0.2)' }}>
              <p className="text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: '#ef4444' }}>⚠️ Never Combine With</p>
              {activeChemical.neverWith.map((w, i) => (
                <p key={i} className="text-xs" style={{ color: 'var(--text)' }}>• {w}</p>
              ))}
            </div>
          )}

          {/* Pro tip */}
          <div className="rounded-lg p-3" style={{ background: 'rgba(34,197,94,0.06)', border: '1px solid rgba(34,197,94,0.2)' }}>
            <p className="text-xs font-semibold uppercase tracking-wider mb-1" style={{ color: 'var(--accent)' }}>💡 Pro Tip</p>
            <p className="text-sm" style={{ color: 'var(--text)' }}>{activeChemical.proTip}</p>
          </div>
        </div>
      )}

      {!selected && (
        <p className="text-sm text-center py-4" style={{ color: 'var(--text-secondary)' }}>
          Tap any agent to see full details
        </p>
      )}
    </div>
  )
}
