'use client'

// ============================================================================
// PlantBrainShell
// ============================================================================
// Wraps Plant Brain routes (/plant-brain, /plant-brain-builder,
// /plant-brain/guide, /plant-brain/dashboard) and escapes the global GONR
// mobile shell:
//
//   - Removes body max-width (set to 600px in globals.css for the consumer app)
//   - Removes body bottom padding (60px reserved for the mobile <Nav />)
//   - Hides global Header / Footer / Nav / PreviewBanner DOM children
//   - Sets dark Plant Brain surface as the body background
//
// Mechanism: adds class `plant-brain-shell` to <body> on mount, removes on
// unmount. Pairs with CSS rules in globals.css that key off this class.
// Brief flash possible on initial paint; acceptable v1 trade-off — proper
// no-FOUC fix is to refactor root layout to conditionally render shell.
// ============================================================================

import { useEffect, type ReactNode } from 'react'

export default function PlantBrainShell({ children }: { children: ReactNode }) {
  useEffect(() => {
    if (typeof document === 'undefined') return
    const body = document.body
    body.classList.add('plant-brain-shell')
    return () => {
      body.classList.remove('plant-brain-shell')
    }
  }, [])

  return <>{children}</>
}
