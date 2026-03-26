'use client'

import { useRouter } from 'next/navigation'

export default function ScanPage() {
  const router = useRouter()

  function handleScanStain() {
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = 'image/*'
    input.capture = 'environment'
    input.onchange = () => {
      // Route back to home which handles the full scan flow
      router.push('/')
    }
    input.click()
  }

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-bold tracking-tight">Scan</h1>
        <p className="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>
          Point your camera at a stain for instant identification.
        </p>
      </div>

      {/* Scan Stain — green hero */}
      <button
        onClick={handleScanStain}
        style={{
          width: '100%',
          background: 'linear-gradient(135deg, rgba(34,197,94,0.15) 0%, rgba(34,197,94,0.05) 100%)',
          borderRadius: '16px',
          minHeight: '110px', boxShadow: '0 0 24px rgba(34,197,94,0.15)',
          border: '2px solid #22c55e',
          cursor: 'pointer',
          transition: 'all 0.15s ease',
        }}
        className="flex flex-col items-center justify-center gap-1 px-4 py-5 hover:opacity-90 active:scale-[0.98]"
      >
        <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#22c55e" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3z" />
          <circle cx="12" cy="13" r="3" />
        </svg>
        <span style={{ color: '#22c55e', fontSize: '18px', fontWeight: 600 }}>Point. Shoot. Solved.</span>
        <span style={{ color: '#8a94a6', fontSize: '13px' }}>Snap the stain — get the exact protocol in seconds</span>
      </button>

      {/* Scan Care Label — purple */}
      <button
        onClick={() => {
          const input = document.createElement('input')
          input.type = 'file'
          input.accept = 'image/*'
          input.capture = 'environment'
          input.click()
        }}
        style={{
          width: '100%',
          borderRadius: '10px',
          border: '1.5px solid rgba(168, 85, 247, 0.5)',
          background: 'rgba(168, 85, 247, 0.06)',
          padding: '10px 14px',
          cursor: 'pointer',
          transition: 'all 0.15s ease',
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
        }}
        className="hover:opacity-90 active:scale-[0.98]"
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#a855f7" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <rect x="3" y="3" width="18" height="18" rx="2" />
          <path d="M7 7h.01M7 12h.01M7 17h.01M12 7h5M12 12h5M12 17h5" />
        </svg>
        <div style={{ textAlign: 'left' }}>
          <div style={{ color: '#a855f7', fontSize: '14px', fontWeight: 600 }}>Scan Care Label</div>
          <div style={{ color: '#8a94a6', fontSize: '12px' }}>Reads fiber + care symbols instantly</div>
        </div>
      </button>
    </div>
  )
}
