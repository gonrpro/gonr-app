// app/spottingboard/(workbench)/layout.tsx — TASK-169 mobile polish
//
// Changes vs prior version:
//   - Imports WORKBENCH_NAV from ./nav (single source of truth)
//   - Mounts <MobileNav /> client component inside the topbar; CSS hides
//     it on desktop and hides the desktop sidebar on mobile
//   - Brand mark + topbar gain safe-area-inset-top padding (workbench.css
//     append handles the rule)

import type { Metadata } from 'next'
import Link from 'next/link'
import { headers } from 'next/headers'
import './workbench.css'
import './mobile-nav-sheet.css'
import { WORKBENCH_NAV } from './nav'
import { MobileNav } from './MobileNav'

export const metadata: Metadata = {
  title: 'Spotting Board Workbench — The plant brain builder for dry cleaners',
  description:
    'Build, edit, and export your plant\'s Stain Brain. Operator-owned. Provenance-labeled.',
}

export default async function SpottingBoardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const _h = await headers()

  return (
    <div className="sb-app">
      <header className="sb-topbar">
        {/* Mobile-only hamburger; CSS hides it ≥761px */}
        <MobileNav items={WORKBENCH_NAV} />

        <div className="sb-topbar-left">
          <Link href="/spottingboard" className="sb-brand" aria-label="Spotting Board home">
            <span className="sb-brand-dot" aria-hidden="true" />
            <span className="sb-brand-name">Spotting Board</span>
          </Link>
          <span className="sb-brand-sep" aria-hidden="true" />
          <span className="sb-brand-tagline">The plant brain builder for dry cleaners</span>
        </div>
      </header>

      {/* Desktop left rail; CSS hides it ≤760px (drawer takes over) */}
      <nav className="sb-sidebar" aria-label="Workbench modules">
        <ul>
          {WORKBENCH_NAV.map(item => (
            <li key={item.href}>
              <Link href={item.href} className="sb-nav-item">
                <span className="sb-nav-label">{item.label}</span>
                <span className="sb-nav-desc">{item.description}</span>
              </Link>
            </li>
          ))}
        </ul>
      </nav>

      <main className="sb-main">{children}</main>

      <aside className="sb-assistant hidden md:block" aria-label="Workbench assistant">
        <header className="sb-assistant-head">
          <h2 className="sb-assistant-title">Workbench assistant</h2>
          <span className="sb-assistant-status">
            <span className="sb-assistant-status-dot" aria-hidden="true" /> ready
          </span>
        </header>
        <div className="sb-assistant-body">
          <p className="sb-assistant-placeholder">
            Ask the workbench assistant about a stain, a chemical interaction, or a plant rule.
            Provenance + risk tier + review status will be visible on every answer.
          </p>
        </div>
      </aside>
    </div>
  )
}
