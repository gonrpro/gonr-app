'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useLanguage } from '@/lib/i18n/LanguageContext'
import { NAV_ITEMS, isNavActive } from './navItems'

// TASK-218 SHARED FOUNDATION — canonical consumer bottom nav (mobile, <lg only;
// SideNav takes over at lg+). Extracted out of HomeScreen so every /solve-v2
// screen renders ONE identical nav. Mockup screen 1 is the visual source of
// truth: 4 tabs (Home / History / Saved / Profile), NO center FAB. This is the
// ONLY sticky chrome on the consumer surface — nothing else competes with the
// stain action. Premium fabric-care feel — active tab reads in brand hot-pink
// with a soft-pink pill + gradient indicator dot; inactive is calm navy. Labels
// are i18n key-based; items live in navItems.ts — screen agents import this
// verbatim and MUST NOT redefine the nav.

export default function BottomNav() {
  const pathname = usePathname() ?? '/solve-v2'
  const { t } = useLanguage()

  return (
    <nav
      aria-label={t('nav.primaryAria')}
      className="fixed inset-x-0 bottom-0 z-30 mx-auto max-w-[480px] border-t border-[var(--gonr-border)] bg-white/95 px-2 pb-[max(0.5rem,env(safe-area-inset-bottom))] pt-2 backdrop-blur-xl lg:hidden"
    >
      <ul className="grid grid-cols-4">
        {NAV_ITEMS.map(({ tKey, href, Icon }) => {
          const active = isNavActive(pathname, href)
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
