'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useEffect, useState, type ReactNode } from 'react'

const NAV: { href: string; label: string; description: string }[] = [
  { href: '/spottingboard/library', label: 'Brain Library', description: 'Plant-owned protocol cards' },
  { href: '/spottingboard/intake', label: 'Capture rule', description: 'Add chemistry, procedure, or plant rule' },
  { href: '/spottingboard/chemistry', label: 'Chemistry Stack', description: 'Agents · solvents · equipment' },
  { href: '/spottingboard/supervisor', label: 'Supervisor Review', description: 'Promote · reject · escalate' },
  { href: '/spottingboard/export', label: 'Export Center', description: 'Own and export your brain' },
  { href: '/spottingboard/profile', label: 'Plant Profile', description: 'Plant DNA · risk boundaries' },
]

function WorkbenchNav({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname()

  return (
    <ul>
      {NAV.map(item => {
        const active = pathname === item.href || pathname.startsWith(`${item.href}/`)
        return (
          <li key={item.href}>
            <Link
              href={item.href}
              className="sb-nav-item"
              data-active={active ? 'true' : undefined}
              onClick={onNavigate}
            >
              <span className="sb-nav-label">{item.label}</span>
              <span className="sb-nav-desc">{item.description}</span>
            </Link>
          </li>
        )
      })}
    </ul>
  )
}

export default function WorkbenchShell({ children }: { children: ReactNode }) {
  const [drawerOpen, setDrawerOpen] = useState(false)

  useEffect(() => {
    document.body.style.overflow = drawerOpen ? 'hidden' : ''
    return () => { document.body.style.overflow = '' }
  }, [drawerOpen])

  return (
    <div className="sb-app" data-drawer-open={drawerOpen ? 'true' : undefined}>
      <header className="sb-topbar">
        <div className="sb-topbar-left">
          <button
            type="button"
            className="sb-menu-button"
            aria-label="Open workbench navigation"
            aria-expanded={drawerOpen}
            onClick={() => setDrawerOpen(true)}
          >
            <span aria-hidden="true" />
            <span aria-hidden="true" />
            <span aria-hidden="true" />
          </button>
          <Link href="/spottingboard" className="sb-brand" aria-label="Spotting Board home">
            <span className="sb-brand-dot" aria-hidden="true" />
            <span className="sb-brand-name">Spotting Board</span>
          </Link>
          <span className="sb-brand-sep" aria-hidden="true" />
          <span className="sb-brand-tagline">The plant brain builder for dry cleaners</span>
        </div>
      </header>

      <nav className="sb-sidebar" aria-label="Workbench modules">
        <WorkbenchNav />
      </nav>

      <div className="sb-mobile-drawer" aria-hidden={!drawerOpen}>
        <button
          type="button"
          className="sb-drawer-backdrop"
          aria-label="Close workbench navigation"
          onClick={() => setDrawerOpen(false)}
        />
        <nav className="sb-drawer-panel" aria-label="Workbench modules">
          <div className="sb-drawer-head">
            <div>
              <p className="sb-drawer-kicker">Workspace</p>
              <h2>Spotting Board</h2>
            </div>
            <button type="button" className="sb-drawer-close" onClick={() => setDrawerOpen(false)} aria-label="Close navigation">
              ×
            </button>
          </div>
          <WorkbenchNav onNavigate={() => setDrawerOpen(false)} />
        </nav>
      </div>

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
