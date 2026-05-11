// app/spottingboard/(workbench)/layout.tsx — TASK-169 mobile polish + TASK-189 assistant-rail removal
//
// TASK-189 (2026-05-11): removed the static "Workbench assistant" right rail.
// It was a placeholder with no backing function; Tyler flagged it as fake UI.
// The right-rail real estate now belongs to the surface route — /setup
// renders a live Plant Brain preview in that slot.

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
  await headers()

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
    </div>
  )
}
