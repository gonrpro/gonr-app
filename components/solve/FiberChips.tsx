'use client'

const FIBERS = [
  { label: 'Silk', value: 'silk', emoji: '🧵' },
  { label: 'Wool / Cashmere', value: 'wool', emoji: '🐑' },
  { label: 'Cotton', value: 'cotton', emoji: '☁️' },
  { label: 'Polyester', value: 'polyester', emoji: '🧴' },
  { label: 'Linen', value: 'linen', emoji: '🌿' },
  { label: 'Leather / Suede', value: 'leather', emoji: '🥾' },
  { label: 'Unknown', value: 'unknown', emoji: '❓' },
]

interface FiberChipsProps {
  selectedFiber: string | null
  onFiberSelect: (fiber: string) => void
}

export default function FiberChips({ selectedFiber, onFiberSelect }: FiberChipsProps) {
  return (
    <div className="space-y-3">
      <p className="text-xs font-semibold uppercase tracking-wider px-1" style={{ color: 'var(--text-secondary)' }}>
        What fiber?
      </p>
      <div className="flex flex-wrap gap-2">
        {FIBERS.map((fiber) => {
          const isSelected = selectedFiber === fiber.value
          return (
            <button
              key={fiber.value}
              onClick={() => onFiberSelect(fiber.value)}
              className={`chip ${isSelected ? 'selected' : ''}`}
            >
              <span>{fiber.emoji}</span>
              <span>{fiber.label}</span>
            </button>
          )
        })}
      </div>
    </div>
  )
}
