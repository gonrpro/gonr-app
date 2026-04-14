'use client'

// Bleaching Guide — canonical Spotter-tab reference card
// Authored 2026-04-14 (TASK-018) — consolidates Dan Eisen archive files:
//   105 THE ART OF PROFESSIONAL BLEACHING FOR THE CONSUMER
//   086 PROPER USE OF HOUSEHOLD BLEACH
//   096 RESTORING WHITE FABRICS
//   063 OLD OXIDIZED STAINS REQUIRE HYDROGEN PEROXIDE
//
// Scope rule: textile substrate only. No stone/masonry/countertop references.

import Link from 'next/link'

export default function BleachingGuidePage() {
  return (
    <div className="space-y-4 pb-8">
      <div>
        <h1 className="text-xl font-bold" style={{ color: 'var(--text)' }}>Bleaching Guide</h1>
        <p className="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>
          Professional bleaching reference — oxidizing vs reducing, the 18°F rule, neutralization, and the safety
          boundaries every operator must respect. Consolidated from the Dan Eisen archive.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <div className="rounded-xl p-3" style={{ background: 'rgba(239,68,68,0.06)', border: '1px solid rgba(239,68,68,0.2)' }}>
          <p className="text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: '#ef4444' }}>
            ⚠️ Never
          </p>
          <ul className="text-sm space-y-1" style={{ color: 'var(--text)' }}>
            <li>• Apply bleach full-strength to any fabric</li>
            <li>• Use bleach in a metal container (accelerates and breaks the bleach)</li>
            <li>• Mix chlorine bleach with ammonia (toxic chloramine gas)</li>
            <li>• Use chlorine bleach on wool, silk, or spandex (destroys protein/elastane)</li>
            <li>• Skip the color-fastness test, even for "color safe" formulations</li>
            <li>• Skip the neutralization rinse after a bleach step</li>
          </ul>
        </div>
        <div className="rounded-xl p-3" style={{ background: 'rgba(34,197,94,0.06)', border: '1px solid rgba(34,197,94,0.2)' }}>
          <p className="text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: '#22c55e' }}>
            ✓ Always
          </p>
          <ul className="text-sm space-y-1" style={{ color: 'var(--text)' }}>
            <li>• Plastic or glass container only</li>
            <li>• Color-fastness test on a hidden seam first</li>
            <li>• Dissolve bleach in water <em>before</em> adding garment</li>
            <li>• Neutralize with diluted acetic acid (1:10) or white vinegar after bleaching</li>
            <li>• Work at the lowest concentration that gets the job done</li>
            <li>• Watch for residual action — re-inspect after drying</li>
          </ul>
        </div>
      </div>

      <section className="rounded-xl overflow-hidden" style={{ background: 'var(--surface)', border: '1px solid var(--border-strong)' }}>
        <div className="px-4 pt-4 pb-3" style={{ borderBottom: '1px solid var(--border)' }}>
          <h2 className="text-lg font-bold" style={{ color: 'var(--text)' }}>Oxidizing vs Reducing</h2>
          <p className="text-xs mt-1" style={{ color: 'var(--text-secondary)' }}>Two bleach families — know which one you're reaching for.</p>
        </div>
        <div className="px-4 py-4 space-y-3">
          <div className="rounded-lg p-3" style={{ background: 'var(--surface-2)' }}>
            <p className="text-sm font-semibold mb-1" style={{ color: 'var(--accent)' }}>Oxidizing bleaches — add oxygen to the stain</p>
            <p className="text-sm leading-relaxed" style={{ color: 'var(--text)' }}>
              Work on wet-side stains: tannin, protein residue, mildew, sweat oxidation, yellowing. Break chromophores by
              adding oxygen to double bonds. Families: chlorine bleach (sodium hypochlorite), hydrogen peroxide (H₂O₂),
              sodium perborate, sodium percarbonate (OxiClean). <em>Not effective on dry-side stains</em> (paint, oil, nail polish, glue).
            </p>
          </div>
          <div className="rounded-lg p-3" style={{ background: 'var(--surface-2)' }}>
            <p className="text-sm font-semibold mb-1" style={{ color: 'var(--accent)' }}>Reducing bleaches — strip the dye</p>
            <p className="text-sm leading-relaxed" style={{ color: 'var(--text)' }}>
              Work by removing oxygen from chromophores. Families: sodium hydrosulfite, sodium bisulfite, thiourea dioxide.
              Used for dye-run correction and oxidized protein stains (reverses hemoglobin). Must be neutralized carefully —
              the stain can return if the fabric re-oxidizes.
            </p>
          </div>
        </div>
      </section>

      <section className="rounded-xl p-4" style={{ background: 'rgba(245,158,11,0.06)', border: '1px solid rgba(245,158,11,0.2)' }}>
        <p className="text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: '#f59e0b' }}>
          🔥 The 18°F Rule
        </p>
        <p className="text-sm leading-relaxed" style={{ color: 'var(--text)' }}>
          Every 18°F (10°C) rise in temperature <strong>doubles</strong> the chemical action of both chlorine bleach and
          hydrogen peroxide. A bleach that's safe for wool at 60°F is aggressive at 78°F and destructive at 96°F. If you
          can't precisely control temperature, default to cold and extend dwell time instead.
        </p>
      </section>

      <section className="rounded-xl overflow-hidden" style={{ background: 'var(--surface)', border: '1px solid var(--border-strong)' }}>
        <div className="px-4 pt-4 pb-3" style={{ borderBottom: '1px solid var(--border)' }}>
          <h2 className="text-lg font-bold" style={{ color: 'var(--text)' }}>Bleach families — when to reach for which</h2>
        </div>
        <div className="px-4 py-4 space-y-3">
          {[
            {
              name: 'Chlorine bleach (Sodium Hypochlorite)',
              commercialStrength: '5.25–6% household / 12% industrial',
              useOn: 'White cotton, white linen — color-fast fabrics only',
              neverOn: 'Wool, silk, spandex, any colored fabric (even "color safe" is risky)',
              notes: 'Dilute to ~1% (1:5 for household strength) before contact. Never add ammonia — toxic chloramine gas. Destroys wool keratin and spandex elastane.',
            },
            {
              name: 'Hydrogen Peroxide (H₂O₂)',
              commercialStrength: '3% drugstore / 35% food-grade (professional)',
              useOn: 'All fiber classes with color-fastness test — most oxidized protein stains',
              neverOn: 'Untested dark dyes — will lift color',
              notes: 'Dan\'s safest bleach. Method 1: Q-tip application, re-apply every 15 min. Method 2: add a drop of ammonia to accelerate, color-fastness gate required. Always test 3% for activity — decomposes with light, heat, and age. Mandatory vinegar rinse after.',
            },
            {
              name: 'Sodium Perborate / Sodium Percarbonate',
              commercialStrength: 'Oxygen bleach / OxiClean',
              useOn: 'Whites AND colors (with color-fastness test) — safer than chlorine',
              neverOn: 'Silk and wool in hot water — temperature-gated',
              notes: 'Releases H₂O₂ + sodium carbonate in warm water. The go-to for pit yellowing, mildew on canvas, and general whitening. Follow label dwell time.',
            },
            {
              name: 'Reducing Bleach (Sodium Hydrosulfite)',
              commercialStrength: 'Professional only',
              useOn: 'Dye-run correction, oxidized protein (reverses hemoglobin)',
              neverOn: 'Anything without a plan to re-oxidize or neutralize',
              notes: 'Brief application — 60 seconds max on silk per Dan\'s Blood/Silk protocol. Stain can return if fabric re-oxidizes; neutralize promptly.',
            },
          ].map((b, i) => (
            <div key={i} className="rounded-lg p-3" style={{ background: 'var(--surface-2)' }}>
              <p className="text-sm font-semibold mb-2" style={{ color: 'var(--accent)' }}>{b.name}</p>
              <div className="space-y-1.5 text-sm" style={{ color: 'var(--text)' }}>
                <p><span className="font-semibold">Strength:</span> {b.commercialStrength}</p>
                <p><span className="font-semibold">Use on:</span> {b.useOn}</p>
                <p style={{ color: '#ef4444' }}><span className="font-semibold">Never on:</span> {b.neverOn}</p>
                <p style={{ color: 'var(--text-secondary)' }}>{b.notes}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="rounded-xl p-4" style={{ background: 'var(--surface)', border: '1px solid var(--border-strong)' }}>
        <h2 className="text-lg font-bold mb-2" style={{ color: 'var(--text)' }}>Color-fastness test (mandatory)</h2>
        <ol className="text-sm space-y-1.5 list-decimal list-inside" style={{ color: 'var(--text)' }}>
          <li>Find a hidden seam — inside cuff, inside hem, or inside neckline</li>
          <li>Apply a drop of the bleach you plan to use at working strength</li>
          <li>Wait the full dwell time you'd use on the real stain</li>
          <li>Blot with a white cotton cloth — look for color transfer</li>
          <li>Any transfer = stop. Switch to a gentler agent or refer to professional.</li>
        </ol>
        <p className="text-xs mt-2" style={{ color: 'var(--text-secondary)' }}>
          "Color safe" bleach is marketing, not chemistry. No bleach is safe on all colors. Always test.
        </p>
      </section>

      <section className="rounded-xl p-4" style={{ background: 'rgba(59,130,246,0.06)', border: '1px solid rgba(59,130,246,0.2)' }}>
        <h2 className="text-lg font-bold mb-2" style={{ color: '#3b82f6' }}>Post-bleach neutralization — non-negotiable</h2>
        <p className="text-sm leading-relaxed mb-3" style={{ color: 'var(--text)' }}>
          Every bleach step leaves residual oxidizing or reducing action in the fabric. Unneutralized residue causes
          delayed yellowing, fiber weakening, and in the case of reducing bleaches, the stain returning on re-oxidation.
          The neutralization rinse is not optional.
        </p>
        <div className="space-y-2">
          <div className="rounded-lg p-3" style={{ background: 'var(--surface-2)' }}>
            <p className="text-sm font-semibold" style={{ color: 'var(--accent)' }}>For oxidizing bleaches (chlorine, H₂O₂, perborate)</p>
            <p className="text-sm mt-1" style={{ color: 'var(--text)' }}>
              Rinse with acetic acid 28% diluted 1:10 (or 1 cup white vinegar per gallon of rinse water), dwell 1–2
              minutes, then flush thoroughly with clean water. Acid neutralizes residual alkalinity and deactivates
              unspent oxidizer.
            </p>
          </div>
          <div className="rounded-lg p-3" style={{ background: 'var(--surface-2)' }}>
            <p className="text-sm font-semibold" style={{ color: 'var(--accent)' }}>For reducing bleaches (hydrosulfite)</p>
            <p className="text-sm mt-1" style={{ color: 'var(--text)' }}>
              Rinse with dilute H₂O₂ (0.5%) to re-oxidize and stabilize, then plain water. Prevents stain return.
            </p>
          </div>
        </div>
      </section>

      <section className="rounded-xl p-4" style={{ background: 'rgba(34,197,94,0.06)', border: '1px solid rgba(34,197,94,0.2)' }}>
        <p className="text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: '#22c55e' }}>
          💡 Dan's Rules
        </p>
        <ul className="text-sm space-y-1.5" style={{ color: 'var(--text)' }}>
          <li>• Buy the smallest container of chlorine bleach you can — it dissipates in months, not years</li>
          <li>• Old hydrogen peroxide may be inactive — test for bubbling on a pinch of yeast or a cut potato before use</li>
          <li>• H₂O₂ is the safest oxidizer for textiles — water plus extra oxygen, no alkali</li>
          <li>• Oxidized protein stains (sweat, wine, blood, mustard, coffee, tea, ketchup) respond best to H₂O₂</li>
          <li>• Layer a towel over the immersed garment during a soak to keep it evenly submerged</li>
          <li>• Sodium perborate / percarbonate is the practical "oxygen bleach" for shop use on mixed fabrics</li>
          <li>• When in doubt, use less bleach for longer — it's safer than more for shorter</li>
        </ul>
      </section>

      <section className="rounded-xl p-4" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
        <p className="text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: 'var(--text-secondary)' }}>
          Related reference
        </p>
        <div className="space-y-2">
          <Link href="/pro/chemicals" className="block text-sm" style={{ color: 'var(--accent)' }}>
            → Chemical Reference — brand crosswalk for every spotting agent
          </Link>
          <Link href="/pro/chemistry" className="block text-sm" style={{ color: 'var(--accent)' }}>
            → Chemistry Cards — stain-family bonding and breakdown
          </Link>
        </div>
      </section>

      <p className="text-[11px] mt-2 text-center" style={{ color: 'var(--text-secondary)' }}>
        Source: Dan Eisen archive files 105, 086, 096, 063 · Consolidated 2026-04-14
      </p>
    </div>
  )
}
