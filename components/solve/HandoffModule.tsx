'use client'

import { useState } from 'react'

interface HandoffModuleProps {
  stain: string
  surface: string
  stainChemistry?: string
  whyThisWorks?: string
}

function buildMessage(stain: string, surface: string, stainChemistry?: string, whyThisWorks?: string): string {
  const s = stain.replace(/-/g, ' ')
  const f = surface.replace(/-/g, ' ')

  if (stainChemistry) {
    // Simplify the chemistry text for customer reading level
    return stainChemistry
      .replace(/\bH₂O₂\b/g, 'hydrogen peroxide')
      .replace(/\bNSD\b/g, 'professional detergent')
      .replace(/\bPOG\b/g, 'solvent')
      .replace(/\bacetic acid\b/gi, 'neutralizing rinse')
      .replace(/\bProtein Formula\b/gi, 'enzyme treatment')
      .replace(/\bTannin Formula\b/gi, 'tannin treatment')
  }

  // Fallback plain language
  return `${s.charAt(0).toUpperCase() + s.slice(1)} stains on ${f} require professional treatment. Home methods often set the stain or damage the fiber — we use professional-grade chemistry and technique to get the best possible result.`
}

export default function HandoffModule({ stain, surface, stainChemistry, whyThisWorks }: HandoffModuleProps) {
  const [copied, setCopied] = useState(false)

  const message = buildMessage(stain, surface, stainChemistry, whyThisWorks)

  const handleCopy = async () => {
    await navigator.clipboard.writeText(message)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="space-y-3">
      <div className="rounded-xl p-4 text-sm leading-relaxed" style={{ background: 'var(--surface-2)', color: 'var(--text)' }}>
        {message}
      </div>
      <button
        onClick={handleCopy}
        className="w-full min-h-[44px] rounded-xl text-sm font-semibold transition-colors"
        style={{
          background: copied ? 'rgba(34,197,94,0.15)' : 'var(--surface-2)',
          border: '1px solid var(--border-strong)',
          color: copied ? 'var(--accent)' : 'var(--text)',
        }}
      >
        {copied ? '✓ Copied' : '📋 Copy to Clipboard'}
      </button>
    </div>
  )
}
