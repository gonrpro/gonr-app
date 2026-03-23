'use client'

import { useState } from 'react'
import TierGate from '@/components/ui/TierGate'

export default function ProToolsPage() {
  const [showGate, setShowGate] = useState(false)

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-bold tracking-tight">Pro Tools</h1>
        <p className="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>
          Advanced features for professional cleaners.
        </p>
      </div>

      {/* Deep Solve */}
      <button
        onClick={() => setShowGate(true)}
        className="card w-full text-left space-y-2 hover:border-green-500/30 transition-colors"
      >
        <div className="flex items-center gap-2">
          <span className="text-lg">🔬</span>
          <h2 className="text-base font-bold">Deep Solve</h2>
          <span className="tier-badge tier-verified text-[10px]">PRO</span>
        </div>
        <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
          AI-powered deep analysis of complex or multi-layered stains.
        </p>
      </button>

      {/* Customer Handoff */}
      <button
        onClick={() => setShowGate(true)}
        className="card w-full text-left space-y-2 hover:border-green-500/30 transition-colors"
      >
        <div className="flex items-center gap-2">
          <span className="text-lg">💬</span>
          <h2 className="text-base font-bold">Customer Handoff</h2>
          <span className="tier-badge tier-verified text-[10px]">PRO</span>
        </div>
        <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
          Generate professional customer-facing messages for intake, release, and tough stains.
        </p>
      </button>

      {/* Stain Brain */}
      <button
        onClick={() => setShowGate(true)}
        className="card w-full text-left space-y-2 hover:border-green-500/30 transition-colors"
      >
        <div className="flex items-center gap-2">
          <span className="text-lg">🧠</span>
          <h2 className="text-base font-bold">Stain Brain</h2>
          <span className="tier-badge tier-verified text-[10px]">PRO</span>
        </div>
        <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
          Chat with GONR&apos;s AI about any stain scenario. Ask anything.
        </p>
      </button>

      <TierGate isOpen={showGate} onClose={() => setShowGate(false)} />
    </div>
  )
}
