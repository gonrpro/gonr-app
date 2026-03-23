'use client'

const FIBERS = [
  { label: 'Silk', value: 'silk', emoji: '🧵' },
  { label: 'Wool / Cashmere', value: 'wool', emoji: '🐑' },
  { label: 'Cotton', value: 'cotton', emoji: '☁️' },
  { label: 'Polyester', value: 'polyester', emoji: '🧴' },
  { label: 'Linen', value: 'linen', emoji: '🌿' },
  { label: 'Leather / Suede', value: 'leather', emoji: '🥾' },
  { label: 'Unknown', value: 'unknown', emoji: '❓', fullWidth: true },
]

interface FiberChipsProps {
  selectedFiber: string | null
  onFiberSelect: (fiber: string) => void
}

export default function FiberChips({ selectedFiber, onFiberSelect }: FiberChipsProps) {
  return (
    <div className="space-y-3">
      <p className="text-xs font-medium text-gray-400 uppercase tracking-wider px-1">
        What fiber?
      </p>
      <div className="grid grid-cols-2 gap-2">
        {FIBERS.map((fiber) => {
          const isSelected = selectedFiber === fiber.value
          return (
            <button
              key={fiber.value}
              onClick={() => onFiberSelect(fiber.value)}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-xl min-h-[44px]
                text-sm font-medium transition-all
                ${fiber.fullWidth ? 'col-span-2' : ''}
                ${
                  isSelected
                    ? 'bg-green-500/20 text-green-600 dark:text-green-400 ring-2 ring-green-500/50'
                    : 'bg-[var(--surface)] border border-[var(--border-strong)] text-[var(--text)] hover:border-green-500/50'
                }`}
            >
              <span className="text-base">{fiber.emoji}</span>
              <span>{fiber.label}</span>
            </button>
          )
        })}
      </div>
    </div>
  )
}
