'use client'

// TASK-056 — disambiguation prompt component.
//
// Rendered when the solve API returns `disambiguation_prompt` instead of a
// card. The user picks a refined stain class (or the Unknown escape hatch)
// and `onPick` re-fires the solve with the refined_stain. The original
// surface is preserved by the caller.
//
// Visual weight is intentionally minimal — this is a routing fork, not a
// result. Shares the card aesthetic so it doesn't feel like an error screen.

import type { DisambiguationPrompt as Prompt, DisambiguationOption } from '@/lib/protocols/ambiguity'

type Props = {
  prompt: Prompt
  originalQuery: { stain: string; surface: string }
  onPick: (refinedStain: string) => void
  disabled?: boolean
}

export default function DisambiguationPrompt({ prompt, originalQuery, onPick, disabled }: Props) {
  return (
    <section
      className="rounded-lg border border-amber-500/40 bg-amber-500/5 p-5 space-y-4"
      aria-label="Clarify the stain"
    >
      <header className="space-y-1">
        <p className="text-[11px] font-mono uppercase tracking-wide text-amber-700 dark:text-amber-400">
          One question first
        </p>
        <h2 className="text-lg font-semibold">{prompt.question}</h2>
        <p className="text-xs text-gray-500">
          You entered{' '}
          <span className="font-mono text-gray-700 dark:text-gray-300">&quot;{originalQuery.stain}&quot;</span>
          {originalQuery.surface ? (
            <> on <span className="font-mono text-gray-700 dark:text-gray-300">{originalQuery.surface}</span></>
          ) : null}
          . Picking one helps us match the right protocol — we won&apos;t guess.
        </p>
      </header>

      <div className="grid gap-2">
        {prompt.options.map((opt) => (
          <OptionButton key={opt.refined_stain} option={opt} onPick={onPick} disabled={disabled} />
        ))}
      </div>

      <div className="pt-3 border-t border-amber-500/20">
        <OptionButton
          option={prompt.unknown_option}
          onPick={onPick}
          disabled={disabled}
          variant="unknown"
        />
      </div>
    </section>
  )
}

function OptionButton({
  option,
  onPick,
  disabled,
  variant = 'primary',
}: {
  option: DisambiguationOption
  onPick: (refinedStain: string) => void
  disabled?: boolean
  variant?: 'primary' | 'unknown'
}) {
  const base =
    'w-full text-left rounded-md border px-4 py-3 transition-colors disabled:opacity-60 disabled:cursor-not-allowed'
  const tone =
    variant === 'primary'
      ? 'border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 hover:border-amber-500/60 hover:bg-amber-500/5'
      : 'border-dashed border-gray-400 dark:border-gray-600 bg-transparent hover:border-gray-500 hover:bg-gray-500/5'
  return (
    <button
      type="button"
      onClick={() => onPick(option.refined_stain)}
      disabled={disabled}
      className={`${base} ${tone}`}
    >
      <div className="font-medium text-sm">{option.label}</div>
      {option.hint ? (
        <div className="text-xs text-gray-500 mt-0.5">{option.hint}</div>
      ) : null}
    </button>
  )
}
