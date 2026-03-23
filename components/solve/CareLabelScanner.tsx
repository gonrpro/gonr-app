'use client'

import { useRef, useState } from 'react'

interface CareLabelScannerProps {
  onFiberDetected: (fiber: string, careSymbols: string[]) => void
  onReset: () => void
}

type ScanState = 'idle' | 'scanning' | 'done' | 'error'

export default function CareLabelScanner({ onFiberDetected, onReset }: CareLabelScannerProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [state, setState] = useState<ScanState>('idle')
  const [result, setResult] = useState<{ fiber: string; careSymbols: string[]; confidence: string } | null>(null)
  const [error, setError] = useState('')

  async function handleFile(file: File) {
    setState('scanning')
    setError('')
    try {
      const base64 = await toBase64(file)
      const res = await fetch('/api/scan-label', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ image: base64 }),
      })
      const data = await res.json()
      setResult(data)
      setState('done')
    } catch {
      setError('Could not read label. Try again.')
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
          <span className="text-2xl">🏷️</span>
          <span>Scan Care Label</span>
        </button>
      )}

      {state === 'scanning' && (
        <div className="flex items-center gap-2 px-3 py-2 text-sm text-gray-400">
          <span className="animate-spin">⏳</span> Reading label...
        </div>
      )}

      {state === 'done' && result && (
        <div className="flex flex-col gap-2 w-full">
          <div className="flex items-center gap-2 px-3 py-2 rounded-xl text-sm w-full"
            style={{ background: 'rgba(34,197,94,0.1)', color: 'var(--accent)' }}>
            <span>🏷️</span>
            <span className="font-semibold capitalize">{result.fiber}</span>
            {result.careSymbols?.length > 0 && (
              <span className="text-xs ml-1" style={{ color: 'var(--text-secondary)' }}>· {result.careSymbols.join(', ')}</span>
            )}
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => onFiberDetected(result.fiber, result.careSymbols || [])}
              className="flex-1 py-2 rounded-lg text-sm font-semibold bg-green-500 text-white"
            >
              ✓ Use This
            </button>
            <button
              onClick={() => { setState('idle'); inputRef.current?.click() }}
              className="flex-1 py-2 rounded-lg text-sm font-medium"
              style={{ background: 'var(--surface-2)', color: 'var(--text-secondary)', border: '1px solid var(--border-strong)' }}
            >
              Scan Again
            </button>
          </div>
        </div>
      )}

      {state === 'error' && (
        <div className="space-y-2">
          <p className="text-sm text-red-500 px-1">{error}</p>
          <button
            onClick={handleReset}
            className="px-3 py-1.5 rounded-lg text-sm"
            style={{ background: 'var(--surface-2)', color: 'var(--text-secondary)', border: '1px solid var(--border-strong)' }}
          >
            Try Again
          </button>
        </div>
      )}
    </div>
  )
}
