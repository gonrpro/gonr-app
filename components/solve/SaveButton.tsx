'use client'

import { useState, useEffect } from 'react'
import type { ProtocolCard } from '@/lib/types'
import { useLanguage } from '@/lib/i18n/LanguageContext'

interface SaveButtonProps {
  card: ProtocolCard
}

export default function SaveButton({ card }: SaveButtonProps) {
  const { t } = useLanguage()
  const [saved, setSaved] = useState(false)
  const [saving, setSaving] = useState(false)
  const [savedId, setSavedId] = useState<string | null>(null)

  const email = typeof window !== 'undefined' ? localStorage.getItem('gonr_user_email') : null

  // Check if already saved on mount
  useEffect(() => {
    if (!email) return
    fetch(`/api/protocols/saved?email=${encodeURIComponent(email)}`)
      .then(r => r.json())
      .then(data => {
        const match = data.protocols?.find(
          (p: any) => p.protocol_json?.id === card.id || p.protocol_json?.title === card.title
        )
        if (match) {
          setSaved(true)
          setSavedId(match.id)
        }
      })
      .catch(() => {})
  }, [email, card.id, card.title])

  async function handleToggle() {
    if (!email) return
    if (saving) return

    setSaving(true)

    try {
      if (saved && savedId) {
        // Unsave
        const res = await fetch(`/api/protocols/saved/${savedId}`, { method: 'DELETE' })
        if (res.ok) {
          setSaved(false)
          setSavedId(null)
        }
      } else {
        // Save
        const res = await fetch('/api/protocols/save', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, protocol: card }),
        })
        const data = await res.json()
        if (res.ok) {
          setSaved(true)
          setSavedId(data.id)
        } else if (res.status === 403) {
          alert(data.error || t('savedLimitReached'))
        }
      }
    } catch {
      // Silent fail
    } finally {
      setSaving(false)
    }
  }

  if (!email) return null

  return (
    <button
      onClick={handleToggle}
      disabled={saving}
      className="flex items-center justify-center w-9 h-9 rounded-lg transition-colors"
      style={{
        background: saved ? 'rgba(34,197,94,0.15)' : 'transparent',
        border: '1px solid',
        borderColor: saved ? 'rgba(34,197,94,0.3)' : 'var(--border-strong)',
      }}
      aria-label={saved ? t('savedUnsave') : t('savedSave')}
      title={saved ? t('savedUnsave') : t('savedSave')}
    >
      {saving ? (
        <svg width="16" height="16" viewBox="0 0 16 16" className="animate-spin" style={{ color: 'var(--text-secondary)' }}>
          <circle cx="8" cy="8" r="6" fill="none" stroke="currentColor" strokeWidth="2" strokeDasharray="28" strokeDashoffset="8" />
        </svg>
      ) : (
        <svg
          width="18"
          height="18"
          viewBox="0 0 24 24"
          fill={saved ? '#22c55e' : 'none'}
          stroke={saved ? '#22c55e' : 'currentColor'}
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          style={{ color: 'var(--text-secondary)' }}
        >
          <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" />
        </svg>
      )}
    </button>
  )
}
