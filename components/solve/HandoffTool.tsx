'use client'

// HandoffTool.tsx
// Standalone Customer Handoff tool — used inline in Spotter tab and at /handoff route.

import { useState } from 'react'
import { useLanguage } from '@/lib/i18n/LanguageContext'

const SITUATIONS = [
  { key: 'intake', en: 'Intake', es: 'Recepción' },
  { key: 'improved', en: 'Improved', es: 'Mejorado' },
  { key: 'tough', en: 'Tough Case', es: 'Caso Difícil' },
  { key: 'release', en: 'Release', es: 'Devolución' },
]

export default function HandoffTool() {
  const { lang } = useLanguage()
  const [garment, setGarment] = useState('')
  const [situation, setSituation] = useState('intake')
  const [notes, setNotes] = useState('')
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<{ intake: string; ticketNotes: string; pickup: string; writtenNote: string } | null>(null)
  const [error, setError] = useState('')
  const [copied, setCopied] = useState<string | null>(null)

  async function generate() {
    if (!garment.trim()) return
    setLoading(true)
    setError('')
    setResult(null)

    try {
      const stainParts = garment.split(' on ')
      const res = await fetch('/api/handoff', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          stain: stainParts[0] || garment,
          surface: stainParts[1] || '',
          outcome: situation,
          details: notes.trim() || undefined,
          lang,
        }),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.error || 'Failed to generate')
      }
      const data = await res.json()
      setResult(data)
    } catch (err: any) {
      setError(err.message || 'Something went wrong')
    } finally {
      setLoading(false)
    }
  }

  function copy(text: string, key: string) {
    navigator.clipboard.writeText(text)
    setCopied(key)
    setTimeout(() => setCopied(null), 2000)
  }

  const sections = result ? [
    { key: 'intake', label: lang === 'es' ? 'Guión de Recepción' : 'Intake Script', text: result.intake },
    { key: 'ticketNotes', label: lang === 'es' ? 'Notas del Ticket' : 'Ticket Notes', text: result.ticketNotes },
    { key: 'pickup', label: lang === 'es' ? 'Guión de Entrega' : 'Pickup Script', text: result.pickup },
    { key: 'writtenNote', label: lang === 'es' ? 'Nota Escrita' : 'Written Note', text: result.writtenNote },
  ] : []

  return (
    <div className="space-y-4 pb-4">
      {/* Form */}
      <div className="card space-y-3">
        <div>
          <label className="text-xs font-medium" style={{ color: 'var(--text-secondary)' }}>
            {lang === 'es' ? 'Prenda / Mancha' : 'Garment / Stain'}
          </label>
          <input
            type="text"
            value={garment}
            onChange={e => setGarment(e.target.value)}
            placeholder={lang === 'es' ? 'ej. Sangre en lino, Traje de lana' : 'e.g. Blood on linen, Wool suit'}
            className="w-full rounded-xl px-3 py-2.5 text-sm outline-none border mt-1 transition-colors"
            style={{ background: 'var(--surface)', color: 'var(--text)', borderColor: 'var(--border)' }}
          />
        </div>

        <div>
          <label className="text-xs font-medium" style={{ color: 'var(--text-secondary)' }}>
            {lang === 'es' ? 'Situación' : 'Situation'}
          </label>
          <div className="flex gap-2 flex-wrap mt-1">
            {SITUATIONS.map(s => (
              <button
                key={s.key}
                onClick={() => setSituation(s.key)}
                className="px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors"
                style={{
                  background: situation === s.key ? 'var(--accent)' : 'var(--surface)',
                  color: situation === s.key ? '#fff' : 'var(--text-secondary)',
                  border: '1px solid var(--border)',
                }}
              >
                {lang === 'es' ? s.es : s.en}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="text-xs font-medium" style={{ color: 'var(--text-secondary)' }}>
            {lang === 'es' ? 'Notas adicionales (opcional)' : 'Additional notes (optional)'}
          </label>
          <textarea
            value={notes}
            onChange={e => setNotes(e.target.value)}
            placeholder={lang === 'es' ? 'Contexto especial, solicitudes del cliente...' : 'Special context, customer requests...'}
            rows={2}
            className="w-full rounded-xl px-3 py-2 text-sm resize-none outline-none border mt-1 transition-colors"
            style={{ background: 'var(--surface)', color: 'var(--text)', borderColor: 'var(--border)' }}
          />
        </div>

        {error && <p className="text-xs" style={{ color: '#ef4444' }}>{error}</p>}

        <button
          onClick={generate}
          disabled={loading || !garment.trim()}
          className="w-full py-3 rounded-xl text-sm font-bold transition-colors disabled:opacity-40"
          style={{ background: 'var(--accent)', color: '#fff' }}
        >
          {loading
            ? (lang === 'es' ? 'Generando...' : 'Generating...')
            : (lang === 'es' ? 'Generar Guión' : 'Generate Script')}
        </button>
      </div>

      {/* Results */}
      {result && sections.map(section => (
        <div key={section.key} className="card space-y-2">
          <div className="flex items-center justify-between">
            <p className="text-xs font-bold uppercase tracking-wider" style={{ color: 'var(--text-secondary)' }}>
              {section.label}
            </p>
            <button
              onClick={() => copy(section.text, section.key)}
              className="text-xs font-semibold px-2 py-1 rounded-lg transition-colors"
              style={{ background: 'var(--surface)', color: copied === section.key ? '#22c55e' : 'var(--text-secondary)', border: '1px solid var(--border)' }}
            >
              {copied === section.key ? (lang === 'es' ? '✓ Copiado' : '✓ Copied') : (lang === 'es' ? 'Copiar' : 'Copy')}
            </button>
          </div>
          <p className="text-sm leading-relaxed" style={{ color: 'var(--text)' }}>{section.text}</p>
        </div>
      ))}
    </div>
  )
}
