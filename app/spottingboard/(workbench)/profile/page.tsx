// TASK-147 — Plant Profile — Plant DNA, risk boundaries, escalation policy.
// v1 stub: structure only. Persistence wires to plants + plant_users (existing tables) +
// plant_brain_items with module = 'profile' (per TASK-146 schema rec).

export default function PlantProfilePage() {
  return (
    <div className="sb-surface sb-surface-profile">
      <header className="sb-surface-head">
        <h1>Plant Profile</h1>
        <p className="sb-surface-tagline">
          The DNA of your plant. Where you are, what you do, what you don&apos;t touch.
        </p>
      </header>

      <section className="sb-stub-card">
        <h2>Plant DNA</h2>
        <dl className="sb-stat-list">
          <dt>Plant name</dt><dd>Jerry&apos;s Cleaners</dd>
          <dt>Location</dt><dd>Naples, FL</dd>
          <dt>Solvent</dt><dd>Hydrocarbon</dd>
          <dt>Volume</dt><dd>~500 garments/week</dd>
          <dt>Specialties</dt><dd>Wedding, leather, household</dd>
          <dt>Years in operation</dt><dd>3 generations</dd>
        </dl>
      </section>

      <section className="sb-stub-card sb-stub-incomplete">
        <h2>Risk boundaries <span className="sb-stub-tag">incomplete</span></h2>
        <p>What does the plant refuse to treat? What customer requests trigger automatic escalation?</p>
        <button type="button" className="sb-stub-cta">Add risk boundary</button>
      </section>

      <section className="sb-stub-card sb-stub-incomplete">
        <h2>Escalation policy <span className="sb-stub-tag">incomplete</span></h2>
        <p>When does a stain go to the supervisor? When does it go to a leather/textile specialist?</p>
        <button type="button" className="sb-stub-cta">Add escalation rule</button>
      </section>

      <p className="sb-stub-foot">
        Lift integration TODO (Atlas): read plant from existing <code>lib/auth/getUserPlant.ts</code>;
        risk boundaries + escalation policy persist to <code>plant_brain_items</code> with
        <code> module = &apos;profile&apos;</code>.
      </p>
    </div>
  )
}
