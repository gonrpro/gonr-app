'use client'

import { useRef, useState } from 'react'

interface StainCameraProps {
  onStainDetected: (family: string, suggestion: string) => void
  onReset: () => void
}

type ScanState = 'idle' | 'scanning' | 'done' | 'error'

export default function StainCamera({ onStainDetected, onReset }: StainCameraProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [state, setState] = useState<ScanState>('idle')
  const [result, setResult] = useState<{ family: string; suggestion: string; confidence: string; reasoning: string } | null>(null)
  const [error, setError] = useState('')

  async function handleFile(file: File) {
    setState('scanning')
    setError('')
    try {
      const base64 = await toBase64(file)
      const res = await fetch('/api/scan-stain', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ image: base64 }),
      })
      const data = await res.json()
      setResult(data)
      setState('done')
    } catch {
      setError('Could not analyze stain. Try again.')
      setState('error')
    }
  }

  function toBase64(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = () => resolve((reader.result as string).split(',')[1])
      reader.onerror = reject
      reader.readAsDataURL(file)
    })
  }

  function handleReset() {
    setState('idle')
    setResult(null)
    setError('')
    onReset()
  }

  const FAMILY_LABELS: Record<string, string> = {
    tannin: 'Tannin',
    protein: 'Protein',
    'oil-grease': 'Oil & Grease',
    oxidizable: 'Oxidizable',
    dye: 'Dye',
    combination: 'Combination',
    unknown: 'Unknown',
  }

  return (
    <div>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
      />

      {state === 'idle' && (
        <button
          onClick={() => inputRef.current?.click()}
          className="flex flex-col items-center justify-center gap-1.5 rounded-xl text-sm font-semibold transition-all w-full"
          style={{
            background: 'var(--surface)',
            border: '1.5px solid var(--border-strong)',
            color: 'var(--text)',
            minHeight: 72,
          }}
        >
          <span className="text-2xl">📷</span>
          <span>Scan Stain</span>
        </button>
      )}

      {state === 'scanning' && (
        <div className="flex items-center gap-2 px-3 py-2 text-sm text-gray-400">
          <span className="animate-spin">⏳</span> Analyzing stain...
        </div>
      )}

      {state === 'done' && result && (
        <div className="space-y-2">
          <div className="px-3 py-2 rounded-xl bg-blue-500/10 text-sm space-y-1">
            <p className="text-blue-300 font-medium">
              Looks like <span className="text-white">{result.suggestion}</span>
            </p>
            <p className="text-gray-400 text-xs">
              {FAMILY_LABELS[result.family] || result.family} family · {result.confidence} confidence
            </p>
            {result.reasoning && (
              <p className="text-gray-500 text-xs italic">{result.reasoning}</p>
            )}
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => onStainDetected(result.family, result.suggestion)}
              className="px-3 py-1.5 rounded-lg text-sm font-medium bg-green-500 text-white"
            >
              ✓ Confirm
            </button>
            <button
              onClick={() => { setState('idle'); inputRef.current?.click() }}
              className="px-3 py-1.5 rounded-lg text-sm font-medium bg-[#0e131b] text-gray-400"
            >
              Try Again
            </button>
            <button
              onClick={handleReset}
              className="px-3 py-1.5 rounded-lg text-sm font-medium bg-[#0e131b] text-gray-400"
            >
              ✗ Different
            </button>
          </div>
        </div>
      )}

      {state === 'error' && (
        <div className="space-y-2">
          <p className="text-sm text-red-400 px-1">{error}</p>
          <button onClick={handleReset} className="px-3 py-1.5 rounded-lg text-sm bg-[#0e131b] text-gray-400">
            Try Again
          </button>
        </div>
      )}
    </div>
  )
}
