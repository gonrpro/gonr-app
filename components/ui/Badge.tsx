'use client'

import type { ReactNode, CSSProperties } from 'react'

/**
 * Shared Badge component — single source of truth for color-coded labels.
 * v1 spec: Atlas 2026-04-24 (AtlasOps 7929 + 7932).
 * v2 chemistry-family palette locked by Atlas 2026-04-24 (AtlasOps 8053)
 * after Nova's industry deep-dive (AtlasOps 8049).
 *
 * Rules:
 *   - One meaning per tone. Same tone = same semantic meaning, everywhere.
 *   - Color is never the only signal — text must always carry meaning.
 *   - `gold` (operator) is reserved for the Operator tier. Do not reuse.
 *   - `locked` means unavailable/gated, not "bad".
 *   - Chemistry-family tones stay visually distinct from safety tones so a
 *     `protein` badge never reads as `danger` on a glance.
 *   - No ad-hoc tones. If a new semantic appears, add it here (after review).
 *
 * v1 tones:
 *   Safety:  danger / caution / safe
 *   Tier:    home / spotter / operator
 *   Status:  live / comingSoon / locked
 *   Utility: neutral / schema
 *
 * v2 tones (chemistry families — meaning carries across chemicals page +
 * ResultCard stain badges, same family = same color everywhere):
 *   protein (rose)      — PRENETT B tradition, safely distant from danger red
 *   tannin  (blue)      — PRENETT A Blue, deeper than home blue
 *   oil     (emerald)   — honors PRENETT C while protecting safe/live green
 *   dye     (violet)    — distinct from spotter violet by weight
 *   rust    (orange)    — clearly separated from caution amber
 *   combination (slate) — neutral fallback with no emotional valence
 */

export type BadgeTone =
  | 'danger'
  | 'caution'
  | 'safe'
  | 'home'
  | 'spotter'
  | 'operator'
  | 'live'
  | 'comingSoon'
  | 'locked'
  | 'neutral'
  | 'schema'
  // v2 — chemistry families
  | 'protein'
  | 'tannin'
  | 'oil'
  | 'dye'
  | 'rust'
  | 'combination'

export type BadgeSize = 'sm' | 'md' | 'lg'

interface BadgeProps {
  tone?: BadgeTone
  size?: BadgeSize
  /** Force monospace. Default is `true` when tone === 'schema'. */
  mono?: boolean
  icon?: ReactNode
  children: ReactNode
  className?: string
  style?: CSSProperties
  /** Screen-reader-only prefix (e.g. "Risk:"). Optional. */
  srLabel?: string
}

const toneClasses: Record<BadgeTone, string> = {
  // Safety / risk
  danger:     'border-red-500/30 bg-red-500/10 text-red-700 dark:text-red-400',
  caution:    'border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-400',
  safe:       'border-green-600/40 bg-green-500/10 text-green-700 dark:text-green-400',

  // Tier
  home:       'border-blue-500/30 bg-blue-500/10 text-blue-700 dark:text-blue-400',
  spotter:    'border-violet-500/30 bg-violet-500/10 text-violet-700 dark:text-violet-400',
  operator:   'border-amber-400/40 bg-amber-400/10 text-amber-700 dark:text-amber-300',

  // Status
  live:       'border-green-600/40 bg-green-500/10 text-green-700 dark:text-green-400',
  comingSoon: 'border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-400',
  locked:     'border-gray-400/30 bg-gray-500/10 text-gray-600 dark:text-gray-400',

  // Utility
  neutral:    'border-slate-400/20 bg-slate-500/5 text-slate-600 dark:text-slate-400',
  schema:     'border-slate-400/30 bg-slate-500/10 text-slate-600 dark:text-slate-400',

  // Chemistry families (v2 — palette locked by Atlas 8053, Nova 8049):
  protein:     'border-rose-600/30 bg-rose-600/10 text-rose-700 dark:text-rose-400',
  tannin:      'border-blue-600/30 bg-blue-600/10 text-blue-700 dark:text-blue-400',
  oil:         'border-emerald-600/30 bg-emerald-600/10 text-emerald-700 dark:text-emerald-400',
  dye:         'border-violet-600/30 bg-violet-600/10 text-violet-700 dark:text-violet-400',
  rust:        'border-orange-600/30 bg-orange-600/10 text-orange-700 dark:text-orange-400',
  combination: 'border-slate-500/30 bg-slate-500/10 text-slate-700 dark:text-slate-300',
}

const sizeClasses: Record<BadgeSize, string> = {
  sm: 'text-[10px] px-1.5 py-0.5',
  md: 'text-[11px] px-2 py-0.5',
  lg: 'text-xs px-2.5 py-1',
}

export default function Badge({
  tone = 'neutral',
  size = 'md',
  mono,
  icon,
  children,
  className = '',
  style,
  srLabel,
}: BadgeProps) {
  const useMono = mono ?? tone === 'schema'
  const monoClass = useMono ? 'font-mono' : ''

  return (
    <span
      className={`inline-flex items-center gap-1 rounded-md border font-bold whitespace-nowrap ${toneClasses[tone]} ${sizeClasses[size]} ${monoClass} ${className}`.trim()}
      style={style}
    >
      {srLabel && <span className="sr-only">{srLabel} </span>}
      {icon}
      {children}
    </span>
  )
}
