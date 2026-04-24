'use client'

import type { ReactNode, CSSProperties, KeyboardEvent, MouseEvent } from 'react'
import Badge, { type BadgeTone, type BadgeSize } from './Badge'

/**
 * Clickable Badge — wraps the shared Badge with a button handler so any
 * chemistry / agent / safety badge can open a quick-reference modal or deep
 * link to the full reference.
 *
 * Spec (Atlas 7993 + 8037, Nova 8049):
 *   Every clickable badge answers one of: what is this? / when do I use it? /
 *   what should I avoid? / what related agents exist? Keeps the user in the
 *   solve flow with a modal; never breaks to a full page unless they opt in
 *   via the "See full reference" CTA inside the modal.
 *
 * Pattern:
 *   <BadgeLink tone="tannin" onOpen={() => openQuickRef('tannin')}>Tannin</BadgeLink>
 *
 * Parent owns modal state. BadgeLink only emits the "open this family" event
 * via `onOpen`. Keeps this primitive taxonomy-agnostic so the same component
 * works for stain families, agent families, safety states, future tiers.
 *
 * A11y:
 *   Renders a native <button> so keyboard and screen readers treat it as
 *   activatable. Badge styling (color, size, mono) passes through unchanged.
 *   A hover underline + subtle chevron hint at "this is tappable" without
 *   competing with the Badge palette.
 */

interface BadgeLinkProps {
  tone?: BadgeTone
  size?: BadgeSize
  mono?: boolean
  icon?: ReactNode
  children: ReactNode
  className?: string
  style?: CSSProperties
  /** Screen-reader-only prefix (e.g. "Chemistry:"). Optional. */
  srLabel?: string
  /** Accessible descriptor for the action (e.g. "Open tannin quick reference"). */
  ariaLabel?: string
  /**
   * Click / keyboard handler. Parent wires this to open its quick-reference
   * modal with the relevant content payload.
   */
  onOpen: () => void
  /** Disable the link behavior — renders a plain Badge instead. */
  disabled?: boolean
}

export default function BadgeLink({
  tone = 'neutral',
  size = 'md',
  mono,
  icon,
  children,
  className = '',
  style,
  srLabel,
  ariaLabel,
  onOpen,
  disabled = false,
}: BadgeLinkProps) {
  if (disabled) {
    return (
      <Badge tone={tone} size={size} mono={mono} icon={icon} className={className} style={style} srLabel={srLabel}>
        {children}
      </Badge>
    )
  }

  const handleClick = (e: MouseEvent<HTMLButtonElement>) => {
    e.preventDefault()
    e.stopPropagation()
    onOpen()
  }

  const handleKey = (e: KeyboardEvent<HTMLButtonElement>) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault()
      onOpen()
    }
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      onKeyDown={handleKey}
      aria-label={ariaLabel}
      className="inline-flex items-center gap-0 p-0 border-0 bg-transparent cursor-pointer transition-opacity hover:opacity-80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-500/50 rounded-md"
    >
      <Badge tone={tone} size={size} mono={mono} icon={icon} className={className} style={style} srLabel={srLabel}>
        {children}
      </Badge>
    </button>
  )
}
