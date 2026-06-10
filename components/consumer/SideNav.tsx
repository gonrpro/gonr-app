'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useLanguage } from '@/lib/i18n/LanguageContext'
import GonrLogo from '@/components/brand/GonrLogo'
import BetaBadge from './BetaBadge'
import { NAV_ITEMS, isNavActive } from './navItems'

// TASK-218 DESKTOP PASS — desktop twin of BottomNav. Hidden below lg; at lg+
// it becomes the ONLY primary nav (BottomNav is lg:hidden) so the consumer
// surface reads as a native desktop app instead of a stretched phone column.
// Same 4 tabs, same active treatment (soft-pink pill + hot-pink + gradient
// dot) — items come from navItems.ts, never redefined here. Width is w-60
// (240px); every viewport-anchored sibling offsets with lg:pl-60 / lg:left-60.

export default function SideNav() {
  const pathname = usePathname() ?? '/solve-v2'
  const { t } = useLanguage()

  return (
    <nav
      aria-label={t('nav.primaryAria')}
      className="fixed inset-y-0 left-0 z-30 hidden w-60 flex-col border-r border-[var(--gonr-border)] bg-white/95 px-4 pb-6 pt-6 backdrop-blur-xl lg:flex"
    >
      <Link href="/solve-v2" className="flex min-h-[44px] items-center gap-2 px-2">
        <GonrLogo className="w-[124px]" priority />
        <BetaBadge />
      </Link>
      <ul className="mt-8 flex flex-col gap-1.5">
        {NAV_ITEMS.map(({ tKey, href, Icon }) => {
          const active = isNavActive(pathname, href)
          return (
            <li key={href}>
              <Link
                href={href}
                aria-current={active ? 'page' : undefined}
                className={`flex items-center gap-3 rounded-full px-4 py-2.5 transition-colors duration-200 ${
                  active
                    ? 'bg-gonr-softpink text-gonr-hotpink'
                    : 'text-gonr-navy/45 hover:bg-gonr-navy/5 hover:text-gonr-navy/70'
                }`}
              >
                <Icon size={21} strokeWidth={active ? 2.4 : 2} aria-hidden="true" />
                <span className="text-sm font-extrabold leading-none">{t(tKey)}</span>
                <span
                  aria-hidden="true"
                  className={`gonr-gradient ml-auto h-1.5 w-1.5 rounded-full transition-opacity duration-200 ${
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
