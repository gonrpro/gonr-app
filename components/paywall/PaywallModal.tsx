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

  const plans = [
    {
      name: 'Spotter',
      price: '$49',
      period: 'month',
      checkoutUrl: 'https://gonr.lemonsqueezy.com/checkout/buy/67c21a2e',
      description: 'For professional spotters',
    },
    {
      name: 'Operator',
      price: '$99',
      period: 'month',
      checkoutUrl: 'https://gonr.lemonsqueezy.com/checkout/buy/21a29828',
      description: 'For plant operators',
    },
  ]

  return (
    <div className={styles.overlay} onClick={onDismiss}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        <div className={styles.content}>
          <h2 className={styles.title}>Choose your plan</h2>
          <p className={styles.subtitle}>Upgrade to unlock unlimited solves</p>

          <div className={styles.plansGrid}>
            {plans.map((plan) => (
              <div key={plan.name} className={styles.planCard}>
                <h3 className={styles.planName}>{plan.name}</h3>
                <p className={styles.planDescription}>{plan.description}</p>
                <div className={styles.pricing}>
                  <span className={styles.price}>{plan.price}</span>
                  <span className={styles.period}>/{plan.period}</span>
                </div>
                <a
                  href={plan.checkoutUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={styles.checkoutBtn}
                >
                  Upgrade to {plan.name}
                </a>
              </div>
            ))}
          </div>

          <div className={styles.footer}>
            <button onClick={onDismiss} className={styles.dismissBtn}>
              Not ready to upgrade?
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
