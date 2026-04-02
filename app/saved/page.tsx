'use client'

import { useState, useEffect, useCallback } from 'react'
import { useLanguage } from '@/lib/i18n/LanguageContext'
import ResultCard from '@/components/solve/ResultCard'
import LanguageToggle from '@/components/protocols/LanguageToggle'
import CustomProtocolForm from '@/components/protocols/CustomProtocolForm'

interface SavedProtocol {
  id: string
  user_email: string
  protocol_json: any
  is_custom: boolean
  title: string
  stain: string
  surface: string
  language: string
  translated_json: any | null
  notes: string | null
  created_at: string
}

export default function SavedPage() {
  const { t } = useLanguage()
  const [protocols, setProtocols] = useState<SavedProtocol[]>([])
  const [loading, setLoading] = useState(true)
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [showForm, setShowForm] = useState(false)
  const [deleting, setDeleting] = useState<string | null>(null)
  // Track per-card language display: map of protocol.id → 'en' | 'es'
  const [cardLang, setCardLang] = useState<Record<string, 'en' | 'es'>>({})

  const email = typeof window !== 'undefined' ? localStorage.getItem('gonr_user_email') : null

  const fetchProtocols = useCallback(async () => {
    if (!email) {
      setLoading(false)
      return
    }
    try {
      const res = await fetch(`/api/protocols/saved?email=${encodeURIComponent(email)}`)
      const data = await res.json()
      setProtocols(data.protocols || [])
    } catch {
      // Silent
    } finally {
      setLoading(false)
    }
  }, [email])

  useEffect(() => {
    fetchProtocols()
  }, [fetchProtocols])

  async function handleDelete(id: string) {
    setDeleting(id)
    try {
      const res = await fetch(`/api/protocols/saved/${id}`, { method: 'DELETE' })
      if (res.ok) {
        setProtocols(prev => prev.filter(p => p.id !== id))
        if (expandedId === id) setExpandedId(null)
      }
    } catch {
      // Silent
    } finally {
      setDeleting(null)
    }
  }

  function handleTranslated(protocolId: string, translated: any) {
    setProtocols(prev =>
      prev.map(p =>
        p.id === protocolId ? { ...p, translated_json: translated } : p
      )
    )
    setCardLang(prev => ({ ...prev, [protocolId]: 'es' }))
  }

  function getDisplayCard(p: SavedProtocol) {
    const lang = cardLang[p.id] || 'en'
    if (lang === 'es' && p.translated_json) return p.translated_json
    return p.protocol_json
  }

  if (!email) {
    return (
      <div className="px-4 pt-8 pb-24 text-center">
        <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
          {t('savedSignIn')}
        </p>
      </div>
    )
  }

  return (
    <div className="px-4 pt-6 pb-24 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold" style={{ color: 'var(--text)' }}>
            {t('savedTitle')}
          </h1>
          <p className="text-sm mt-0.5" style={{ color: 'var(--text-secondary)' }}>
            {protocols.length} {t('savedCount')}
          </p>
        </div>
        <button
          onClick={() => setShowForm(true)}
          className="w-10 h-10 rounded-xl flex items-center justify-center text-lg font-bold transition-colors"
          style={{
            background: 'var(--accent-soft)',
            color: 'var(--accent)',
            border: '1px solid rgba(34,197,94,0.3)',
          }}
          aria-label={t('customTitle')}
        >
          +
        </button>
      </div>

      {/* Loading */}
      {loading && (
        <div className="space-y-3">
          {[1, 2, 3].map(i => (
            <div key={i} className="skeleton h-24 rounded-xl" />
          ))}
        </div>
      )}

      {/* Empty state */}
      {!loading && protocols.length === 0 && (
        <div className="text-center py-12 space-y-2">
          <p className="text-3xl">🔖</p>
          <p className="text-sm font-medium" style={{ color: 'var(--text)' }}>
            {t('savedEmpty')}
          </p>
          <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>
            {t('savedEmptyHint')}
          </p>
        </div>
      )}

      {/* Protocol grid */}
      {!loading && protocols.map(p => (
        <div key={p.id} className="rounded-xl overflow-hidden" style={{ background: 'var(--surface)', border: '1px solid var(--border-strong)' }}>
          {/* Summary row */}
          <button
            onClick={() => setExpandedId(expandedId === p.id ? null : p.id)}
            className="w-full text-left px-4 py-3 flex items-start gap-3"
          >
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <p className="text-sm font-semibold truncate" style={{ color: 'var(--text)' }}>
                  {p.title}
                </p>
                {p.is_custom && (
                  <span
                    className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold uppercase"
                    style={{ background: 'rgba(147,51,234,0.1)', color: 'var(--purple)' }}
                  >
                    {t('savedCustomBadge')}
                  </span>
                )}
              </div>
              <p className="text-xs mt-0.5 truncate" style={{ color: 'var(--text-secondary)' }}>
                {[p.stain, p.surface].filter(Boolean).join(' · ')}
                {p.notes && ` — ${p.notes}`}
              </p>
              <p className="text-[10px] mt-1" style={{ color: 'var(--text-secondary)', opacity: 0.6 }}>
                {new Date(p.created_at).toLocaleDateString()}
              </p>
            </div>
            <span
              className={`transition-transform duration-200 mt-1 ${expandedId === p.id ? 'rotate-180' : ''}`}
              style={{ color: 'var(--text-secondary)' }}
            >
              &#9662;
            </span>
          </button>

          {/* Expanded card */}
          {expandedId === p.id && (
            <div style={{ borderTop: '1px solid var(--border)' }}>
              {/* Actions bar */}
              <div className="flex items-center justify-between px-4 py-2" style={{ borderBottom: '1px solid var(--border)' }}>
                <LanguageToggle
                  protocolId={p.id}
                  protocolJson={p.protocol_json}
                  translatedJson={p.translated_json}
                  onTranslated={(translated) => handleTranslated(p.id, translated)}
                />
                <button
                  onClick={() => handleDelete(p.id)}
                  disabled={deleting === p.id}
                  className="text-xs font-medium px-3 py-1.5 rounded-lg transition-colors"
                  style={{
                    color: 'var(--danger)',
                    background: 'rgba(220,38,38,0.08)',
                    border: '1px solid rgba(220,38,38,0.2)',
                    opacity: deleting === p.id ? 0.5 : 1,
                  }}
                >
                  {deleting === p.id ? '...' : t('savedDelete')}
                </button>
              </div>
              <ResultCard
                card={getDisplayCard(p)}
                source={p.is_custom ? 'ai' : (p.protocol_json?.source || 'verified')}
              />
            </div>
          )}
        </div>
      ))}

      {/* Custom Protocol Form (modal) */}
      {showForm && (
        <CustomProtocolForm
          onCreated={() => {
            setShowForm(false)
            fetchProtocols()
          }}
          onClose={() => setShowForm(false)}
        />
      )}
    </div>
  )
}
