'use client'

import { useState, type CSSProperties, type FormEvent } from 'react'
import { useLanguage } from '@/lib/i18n/LanguageContext'

const INPUT_STYLE: CSSProperties = {
  width: '100%',
  borderRadius: 14,
  border: '1px solid var(--border-strong)',
  background: 'var(--surface-2)',
  color: 'var(--text)',
  padding: 12,
  fontSize: 14,
}

export default function PartnersPage() {
  const { t } = useLanguage()

  const [company, setCompany] = useState('')
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [partnershipType, setPartnershipType] = useState('')
  const [message, setMessage] = useState('')
  const [status, setStatus] = useState<'idle' | 'submitting' | 'success' | 'error'>('idle')

  const typeOptions = [
    { value: 'brand-integration', label: t('partnersFormTypeBrand') },
    { value: 'white-label', label: t('partnersFormTypeWhiteLabel') },
    { value: 'affiliate-referral', label: t('partnersFormTypeAffiliate') },
    { value: 'co-marketing', label: t('partnersFormTypeComarketing') },
    { value: 'other', label: t('partnersFormTypeOther') },
  ]

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    if (status === 'submitting') return
    setStatus('submitting')
    try {
      const res = await fetch('/api/partner-inquiry', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          company: company.trim(),
          email: email.trim(),
          partnership_type: partnershipType || null,
          message: message.trim(),
        }),
      })
      // The route returns a non-200 if the inquiry was not actually stored,
      // so success here means it really landed — not a silent no-op.
      if (!res.ok) throw new Error('submit_failed')
      setStatus('success')
    } catch {
      setStatus('error')
    }
  }

  const canSubmit =
    company.trim().length > 0 && name.trim().length > 0 && email.trim().length > 0

  return (
    <div className="space-y-6 max-w-2xl mx-auto pb-8">
      <div>
        <h1 className="text-xl font-bold tracking-tight">{t('partnersTitle')}</h1>
        <p className="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>
          {t('partnersSubtitle')}
        </p>
      </div>

      <div className="space-y-2">
        <h2 className="text-base font-bold">{t('partnersWhyPartner')}</h2>
        <p className="text-sm leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
          {t('partnersWhyPartnerContent')}
        </p>
      </div>

      <div className="space-y-2">
        <h2 className="text-base font-bold">{t('partnersModels')}</h2>
        <p className="text-sm leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
          {t('partnersModelsContent')}
        </p>
      </div>

      <div className="card space-y-4">
        <div className="space-y-1">
          <h2 className="text-base font-bold">{t('partnersContact')}</h2>
          <p className="text-sm leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
            {t('partnersContactContent')}
          </p>
        </div>

        {status === 'success' ? (
          <p className="text-sm font-semibold" style={{ color: 'var(--accent)' }}>
            {t('partnersFormSuccess')}
          </p>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-3">
            <input
              type="text"
              required
              value={company}
              onChange={(e) => setCompany(e.target.value)}
              placeholder={t('partnersFormCompany')}
              aria-label={t('partnersFormCompany')}
              disabled={status === 'submitting'}
              style={INPUT_STYLE}
            />
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={t('partnersFormName')}
              aria-label={t('partnersFormName')}
              disabled={status === 'submitting'}
              style={INPUT_STYLE}
            />
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder={t('partnersFormEmail')}
              aria-label={t('partnersFormEmail')}
              disabled={status === 'submitting'}
              style={INPUT_STYLE}
            />
            <select
              value={partnershipType}
              onChange={(e) => setPartnershipType(e.target.value)}
              aria-label={t('partnersFormType')}
              disabled={status === 'submitting'}
              style={INPUT_STYLE}
            >
              <option value="">{t('partnersFormTypeSelect')}</option>
              {typeOptions.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder={t('partnersFormMessage')}
              aria-label={t('partnersFormMessage')}
              disabled={status === 'submitting'}
              rows={4}
              style={{ ...INPUT_STYLE, resize: 'vertical' }}
            />
            <button
              type="submit"
              disabled={!canSubmit || status === 'submitting'}
              className="w-full font-semibold transition-opacity"
              style={{
                minHeight: 44,
                borderRadius: 14,
                background: 'var(--accent)',
                color: '#fff',
                opacity: !canSubmit || status === 'submitting' ? 0.55 : 1,
              }}
            >
              {status === 'submitting' ? t('partnersFormSubmitting') : t('partnersFormSubmit')}
            </button>
            {status === 'error' && (
              <p className="text-xs" style={{ color: '#dc2626' }}>
                {t('partnersFormError')}
              </p>
            )}
          </form>
        )}

        <p className="text-xs text-center" style={{ color: 'var(--text-secondary)' }}>
          <a href="mailto:tyler@gonr.pro" className="hover:underline">
            tyler@gonr.pro
          </a>
        </p>
      </div>
    </div>
  )
}
