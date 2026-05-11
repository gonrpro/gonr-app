'use client'

// TASK-144 — Legal/billing/refund intake modal
// Separated from OperatorFeedbackModal so legal-sensitive content never mingles
// with product feedback (different table, different review pipeline).
// Triggered from OperatorFeedbackModal's "This is a refund/billing/legal issue" link.

import { useState } from 'react'

type Category = 'refund' | 'billing-dispute' | 'damaged-garment' | 'terms-question' | 'other-legal'
type ContactMethod = 'email' | 'phone' | 'in-app'

type LegalIntakePayload = {
  plant_id: string
  category: Category
  description: string
  contact_method?: ContactMethod
  contact_value?: string
}

export type LegalIntakeModalProps = {
  plantId: string
  onSubmit: (payload: LegalIntakePayload) => Promise<void>
  onCancel: () => void
}

const CATEGORIES: { value: Category; label: string; help: string }[] = [
  { value: 'refund', label: 'Refund request', help: 'I want my money back.' },
  { value: 'billing-dispute', label: 'Billing dispute', help: 'A charge looks wrong.' },
  { value: 'damaged-garment', label: 'Damaged garment', help: "Following GONR's recommendation damaged a garment." },
  { value: 'terms-question', label: 'Terms or privacy question', help: "I have a question about the terms or privacy policy." },
  { value: 'other-legal', label: 'Other legal', help: 'Something legal-sensitive that does not fit above.' },
]

export function LegalIntakeModal(props: LegalIntakeModalProps) {
  const [category, setCategory] = useState<Category | undefined>(undefined)
  const [description, setDescription] = useState('')
  const [contactMethod, setContactMethod] = useState<ContactMethod | undefined>(undefined)
  const [contactValue, setContactValue] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const canSubmit = !!category && description.trim().length > 0 && !submitting

  const submit = async () => {
    if (!canSubmit || !category) return
    setSubmitting(true)
    try {
      await props.onSubmit({
        plant_id: props.plantId,
        category,
        description: description.trim(),
        contact_method: contactMethod,
        contact_value: contactValue.trim() || undefined,
      })
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div role="dialog" aria-modal="true" aria-label="Legal or billing intake" className="lim-root">
      <div className="lim-sheet">
        <header className="lim-head">
          <h2 className="lim-title">Send this to our legal/billing review</h2>
          <button type="button" onClick={props.onCancel} aria-label="Cancel" className="lim-close">×</button>
        </header>

        <p className="lim-explainer">
          We keep this separate from product feedback so it goes to the right person.
        </p>

        <fieldset className="lim-cats">
          <legend className="lim-legend">What is this about?</legend>
          {CATEGORIES.map(c => (
            <label key={c.value} className={category === c.value ? 'lim-cat selected' : 'lim-cat'}>
              <input
                type="radio"
                name="category"
                value={c.value}
                checked={category === c.value}
                onChange={() => setCategory(c.value)}
              />
              <span className="lim-cat-label">{c.label}</span>
              <span className="lim-cat-help">{c.help}</span>
            </label>
          ))}
        </fieldset>

        <label className="lim-field">
          <span className="lim-field-label">In your own words, what happened?</span>
          <textarea
            value={description}
            onChange={e => setDescription(e.target.value)}
            rows={5}
            placeholder="Required."
            className="lim-textarea"
          />
        </label>

        <fieldset className="lim-contact">
          <legend className="lim-legend">How can we reach you? (optional)</legend>
          <div className="lim-contact-method">
            {(['email', 'phone', 'in-app'] as ContactMethod[]).map(m => (
              <label key={m} className={contactMethod === m ? 'lim-cm selected' : 'lim-cm'}>
                <input
                  type="radio"
                  name="contact_method"
                  value={m}
                  checked={contactMethod === m}
                  onChange={() => setContactMethod(m)}
                />
                {m === 'in-app' ? 'In-app only' : m.charAt(0).toUpperCase() + m.slice(1)}
              </label>
            ))}
          </div>
          {(contactMethod === 'email' || contactMethod === 'phone') && (
            <input
              type={contactMethod === 'email' ? 'email' : 'tel'}
              value={contactValue}
              onChange={e => setContactValue(e.target.value)}
              placeholder={contactMethod === 'email' ? 'you@example.com' : '+1 555 123 4567'}
              className="lim-contact-input"
            />
          )}
        </fieldset>

        <footer className="lim-foot">
          <button type="button" onClick={props.onCancel} className="lim-secondary">
            Cancel
          </button>
          <button type="button" onClick={submit} disabled={!canSubmit} className="lim-primary">
            {submitting ? 'Sending…' : 'Send'}
          </button>
        </footer>
      </div>
    </div>
  )
}
