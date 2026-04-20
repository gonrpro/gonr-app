'use client'

import React, { useState } from 'react'
import styles from './PaywallModal.module.css'
import { buildCheckoutUrl, isCheckoutLive } from '@/lib/payments/checkoutUrls'

interface PaywallModalProps {
  open: boolean
  onDismiss: () => void
  reason?: 'trial_expired' | 'anon_limit'
  stain?: string
}

// TASK-034: Operator waitlist capture. While Operator is parked, accumulate
// warm leads we can email when it launches. Posts to /api/operator-waitlist.
function OperatorWaitlist() {
  const [email, setEmail] = useState('')
  const [status, setStatus] = useState<'idle' | 'submitting' | 'success' | 'error'>('idle')

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    const trimmed = email.trim()
    if (!trimmed) return
    setStatus('submitting')
    try {
      const res = await fetch('/api/operator-waitlist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: trimmed }),
      })
      if (!res.ok) throw new Error('failed')
      setStatus('success')
    } catch {
      setStatus('error')
    }
  }

  if (status === 'success') {
    return (
      <p style={{ fontSize: '12px', color: '#92400e', fontWeight: 600, textAlign: 'center', padding: '10px 0' }}>
        &#10003; You&apos;re on the list. We&apos;ll email when Operator launches.
      </p>
    )
  }

  return (
    <form onSubmit={onSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
      <input
        type="email"
        value={email}
        onChange={e => setEmail(e.target.value)}
        placeholder="you@shop.com"
        required
        disabled={status === 'submitting'}
        style={{
          padding: '8px 10px',
          borderRadius: '8px',
          border: '1px solid rgba(245,158,11,0.4)',
          fontSize: '13px',
          background: '#fff',
          outline: 'none',
        }}
      />
      <button
        type="submit"
        disabled={status === 'submitting' || !email.trim()}
        className={styles.checkoutBtn}
        style={{ background: '#f59e0b', opacity: status === 'submitting' ? 0.6 : 1 }}
      >
        {status === 'submitting' ? 'Saving...' : 'Notify me when Operator launches'}
      </button>
      {status === 'error' && (
        <p style={{ fontSize: '11px', color: '#dc2626', textAlign: 'center' }}>
          Couldn&apos;t save your email. Try again.
        </p>
      )}
    </form>
  )
}

/**
 * Paywall modal shown when free solves are exhausted
 * Displays 3 pricing tiers with checkout links to LemonSqueezy
 */
export default function PaywallModal({ open, onDismiss, reason = 'trial_expired', stain }: PaywallModalProps) {
  if (!open) return null

  if (reason === 'anon_limit') {
    return (
      <div className={styles.overlay} onClick={onDismiss}>
        <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
          <div className={styles.content}>
            {/* Icon */}
            <div style={{ fontSize: '2rem', marginBottom: '12px' }}>🧪</div>

            <h2 className={styles.title} style={{ fontSize: '1.3rem', lineHeight: '1.3' }}>
              {stain ? `🧪 Nice. Your ${stain} protocol is ready.` : 'Your protocol is ready.'}
            </h2>
            <p className={styles.subtitle} style={{ marginBottom: '0', lineHeight: '1.6' }}>
              Built from decades of professional dry-cleaning experience. Your protocol is specific to this stain — not generic advice.
            </p>

            {/* Social proof / trust signals */}
            <div style={{
              display: 'flex',
              gap: '12px',
              margin: '16px 0',
              fontSize: '11px',
              color: 'var(--text-secondary)',
              flexWrap: 'wrap',
            }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>✓ No credit card</span>
              <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>✓ 3 free solves</span>
              <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>✓ Built by dry cleaners</span>
            </div>

            <a
              href="/auth/signup"
              className={styles.checkoutBtn}
              style={{ display: 'block', textAlign: 'center', marginTop: '4px', marginBottom: '12px', padding: '14px', fontSize: '15px', fontWeight: 700, borderRadius: '10px' }}
            >
              See my protocol — it&apos;s free
            </a>

            <div style={{ textAlign: 'center' }}>
              <button onClick={onDismiss} className={styles.dismissBtn} style={{ fontSize: '12px', opacity: 0.5 }}>
                I&apos;ll risk the stain
              </button>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className={styles.overlay} onClick={onDismiss}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        <div className={styles.content}>
          <h2 className={styles.title}>You&apos;ve used your 3 free solves</h2>
          <p className={styles.subtitle}>Pick a plan to keep removing stains</p>

          <div className={styles.plansGrid}>
            {/* Home — primary consumer tier (TASK-051) */}
            {isCheckoutLive('home') && (
              <div className={styles.planCard} style={{ border: '1px solid rgba(34,197,94,0.4)', background: 'rgba(34,197,94,0.03)' }}>
                <h3 className={styles.planName}>Home</h3>
                <p className={styles.planDescription}>Confident stain removal at home</p>
                <ul style={{ fontSize: '12px', color: '#6b7280', marginBottom: '12px', paddingLeft: '16px', lineHeight: '1.8' }}>
                  <li>Unlimited solves</li>
                  <li>Safe home-ingredient protocols</li>
                  <li>Step-by-step guidance</li>
                  <li>Cancel anytime</li>
                </ul>
                <div className={styles.pricing}>
                  <span className={styles.price}>$7.99</span>
                  <span className={styles.period}>/month</span>
                </div>
                <a
                  href={buildCheckoutUrl('home') ?? '/auth/signup'}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={styles.checkoutBtn}
                  style={{ background: '#22c55e' }}
                >
                  Get GONR Home
                </a>
              </div>
            )}

            {/* Spotter — active */}
            <div className={styles.planCard}>
              <h3 className={styles.planName}>Spotter</h3>
              <p className={styles.planDescription}>Full professional toolkit — one user</p>
              <ul style={{ fontSize: '12px', color: '#6b7280', marginBottom: '12px', paddingLeft: '16px', lineHeight: '1.8' }}>
                <li>Solve + 250+ protocol library</li>
                <li>Chemistry Cards + Chemical Reference</li>
                <li>Stain Brain AI chat</li>
                <li>Deep Solve + Garment Analysis</li>
                <li>Customer Handoff scripts</li>
              </ul>
              <div className={styles.pricing}>
                <span className={styles.price}>$49</span>
                <span className={styles.period}>/month</span>
              </div>
              <a
                href={buildCheckoutUrl('spotter') ?? '#'}
                target="_blank"
                rel="noopener noreferrer"
                className={styles.checkoutBtn}
              >
                Upgrade to Spotter
              </a>
            </div>

            {/* Operator — coming soon */}
            <div className={styles.planCard} style={{ position: 'relative', border: '1px solid rgba(245,158,11,0.4)', background: 'rgba(245,158,11,0.03)' }}>
              <div style={{
                position: 'absolute', top: '10px', right: '10px',
                background: '#f59e0b', color: '#fff',
                fontSize: '10px', fontWeight: 700, padding: '2px 8px',
                borderRadius: '999px', letterSpacing: '0.05em',
              }}>
                COMING SOON
              </div>
              <h3 className={styles.planName}>Operator</h3>
              <p className={styles.planDescription} style={{ fontStyle: 'italic', color: '#92400e' }}>
                Built for the plant owner who runs the whole operation
              </p>
              <ul style={{ fontSize: '12px', color: '#6b7280', marginBottom: '12px', paddingLeft: '16px', lineHeight: '2' }}>
                <li>✦ <strong>Garment Analysis</strong> — AI photo assessment, root cause, repairability verdict</li>
                <li>✦ <strong>Legal-Shield Handoff</strong> — documented customer communication that protects your shop</li>
                <li>✦ <strong>Problem Garment Queue</strong> — spotters flag tough cases, you review and action</li>
                <li>✦ <strong>Team Seats</strong> — add spotters and counter staff under one account</li>
                <li>✦ <strong>Training Dashboard</strong> — track knowledge scores across your team</li>
                <li>✦ <strong>Multi-location</strong> — run multiple plants from one login</li>
              </ul>
              <p style={{ fontSize: '11px', color: '#92400e', marginBottom: '12px', fontWeight: 600 }}>
                Early Spotter subscribers get grandfathered pricing when Operator launches.
              </p>
              <div className={styles.pricing}>
                <span className={styles.price}>$99</span>
                <span className={styles.period}>/month</span>
              </div>
              {isCheckoutLive('operator') ? (
                <a
                  href={buildCheckoutUrl('operator') ?? '#'}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={styles.checkoutBtn}
                  style={{ background: '#f59e0b' }}
                >
                  Upgrade to Operator
                </a>
              ) : (
                <OperatorWaitlist />
              )}
            </div>
          </div>

          <div className={styles.footer}>
            <button onClick={onDismiss} className={styles.dismissBtn}>
              Not ready yet?
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
