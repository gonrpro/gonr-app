import Link from 'next/link'

export const metadata = {
  title: 'Spotting Board Dashboard — Workbench overview',
  description: 'Spotting Board workbench overview with quick actions for capture, review, chemistry, export, and plant profile.',
}

const ACTIONS = [
  {
    href: '/spottingboard/intake',
    title: 'Capture a rule',
    body: 'Add chemistry, procedure, exception, or plant-local knowledge.',
  },
  {
    href: '/spottingboard/library',
    title: 'Brain Library',
    body: 'Review saved plant cards with authority, risk, and review labels separated.',
  },
  {
    href: '/spottingboard/chemistry',
    title: 'Chemistry Stack',
    body: 'Document agents, solvents, equipment, PPE, and boundaries.',
  },
  {
    href: '/spottingboard/supervisor',
    title: 'Supervisor Review',
    body: 'Promote, reject, or escalate captured rules before they become guidance.',
  },
  {
    href: '/spottingboard/export',
    title: 'Export Center',
    body: 'Export the plant brain into owned Markdown/JSON/ops-book material.',
  },
  {
    href: '/spottingboard/profile',
    title: 'Plant Profile',
    body: 'Set plant DNA, solvent system, risk boundaries, and operating context.',
  },
]

export default function SpottingBoardDashboardPage() {
  return (
    <div className="sb-surface sb-surface-dashboard">
      <header className="sb-surface-head">
        <h1>Dashboard</h1>
        <p className="sb-surface-tagline">
          Spotting Board workbench overview. Use the menu to move between capture, library, chemistry,
          supervisor review, export, and plant profile.
        </p>
      </header>

      <section className="sb-dashboard-hero" aria-label="Spotting Board status">
        <div>
          <p className="sb-dashboard-eyebrow">Plant operating brain</p>
          <h2>Build the rules your plant actually runs on.</h2>
          <p>
            Capture plant-local knowledge, keep unsafe claims quarantined, and preserve the difference between
            authority, risk, and review status. Nothing becomes broad guidance just because someone typed it in.
          </p>
        </div>
        <Link className="sb-link-button" href="/spottingboard/intake">
          Capture first rule
        </Link>
      </section>

      <section className="sb-dashboard-grid" aria-label="Workbench modules">
        {ACTIONS.map((action) => (
          <Link key={action.href} className="sb-dashboard-card" href={action.href}>
            <span className="sb-dashboard-card-title">{action.title}</span>
            <span className="sb-dashboard-card-body">{action.body}</span>
          </Link>
        ))}
      </section>

      <section className="sb-stub-card sb-stub-incomplete">
        <h2>Current gate</h2>
        <p>
          This dashboard now runs inside the same Workbench shell as the rest of Spotting Board, so mobile users
          get the same menu/drawer access instead of a dead-end dashboard page.
        </p>
      </section>
    </div>
  )
}
