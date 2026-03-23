'use client'

import { useState, useEffect } from 'react'

export default function ProfilePage() {
  const [solveCount, setSolveCount] = useState(0)
  const [dark, setDark] = useState(false)

  useEffect(() => {
    setSolveCount(parseInt(localStorage.getItem('gonr_solve_count') || '0', 10))
    setDark(document.documentElement.classList.contains('dark'))
  }, [])

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-bold tracking-tight">Profile</h1>
        <p className="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>
          Your GONR account &amp; usage stats.
        </p>
      </div>

      {/* Stats card */}
      <div className="card space-y-3">
        <h2 className="text-sm font-semibold uppercase tracking-wider" style={{ color: 'var(--text-secondary)' }}>
          Usage
        </h2>
        <div className="flex items-baseline gap-2">
          <span className="text-3xl font-bold text-green-500">{solveCount}</span>
          <span className="text-sm" style={{ color: 'var(--text-secondary)' }}>solves run</span>
        </div>
      </div>

      {/* Theme preference */}
      <div className="card space-y-3">
        <h2 className="text-sm font-semibold uppercase tracking-wider" style={{ color: 'var(--text-secondary)' }}>
          Appearance
        </h2>
        <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
          Current theme: <span className="font-medium" style={{ color: 'var(--text)' }}>{dark ? 'Dark' : 'Light'}</span>
        </p>
        <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>
          Use the header toggle to switch themes.
        </p>
      </div>

      {/* Tier CTA */}
      <a
        href="https://gonrlabs.lemonsqueezy.com"
        target="_blank"
        rel="noopener noreferrer"
        className="block card text-center space-y-2 hover:border-green-500/30 transition-colors"
      >
        <p className="text-sm font-semibold">Upgrade to GONR Pro</p>
        <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>
          Unlock Deep Solve, Customer Handoff, and more.
        </p>
      </a>
    </div>
  )
}
