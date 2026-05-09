'use client'

// app/spottingboard/(workbench)/MobileNav.tsx — TASK-186
//
// Rewrite of TASK-169 MobileNav using @radix-ui/react-dialog primitive.
// Replaces the bespoke drawer + backdrop + portal logic with Radix's
// Dialog primitive, which:
//   - Portals the drawer + overlay to document.body automatically (escapes
//     any sticky/fixed/transform parent stacking context — root cause of
//     the prior "drawer behind page" bug)
//   - Handles focus trap + return focus on close
//   - Handles Escape + outside click to close
//   - Manages aria-modal / aria-hidden / aria-labelledby for screen readers
//   - Locks body scroll while open
//
// Same public API as before: <MobileNav items={WORKBENCH_NAV} />.

import * as Dialog from '@radix-ui/react-dialog'
import { usePathname, useRouter } from 'next/navigation'
import { useState } from 'react'
import type { WorkbenchNavItem } from './nav'

export function MobileNav({ items }: { items: WorkbenchNavItem[] }) {
  const [isOpen, setIsOpen] = useState(false)
  const pathname = usePathname()
  const router = useRouter()

  function navigateTo(href: string) {
    setIsOpen(false)
    if (pathname !== href) router.push(href)
  }

  return (
    <Dialog.Root open={isOpen} onOpenChange={setIsOpen}>
      <Dialog.Trigger asChild>
        <button
          type="button"
          className="sb-mobile-nav-trigger"
          aria-label="Open navigation"
        >
          <span className="sb-mobile-nav-trigger-bars" aria-hidden="true">
            <span /><span /><span />
          </span>
          <span className="sb-mobile-nav-trigger-label">Menu</span>
        </button>
      </Dialog.Trigger>

      <Dialog.Portal>
        <Dialog.Overlay className="sb-sheet-overlay" />
        <Dialog.Content
          className="sb-sheet-content"
          aria-describedby={undefined}
        >
          <header className="sb-sheet-head">
            <Dialog.Title className="sb-sheet-title">Workbench</Dialog.Title>
            <Dialog.Close asChild>
              <button
                type="button"
                className="sb-sheet-close"
                aria-label="Close navigation"
              >
                ✕
              </button>
            </Dialog.Close>
          </header>

          <ul className="sb-sheet-list">
            {items.map((item) => {
              const active = pathname === item.href || pathname.startsWith(`${item.href}/`)
              return (
                <li key={item.href}>
                  <button
                    type="button"
                    className="sb-sheet-item"
                    data-active={active ? 'true' : undefined}
                    onClick={() => navigateTo(item.href)}
                  >
                    <span className="sb-sheet-item-label">{item.label}</span>
                    <span className="sb-sheet-item-desc">{item.description}</span>
                  </button>
                </li>
              )
            })}
          </ul>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}
