'use client'

import type { LucideIcon } from 'lucide-react'
import type { ButtonHTMLAttributes } from 'react'

type Variant = 'primary' | 'tile' | 'tile-active' | 'accent' | 'warning' | 'ghost'

interface IconTileButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  icon: LucideIcon
  label: string
  variant?: Variant
  iconSize?: number
  iconOnly?: boolean
}

const BASE =
  'inline-flex items-center justify-center gap-2 rounded-xl min-h-[44px] px-4 text-sm font-semibold ' +
  'transition-[transform,background,border-color,box-shadow] duration-150 ' +
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]/40 ' +
  'active:scale-[0.98] disabled:opacity-50 disabled:pointer-events-none'

const VARIANT: Record<Variant, string> = {
  primary:
    'bg-[var(--accent)] text-[#031007] shadow-[0_10px_30px_rgba(34,197,94,0.35)] hover:-translate-y-0.5',
  tile:
    'bg-[var(--surface)] text-[var(--text)] border border-[var(--border-strong)] ' +
    'hover:border-[var(--accent)] hover:bg-[var(--accent-soft)]',
  'tile-active':
    'bg-[var(--accent)] text-white border border-[var(--accent)] shadow-[0_10px_24px_rgba(16,185,129,0.22)]',
  accent:
    'bg-[var(--accent-soft)] text-[var(--accent)] border border-[rgba(34,197,94,0.3)] hover:opacity-90',
  warning:
    'bg-[rgba(234,179,8,0.08)] text-[#ca8a04] dark:text-[#fbbf24] border border-[rgba(234,179,8,0.3)] hover:opacity-90',
  ghost:
    'bg-transparent text-[var(--text)] border border-[var(--border)] hover:bg-[var(--accent-soft)]',
}

export default function IconTileButton({
  icon: Icon,
  label,
  variant = 'tile',
  iconSize = 18,
  iconOnly = false,
  className = '',
  ...rest
}: IconTileButtonProps) {
  return (
    <button className={`${BASE} ${VARIANT[variant]} ${className}`} {...rest}>
      <Icon size={iconSize} strokeWidth={1.75} aria-hidden="true" />
      {!iconOnly && <span>{label}</span>}
    </button>
  )
}
