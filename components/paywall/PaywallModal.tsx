'use client'

import React from 'react'
import styles from './PaywallModal.module.css'

interface PaywallModalProps {
  open: boolean
  onDismiss: () => void
}

/**
 * Paywall modal shown when free solves are exhausted
 * Displays 3 pricing tiers with checkout links to LemonSqueezy
 */
export default function PaywallModal({ open, onDismiss }: PaywallModalProps) {
  if (!open) return null

  return (
    <div className={styles.overlay} onClick={onDismiss}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        <div className={styles.content}>
          <h2 className={styles.title}>Your trial has ended</h2>
          <p className={styles.subtitle}>Upgrade to keep full access to GONR</p>

          <div className={styles.plansGrid}>
            {/* Spotter — active */}
            <div className={styles.planCard}>
              <h3 className={styles.planName}>Spotter</h3>
              <p className={styles.planDescription}>Full professional toolkit — one user</p>
              <ul style={{ fontSize: '12px', color: '#6b7280', marginBottom: '12px', paddingLeft: '16px', lineHeight: '1.8' }}>
                <li>Solve + 252-card protocol library</li>
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
                href="https://gonr.lemonsqueezy.com/checkout/buy/67c21a2e"
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
              <button disabled className={styles.checkoutBtn} style={{ opacity: 0.4, cursor: 'not-allowed', background: '#f59e0b' }}>
                Notify Me When Live
              </button>
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
