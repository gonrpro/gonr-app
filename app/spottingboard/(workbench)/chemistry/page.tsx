// TASK-147 — Chemistry Stack — agents, solvents, equipment owned by the plant.
// v1 stub: structure only. Persistence in TASK-146 build plan §3 (`module = 'chemistry'`).

export default function ChemistryPage() {
  return (
    <div className="sb-surface sb-surface-chemistry">
      <header className="sb-surface-head">
        <h1>Chemistry Stack</h1>
        <p className="sb-surface-tagline">
          Your plant&apos;s actual rack. What you have, what you don&apos;t, what you&apos;re out of.
        </p>
      </header>

      <section className="sb-stub-card">
        <h2>Spotting agents</h2>
        <ul>
          <li>Tannin formula · A.L. Wilson · in stock</li>
          <li>Protein formula · A.L. Wilson · in stock</li>
          <li>Oxygen bleach (sodium percarbonate) · house · low</li>
          <li>Hydrogen peroxide 3% · house · in stock</li>
          <li>Volatile dry solvent · Adco · in stock</li>
        </ul>
      </section>

      <section className="sb-stub-card">
        <h2>Solvent</h2>
        <ul>
          <li>Hydrocarbon — primary plant solvent</li>
        </ul>
      </section>

      <section className="sb-stub-card">
        <h2>Equipment</h2>
        <ul>
          <li>Spotting board · steam · vacuum</li>
          <li>Hand-held steamer</li>
        </ul>
      </section>

      <p className="sb-stub-foot">
        Lift integration TODO (Atlas): wire to <code>plant_brain_items</code> with
        <code> module = &apos;chemistry&apos;</code>; check-stock toggles persist via existing intake API.
      </p>
    </div>
  )
}
