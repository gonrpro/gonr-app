'use client'

import Link from 'next/link'
import { useLanguage } from '@/lib/i18n/LanguageContext'
import HandoffTool from '@/components/solve/HandoffTool'

export default function HandoffPage() {
  const { lang } = useLanguage()

  return (
    <div className="space-y-4 pb-8">
      <div className="flex items-center gap-2 pt-1">
        <Link href="/spotter" className="text-sm" style={{ color: 'var(--text-secondary)' }}>←</Link>
        <div>
          <h1 className="text-xl font-bold tracking-tight" style={{ color: 'var(--text)' }}>
            {lang === 'es' ? 'Entrega al Cliente' : 'Customer Handoff'}
          </h1>
          <p className="text-xs mt-0.5" style={{ color: 'var(--text-secondary)' }}>
            {lang === 'es' ? 'Guiones profesionales para el mostrador' : 'Professional scripts for counter staff'}
          </p>
        </div>
      </div>
      <HandoffTool />
    </div>
  )
}
