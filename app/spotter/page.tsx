'use client'

import Link from 'next/link'

const SPOTTER_TOOLS = [
  {
    id: 'chemicals',
    href: '/pro/chemicals',
    icon: '🧪',
    title: 'Chemical Reference',
    description: 'Every spotting agent — what it does, when to use it, fiber safety, brand crosswalk.',
    border: 'hover:border-green-500/30',
  },
  {
    id: 'chemistry',
    href: '/pro/chemistry',
    icon: '⚗️',
    title: 'Chemistry Cards',
    description: 'Stain family chemistry — how each family bonds to fiber, what breaks it, what makes it permanent.',
    border: 'hover:border-green-500/30',
  },
  {
    id: 'stain-brain',
    href: '/pro',
    icon: '🧠',
    title: 'Stain Brain',
    description: 'Chat with the AI about any stain scenario. Ask why. Ask what if.',
    border: 'hover:border-purple-500/30',
  },
]

export default function SpotterPage() {
  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-bold tracking-tight">Spotter</h1>
        <p className="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>
          Reference, chemistry, and education for professional spotters.
        </p>
      </div>

      {SPOTTER_TOOLS.map(tool => (
        <Link
          key={tool.id}
          href={tool.href}
          className={`card w-full text-left space-y-2 transition-colors ${tool.border} block`}
        >
          <div className="flex items-center gap-2">
            <span className="text-lg">{tool.icon}</span>
            <h2 className="text-base font-bold">{tool.title}</h2>
          </div>
          <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>{tool.description}</p>
        </Link>
      ))}
    </div>
  )
}
