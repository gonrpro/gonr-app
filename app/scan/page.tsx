'use client'

export default function ScanPage() {
  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-bold tracking-tight">Scan</h1>
        <p className="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>
          Snap a photo of a stain for instant identification.
        </p>
      </div>

      <div className="card flex flex-col items-center justify-center py-16 space-y-4">
        <span className="text-5xl">📷</span>
        <p className="text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>
          Coming soon
        </p>
        <p className="text-xs text-center max-w-[260px]" style={{ color: 'var(--text-secondary)' }}>
          Point your camera at a stain and GONR will identify the stain type and surface automatically.
        </p>
      </div>
    </div>
  )
}
