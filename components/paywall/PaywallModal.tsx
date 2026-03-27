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
                <li>Solve + 234-card protocol library</li>
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
            <div className={styles.planCard} style={{ opacity: 0.6, position: 'relative' }}>
              <div style={{
                position: 'absolute', top: '10px', right: '10px',
                background: '#f59e0b', color: '#fff',
                fontSize: '10px', fontWeight: 700, padding: '2px 8px',
                borderRadius: '999px', letterSpacing: '0.05em',
              }}>
                COMING SOON
              </div>
              <h3 className={styles.planName}>Operator</h3>
              <p className={styles.planDescription}>For plant owners managing teams</p>
              <ul style={{ fontSize: '12px', color: '#6b7280', marginBottom: '12px', paddingLeft: '16px', lineHeight: '1.8' }}>
                <li>Everything in Spotter</li>
                <li>Team seats + counter staff access</li>
                <li>Training dashboard</li>
                <li>Multi-location support</li>
              </ul>
              <div className={styles.pricing}>
                <span className={styles.price}>$99</span>
                <span className={styles.period}>/month</span>
              </div>
              <button disabled className={styles.checkoutBtn} style={{ opacity: 0.5, cursor: 'not-allowed' }}>
                Coming Soon
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
