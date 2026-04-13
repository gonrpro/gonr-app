'use client'

import { useState, useEffect, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { useLanguage } from '@/lib/i18n/LanguageContext'
import HandoffTool from '@/components/solve/HandoffTool'
import LoginGateModal from '@/components/auth/LoginGateModal'

function HandoffPageInner() {
  const { lang } = useLanguage()
  const searchParams = useSearchParams()
  const prefill = searchParams.get('prefill') || ''
  const [showLoginGate, setShowLoginGate] = useState(false)

  const hasEmail = typeof window !== 'undefined' && localStorage.getItem('gonr_user_email')
  useEffect(() => {
    if (!hasEmail) setShowLoginGate(true)
  }, [hasEmail])

  return (
    <div className="space-y-4 pb-8">
      <div className="flex items-center gap-2 pt-1">
        <Link href="/" className="text-sm" style={{ color: 'var(--text-secondary)' }}>←</Link>
        <div>
          <h1 className="text-xl font-bold tracking-tight" style={{ color: 'var(--text)' }}>
            {lang === 'es' ? 'Entrega al Cliente' : 'Customer Handoff'}
          </h1>
          <p className="text-xs mt-0.5" style={{ color: 'var(--text-secondary)' }}>
            {lang === 'es' ? 'Guiones profesionales para el mostrador' : 'Professional scripts for counter staff'}
          </p>
        </div>
      </div>
      <HandoffTool prefill={prefill} onAuthError={() => setShowLoginGate(true)} />
      {showLoginGate && (
        <LoginGateModal
          onClose={() => setShowLoginGate(false)}
          onLoggedIn={() => { setShowLoginGate(false); window.location.reload() }}
        />
      )}
    </div>
  )
}

export default function HandoffPage() {
  return (
    <Suspense>
      <HandoffPageInner />
    </Suspense>
  )
}
