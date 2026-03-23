'use client'

import { usePathname } from 'next/navigation'
import Link from 'next/link'

const NAV_ITEMS = [
  { key: 'solve', label: 'Solve', emoji: '\uD83E\uDDEA', href: '/' },
  { key: 'scan', label: 'Scan', emoji: '\uD83D\uDCF7', href: '/scan' },
  { key: 'pro', label: 'Pro Tools', emoji: '\u26A1', href: '/pro' },
  { key: 'profile', label: 'Profile', emoji: '\uD83D\uDC64', href: '/profile' },
] as const

export default function Nav() {
  const pathname = usePathname()

  function isActive(href: string) {
    if (href === '/') return pathname === '/'
    return pathname.startsWith(href)
  }

  return (
    <nav
      className="fixed bottom-0 inset-x-0 z-50 h-[60px]
        bg-white/90 dark:bg-[#05070b]/90
        backdrop-blur-xl border-t border-gray-200 dark:border-white/10"
    >
      <div className="flex items-center justify-around h-full max-w-lg mx-auto px-2">
        {NAV_ITEMS.map((item) => {
          const active = isActive(item.href)
          return (
            <Link
              key={item.key}
              href={item.href}
              className={`flex flex-col items-center justify-center min-h-[44px] min-w-[44px] gap-0.5
                transition-colors ${
                  active
                    ? 'text-green-500'
                    : 'text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300'
                }`}
              aria-label={item.label}
            >
              <span className="text-lg leading-none">{item.emoji}</span>
              <span className="text-[10px] font-medium leading-none">{item.label}</span>
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
