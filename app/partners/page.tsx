'use client'

import { useState } from 'react'

export default function PartnersPage() {
  const [form, setForm] = useState({ name: '', company: '', email: '', message: '' })
  const [status, setStatus] = useState<'idle' | 'sending' | 'sent' | 'error'>('idle')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.name || !form.company || !form.email) return
    setStatus('sending')
    try {
      const res = await fetch('/api/partner-inquiry', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      if (res.ok) setStatus('sent')
      else setStatus('error')
    } catch {
      setStatus('error')
    }
  }

  return (
    <div className="space-y-6 max-w-prose pb-8">
      <h1 className="text-xl font-bold tracking-tight">Brand Partners</h1>
      <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
        GONR puts the right product recommendation in front of a professional cleaner at the exact moment they need it.
      </p>

      <section className="space-y-3">
        <h2 className="text-base font-semibold">Who We Reach</h2>
        <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
          Dry cleaners, spotters, and textile care professionals across the US. These are the people buying your products — not consumers browsing Amazon. When a cleaner asks GONR how to treat a stain, they see the exact agents and products that solve it.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-base font-semibold">Partnership Opportunities</h2>
        <ul className="text-sm space-y-2" style={{ color: 'var(--text-secondary)' }}>
          <li>✓ Featured product recommendations in protocol cards</li>
          <li>✓ Company profile in the Chemical Reference directory</li>
          <li>✓ Agent-to-brand mapping in the Spotter reference tools</li>
          <li>✓ Co-branded educational content</li>
        </ul>
      </section>

      <section className="space-y-4">
        <h2 className="text-base font-semibold">Get in Touch</h2>
        <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
          We're selective about brand partners. If your products belong on a professional spotting board, we want to talk.
        </p>

        {status === 'sent' ? (
          <div className="card text-center py-8 space-y-2">
            <p className="text-2xl">✅</p>
            <p className="font-semibold">Got it — we'll be in touch.</p>
            <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
              We review every inquiry personally. Expect a reply within 1-2 business days.
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-3">
            <div className="space-y-1">
              <label className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--text-secondary)' }}>Your Name</label>
              <input
                type="text"
                className="input"
                placeholder="Jane Smith"
                value={form.name}
                onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                required
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--text-secondary)' }}>Company</label>
              <input
                type="text"
                className="input"
                placeholder="R.R. Street & Co."
                value={form.company}
                onChange={e => setForm(f => ({ ...f, company: e.target.value }))}
                required
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--text-secondary)' }}>Email</label>
              <input
                type="email"
                className="input"
                placeholder="you@company.com"
                value={form.email}
                onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                required
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--text-secondary)' }}>Tell us about your products</label>
              <textarea
                className="input"
                rows={3}
                placeholder="What you make, who you sell to, what you're interested in..."
                value={form.message}
                onChange={e => setForm(f => ({ ...f, message: e.target.value }))}
                style={{ resize: 'none' }}
              />
            </div>
            {status === 'error' && (
              <p className="text-sm" style={{ color: 'var(--danger)' }}>Something went wrong — email us directly at partners@gonr.pro</p>
            )}
            <button
              type="submit"
              disabled={status === 'sending'}
              className="w-full py-3 rounded-xl text-sm font-bold transition-opacity hover:opacity-90"
              style={{ background: 'var(--accent)', color: '#000' }}
            >
              {status === 'sending' ? 'Sending...' : 'Submit Inquiry →'}
            </button>
          </form>
        )}
      </section>

      <p className="text-xs pt-2" style={{ color: 'var(--text-secondary)', opacity: 0.5 }}>
        GONR Labs LLC · Fort Myers, FL · partners@gonr.pro
      </p>
    </div>
  )
}
// cache bust Thu Mar 26 00:24:44 EDT 2026
