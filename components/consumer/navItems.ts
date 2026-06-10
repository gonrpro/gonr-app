import { Home, Clock, Bookmark, User, type LucideIcon } from 'lucide-react'

// TASK-218 SHARED FOUNDATION — single source of truth for consumer primary nav.
// BottomNav (mobile, <lg) and SideNav (desktop, ≥lg) both render exactly these
// items with the same active logic. Screen agents MUST NOT redefine nav items.

export type ConsumerNavItem = {
  tKey: string
  href: string
  Icon: LucideIcon
}

export const NAV_ITEMS: readonly ConsumerNavItem[] = [
  { tKey: 'nav.home', href: '/solve-v2', Icon: Home },
  { tKey: 'nav.history', href: '/solve-v2/history', Icon: Clock },
  { tKey: 'nav.saved', href: '/solve-v2/saved', Icon: Bookmark },
  { tKey: 'nav.profile', href: '/solve-v2/profile', Icon: User },
] as const

export function isNavActive(pathname: string, href: string): boolean {
  // Home is only active on the exact root; section tabs match their subtree.
  if (href === '/solve-v2') return pathname === '/solve-v2'
  return pathname === href || pathname.startsWith(`${href}/`)
}
