'use client'

// app/spottingboard/(workbench)/MobileNav.tsx — TASK-169
//
// Mobile slide-out drawer for workbench nav. Hamburger button in topbar
// (visible only ≤760px), tap → drawer slides in from left, tap backdrop
// or any nav item → drawer closes. Body scroll locked while open.
// Escape key closes. Initial focus moves to the close button for keyboard.

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import type { WorkbenchNavItem } from './nav'

export function MobileNav({ items }: { items: WorkbenchNavItem[] }) {
  const [isOpen, setIsOpen] = useState(false)
  const closeButtonRef = useRef<HTMLButtonElement | null>(null)

  // Lock body scroll while open + focus close button + escape closes
  useEffect(() => {
    if (!isOpen) return
    const prevOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    closeButtonRef.current?.focus()

    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setIsOpen(false)
    }
    window.addEventListener('keydown', onKey)
    return () => {
      document.body.style.overflow = prevOverflow
      window.removeEventListener('keydown', onKey)
    }
  }, [isOpen])

  return (
    <>
      <button
        type="button"
        className="sb-mobile-nav-trigger"
        aria-label="Open navigation"
        aria-expanded={isOpen}
        aria-controls="sb-mobile-drawer"
        onClick={() => setIsOpen(true)}
      >
        <span className="sb-mobile-nav-trigger-bars" aria-hidden="true">
          <span /><span /><span />
        </span>
        <span className="sb-mobile-nav-trigger-label">Menu</span>
      </button>

      {/* Backdrop + drawer always rendered for transition; visibility
          controlled by data-state attribute so CSS transitions can run. */}
      <div
        className="sb-mobile-nav-backdrop"
        data-state={isOpen ? 'open' : 'closed'}
        onClick={() => setIsOpen(false)}
        aria-hidden="true"
      />

      <aside
        id="sb-mobile-drawer"
        className="sb-mobile-nav-drawer"
        data-state={isOpen ? 'open' : 'closed'}
        aria-label="Workbench navigation"
        aria-hidden={!isOpen}
      >
        <header className="sb-mobile-nav-head">
          <span className="sb-mobile-nav-title">Workbench</span>
          <button
            type="button"
            ref={closeButtonRef}
            className="sb-mobile-nav-close"
            aria-label="Close navigation"
            onClick={() => setIsOpen(false)}
          >
            ✕
          </button>
        </header>

        <ul className="sb-mobile-nav-list">
          {items.map((item) => (
            <li key={item.href}>
              <Link
                href={item.href}
                className="sb-mobile-nav-item"
                onClick={() => setIsOpen(false)}
              >
                <span className="sb-mobile-nav-item-label">{item.label}</span>
                <span className="sb-mobile-nav-item-desc">{item.description}</span>
              </Link>
            </li>
          ))}
        </ul>
      </aside>
    </>
  )
}
