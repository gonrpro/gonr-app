'use client'

import { useEffect } from 'react'

const TIERS: {
  name: string
  price: string
  features: string[]
  url: string
  accent: string
  badge: string
  popular?: boolean
}[] = [
  {
    name: 'Home',
    price: '$9.99/mo',
    features: [
      'DIY stain protocols',
      'Product recommendations',
      'Basic stain identification',
      'Email support',
    ],
    url: 'https://gonrlabs.lemonsqueezy.com/checkout/buy/c2ff73cf',
    accent: 'border-green-500',
    badge: 'bg-green-500/20 text-green-400',
  },
  {
    name: 'Spotter',
    price: '$49/mo',
    features: [
      'Everything in Home',
      'Full pro spotting protocols',
      'Deep Solve AI analysis',
      'Customer handoff scripts',
      'Stain Brain chat',
      'Priority support',
    ],
    url: 'https://gonrlabs.lemonsqueezy.com/checkout/buy/67c21a2e',
    accent: 'border-amber-500',
    badge: 'bg-amber-500/20 text-amber-400',
    popular: true,
  },
  {
    name: 'Operator',
    price: '$99/mo',
    features: [
      'Everything in Spotter',
      'Unlimited Deep Solve',
      'Team accounts (up to 5)',
      'Custom protocol library',
      'API access',
      'White-glove onboarding',
    ],
    url: 'https://gonrlabs.lemonsqueezy.com/checkout/buy/21a29828',
    accent: 'border-purple-500',
    badge: 'bg-purple-500/20 text-purple-400',
  },
]

interface TierGateProps {
  isOpen: boolean
  onClose: () => void
  email?: string
}

export default function TierGate({ isOpen, onClose, email }: TierGateProps) {
  // Lock body scroll when open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
    return () => {
      document.body.style.overflow = ''
    }
  }, [isOpen])

  if (!isOpen) return null

  function buildUrl(baseUrl: string) {
    if (email) {
      return `${baseUrl}?checkout[email]=${encodeURIComponent(email)}`
    }
    return baseUrl
  }

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/70 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative z-10 w-full max-w-lg bg-white dark:bg-[#0e131b] rounded-2xl
        shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200 max-h-[90vh] overflow-y-auto">

        {/* Header */}
        <div className="px-6 pt-6 pb-4 text-center">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white">
            Unlock <span className="text-green-500">G</span>ONR
          </h2>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Professional stain removal intelligence
          </p>
        </div>

        {/* Tier cards */}
        <div className="px-4 pb-4 space-y-3">
          {TIERS.map((tier) => (
            <div
              key={tier.name}
              className={`relative rounded-xl border-l-4 ${tier.accent}
                bg-gray-50 dark:bg-white/5 p-4 space-y-3`}
            >
              {tier.popular && (
                <span className="absolute top-3 right-3 text-[10px] font-bold uppercase tracking-wider
                  bg-amber-500/20 text-amber-400 px-2 py-0.5 rounded-full">
                  Most Popular
                </span>
              )}

              <div>
                <h3 className="text-base font-bold text-gray-900 dark:text-white">{tier.name}</h3>
                <p className="text-lg font-bold text-green-500">{tier.price}</p>
              </div>

              <ul className="space-y-1.5">
                {tier.features.map((f, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm text-gray-600 dark:text-gray-400">
                    <span className="text-green-500 flex-shrink-0 mt-0.5">{'\u2713'}</span>
                    <span>{f}</span>
                  </li>
                ))}
              </ul>

              <a
                href={buildUrl(tier.url)}
                target="_blank"
                rel="noopener noreferrer"
                className="block w-full min-h-[44px] rounded-lg bg-green-500 hover:bg-green-600
                  text-white text-sm font-semibold text-center leading-[44px] transition-colors"
              >
                Get Started
              </a>
            </div>
          ))}
        </div>

        {/* Dismiss */}
        <div className="px-4 pb-6 text-center">
          <button
            onClick={onClose}
            className="text-sm text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
          >
            Maybe later
          </button>
        </div>
      </div>
    </div>
  )
}
