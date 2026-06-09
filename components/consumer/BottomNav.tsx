'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Home, Clock, Bookmark, User, type LucideIcon } from 'lucide-react'
import { useLanguage } from '@/lib/i18n/LanguageContext'

// TASK-218 SHARED FOUNDATION — canonical consumer bottom nav.
// Extracted out of HomeScreen so every /solve-v2 screen renders ONE identical nav.
// Mockup screen 1 is the visual source of truth: 4 tabs (Home / History / Saved /
// Profile), NO center FAB. This is the ONLY sticky chrome on the consumer surface —
// nothing else competes with the stain action. Premium fabric-care feel — active
// tab reads in brand hot-pink with a soft-pink pill + gradient indicator dot;
// inactive is calm navy. Labels are i18n key-based; screen agents import this
// verbatim and MUST NOT redefine the nav.

type NavItem = {
  tKey: string
  href: string
  Icon: LucideIcon
}

const NAV_ITEMS: readonly NavItem[] = [
  { tKey: 'nav.home', href: '/solve-v2', Icon: Home },
  { tKey: 'nav.history', href: '/solve-v2/history', Icon: Clock },
  { tKey: 'nav.saved', href: '/solve-v2/saved', Icon: Bookmark },
  { tKey: 'nav.profile', href: '/solve-v2/profile', Icon: User },
] as const

function isActive(pathname: string, href: string): boolean {
  // Home is only active on the exact root; section tabs match their subtree.
  if (href === '/solve-v2') return pathname === '/solve-v2'
  return pathname === href || pathname.startsWith(`${href}/`)
}

export default function BottomNav() {
  const pathname = usePathname() ?? '/solve-v2'
  const { t } = useLanguage()

  return (
    <nav
      aria-label={t('nav.primaryAria')}
      className="fixed inset-x-0 bottom-0 z-30 mx-auto max-w-[480px] border-t border-[var(--gonr-border)] bg-white/95 px-2 pb-[max(0.5rem,env(safe-area-inset-bottom))] pt-2 backdrop-blur-xl"
    >
      <ul className="grid grid-cols-4">
        {NAV_ITEMS.map(({ tKey, href, Icon }) => {
          const active = isActive(pathname, href)
          const label = t(tKey)
          return (
            <li key={href} className="flex justify-center">
              <Link
                href={href}
                aria-current={active ? 'page' : undefined}
                className="group flex w-full flex-col items-center gap-1 py-1"
              >
                <span
                  className={`relative grid h-9 w-12 place-items-center rounded-full transition-colors duration-200 ${
                    active ? 'bg-gonr-softpink text-gonr-hotpink' : 'text-gonr-navy/45'
                  }`}
                >
                  <Icon size={21} strokeWidth={active ? 2.4 : 2} aria-hidden="true" />
                </span>
                <span
                  className={`text-[11px] font-extrabold leading-none transition-colors duration-200 ${
                    active ? 'text-gonr-hotpink' : 'text-gonr-navy/45'
                  }`}
                >
                  {label}
                </span>
                <span
                  aria-hidden="true"
                  className={`gonr-gradient h-1 w-1 rounded-full transition-opacity duration-200 ${
                    active ? 'opacity-100' : 'opacity-0'
                  }`}
                />
              </Link>
            </li>
          )
        })}
      </ul>
    </nav>
  )
}
