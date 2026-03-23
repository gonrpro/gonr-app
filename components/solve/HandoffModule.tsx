'use client'

import { useState } from 'react'

const SITUATIONS = [
  { key: 'intake', label: 'Intake', emoji: '\uD83D\uDCE5' },
  { key: 'improved', label: 'Improved', emoji: '\u2705' },
  { key: 'tough', label: 'Tough Stain', emoji: '\u26A0\uFE0F' },
  { key: 'release', label: 'Release', emoji: '\uD83D\uDCE4' },
  { key: 'defect', label: 'Manufacturer Defect', emoji: '\uD83C\uDFED' },
] as const

interface HandoffModuleProps {
  stain: string
  surface: string
}

export default function HandoffModule({ stain, surface }: HandoffModuleProps) {
  const [situation, setSituation] = useState<string>('intake')
  const [details, setDetails] = useState(`Stain: ${stain}\nSurface: ${surface}`)
  const [message, setMessage] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [copied, setCopied] = useState(false)

  const handleGenerate = async () => {
    setLoading(true)
    setError('')
    setMessage('')

    try {
      const res = await fetch('/api/handoff', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ stain, surface, outcome: situation, details }),
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Failed to generate message')
      }

      const data = await res.json()
      setMessage(data.message)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong')
    } finally {
      setLoading(false)
    }
  }

  const handleCopy = async () => {
    if (message) {
      await navigator.clipboard.writeText(message)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  return (
    <div className="space-y-3">
      {/* Situation selector */}
      <div className="flex gap-1.5 flex-wrap">
        {SITUATIONS.map((s) => (
          <button
            key={s.key}
            onClick={() => setSituation(s.key)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors min-h-[44px]
              ${situation === s.key
                ? 'bg-green-500/20 text-green-400 border border-green-500/30'
                : 'bg-gray-100 dark:bg-white/5 text-gray-500 dark:text-gray-400 border border-transparent hover:border-green-500/20'
              }`}
          >
            {s.emoji} {s.label}
          </button>
        ))}
      </div>

      {/* Editable details textarea */}
      <textarea
        value={details}
        onChange={(e) => setDetails(e.target.value)}
        rows={3}
        placeholder="Add details about the situation..."
        className="w-full rounded-lg bg-white dark:bg-[#0e131b] border border-gray-200 dark:border-white/10
          text-sm text-gray-800 dark:text-gray-200 p-3 resize-none
          focus:outline-none focus:ring-2 focus:ring-green-500/50
          placeholder:text-gray-400 dark:placeholder:text-gray-600"
      />

      {/* Generate button */}
      <button
        onClick={handleGenerate}
        disabled={loading}
        className="w-full min-h-[44px] rounded-xl bg-green-500 text-white text-sm font-semibold
          hover:bg-green-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {loading ? 'Generating...' : 'Generate Response'}
      </button>

      {/* Error */}
      {error && (
        <p className="text-sm text-red-400">{error}</p>
      )}

      {/* Generated message */}
      {message && (
        <div className="space-y-2">
          <div className="bg-gray-50 dark:bg-white/5 rounded-xl p-4 text-sm leading-relaxed
            text-gray-700 dark:text-gray-300 whitespace-pre-wrap">
            {message}
          </div>
          <button
            onClick={handleCopy}
            className="w-full min-h-[44px] rounded-lg bg-gray-100 dark:bg-white/5
              border border-gray-200 dark:border-white/10
              text-gray-600 dark:text-gray-400 text-sm font-medium
              hover:bg-gray-200 dark:hover:bg-white/10 transition-colors"
          >
            {copied ? '\u2713 Copied!' : '\uD83D\uDCCB Copy to Clipboard'}
          </button>
        </div>
      )}
    </div>
  )
}
