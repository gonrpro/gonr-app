// lib/ui/chemistryIcons.tsx
//
// Single source of truth for the chemistry-agent and fiber icons shown on
// /pro/ surfaces. Uses lucide-react — the same modern palette the solve card
// migrated to in TASK-036 Phase 2 (Microscope, FlaskConical, AlertTriangle,
// ShoppingBag, etc). Consolidates what was previously scattered `Record<string,
// string>` emoji maps inside individual pages.
//
// If you need an agent or fiber icon anywhere in the app, import from here
// rather than hard-coding a new emoji — that's how the decorative-emoji drift
// started in the first place.
//
// NOTE: `LucideIcon` is a component type, so consumers render `<Icon size={N}
// />` instead of `{emoji}`. Callsites that still want a string fallback for
// legacy data can keep using the AGENT_ICONS_STR / FIBER_ICONS_STR maps below
// — but new callsites should prefer the component versions.

import {
  Droplet,
  Droplets,
  FlaskConical,
  FlaskRound,
  Dna,
  Wine,
  Biohazard,
  Sun,
  Sparkles,
  Zap,
  Wrench,
  TestTube,
  type LucideIcon,
} from 'lucide-react'

// Chemistry agents — the AGENT_KEYS set in /pro/chemicals matches these.
export const AGENT_ICONS: Record<string, LucideIcon> = {
  NSD: Droplets,
  POG: FlaskRound,
  protein: Biohazard,
  tannin: Wine,
  leveling: Droplet,
  rustRemover: Wrench,
  enzymatic: Dna,
  solvent: FlaskConical,
  oxidizingBleach: Sun,
  reducingAgent: Zap,
  wetCleaningDetergent: Droplets,
  finishingAgent: Sparkles,
}

// Default when a key isn't in the map. FlaskConical matches the solve card's
// chemistry-section icon so fallbacks don't look out of place.
export const AGENT_FALLBACK_ICON: LucideIcon = TestTube

export function getAgentIcon(key: string): LucideIcon {
  return AGENT_ICONS[key] ?? AGENT_FALLBACK_ICON
}
