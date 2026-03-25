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

  // Build a plain-language customer-facing message — never dump raw science text
  // Use whyThisWorks only as a hint to craft the science line, not verbatim
  let scienceLine = ''
  const source = whyThisWorks || stainChemistry
  if (source && source.length > 20) {
    // Take first sentence, strip jargon, use as context hint
    const firstSentence = source.split(/\.\s+/)[0].trim()
    // Only use it if it doesn't contain technical terms — otherwise use generic
    const hasJargon = /enzyme|oxidiz|tannin|protein|pH|surfactant|solvent|NSD|POG|IPA|H₂O₂|acetic|alkalin/i.test(firstSentence)
    if (!hasJargon && firstSentence.length < 120) {
      scienceLine = ` ${firstSentence}.`
    }
  }

  return `We treated the ${s} stain on your ${f}.${scienceLine} We used the right process for this stain type — let us know if you have any questions about the outcome.`
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
