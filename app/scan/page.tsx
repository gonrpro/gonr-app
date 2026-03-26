'use client'

import { useRouter } from 'next/navigation'

export default function ScanPage() {
  const router = useRouter()

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-bold tracking-tight">Scan</h1>
        <p className="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>
          Point your camera at a stain for instant identification.
        </p>
      </div>

      <button
        onClick={() => router.push('/')}
        className="card w-full flex flex-col items-center justify-center py-12 space-y-3 transition-colors hover:border-green-500/30"
      >
        <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ color: 'var(--green)' }}>
          <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
          <circle cx="12" cy="13" r="4" />
        </svg>
        <p className="text-base font-semibold">Scan a Stain</p>
        <p className="text-xs text-center max-w-[240px]" style={{ color: 'var(--text-secondary)' }}>
          AI identifies the stain type and surface — then pulls the right protocol instantly
        </p>
      </button>

      <button
        onClick={() => router.push('/')}
        className="card w-full flex flex-col items-center justify-center py-8 space-y-2 transition-colors hover:border-green-500/30"
      >
        <span className="text-2xl">🏷️</span>
        <p className="text-sm font-semibold">Scan Care Label</p>
        <p className="text-xs text-center max-w-[240px]" style={{ color: 'var(--text-secondary)' }}>
          Reads fiber content and care symbols automatically
        </p>
      </button>
    </div>
  )
}
