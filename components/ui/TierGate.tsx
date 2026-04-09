'use client'

import { useEffect } from 'react'
import { useLanguage } from '@/lib/i18n/LanguageContext'

const TIERS: {
  nameKey: string
  priceKey: string
  featureKeys: string[]
  url: string
  accent: string
  badge: string
  popular?: boolean
  comingSoon?: boolean
}[] = [
  {
    nameKey: 'tierSpotter',
    priceKey: 'tierSpotterPrice',
    featureKeys: [
      'tierFeatureDiyProtocols',
      'tierFeatureFullPro',
      'tierFeatureDeepSolve',
      'tierFeatureHandoff',
      'tierFeatureStainBrain',
      'tierFeaturePriority',
    ],
    url: 'https://gonrlabs.lemonsqueezy.com/checkout/buy/67c21a2e-ae15-4b25-9021-42c791f80325',
    accent: 'border-amber-500',
    badge: 'bg-amber-500/20 text-amber-400',
    popular: true,
  },
  {
    nameKey: 'tierOperator',
    priceKey: 'tierOperatorPrice',
    featureKeys: [
      'tierFeatureEverythingSpotter',
      'tierFeatureUnlimitedDeep',
      'tierFeatureTeam',
      'tierFeatureCustomLibrary',
      'tierFeatureApi',
      'tierFeatureOnboarding',
    ],
    url: 'https://gonrlabs.lemonsqueezy.com/checkout/buy/21a29828-e007-4989-834f-50b372a82240',
    accent: 'border-purple-500',
    badge: 'bg-purple-500/20 text-purple-400',
    comingSoon: true,
  },
]

interface TierGateProps {
  isOpen: boolean
  onClose: () => void
  email?: string
}

export default function TierGate({ isOpen, onClose, email }: TierGateProps) {
  const { t } = useLanguage()

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
            {t('unlockGonr').replace('GONR', '')}
            <span className="text-green-500">G</span>ONR
          </h2>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            {t('tierGateSubtitle')}
          </p>
        </div>

        {/* Tier cards */}
        <div className="px-4 pb-4 space-y-3">
          {TIERS.map((tier) => (
            <div
              key={tier.nameKey}
              className={`relative rounded-xl border-l-4 ${tier.accent}
                bg-gray-50 dark:bg-white/5 p-4 space-y-3`}
            >
              {tier.popular && (
                <span className="absolute top-3 right-3 text-[10px] font-bold uppercase tracking-wider
                  bg-amber-500/20 text-amber-400 px-2 py-0.5 rounded-full">
                  {t('tierMostPopular')}
                </span>
              )}

              <div>
                <h3 className="text-base font-bold text-gray-900 dark:text-white">{t(tier.nameKey)}</h3>
                <p className="text-lg font-bold text-green-500">{t(tier.priceKey)}</p>
              </div>

              <ul className="space-y-1.5">
                {tier.featureKeys.map((fKey) => (
                  <li key={fKey} className="flex items-start gap-2 text-sm text-gray-600 dark:text-gray-400">
                    <span className="text-green-500 flex-shrink-0 mt-0.5">{'\u2713'}</span>
                    <span>{t(fKey)}</span>
                  </li>
                ))}
              </ul>

              {tier.comingSoon ? (
                <div
                  className="block w-full min-h-[44px] rounded-lg bg-gray-200 dark:bg-gray-700
                    text-gray-500 dark:text-gray-400 text-sm font-semibold text-center leading-[44px] cursor-default"
                >
                  {t('comingSoon')}
                </div>
              ) : (
                <a
                  href={buildUrl(tier.url)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block w-full min-h-[44px] rounded-lg bg-green-500 hover:bg-green-600
                    text-white text-sm font-semibold text-center leading-[44px] transition-colors"
                >
                  {t('tierGetStarted')}
                </a>
              )}
            </div>
          ))}
        </div>

        {/* Dismiss */}
        <div className="px-4 pb-6 text-center">
          <button
            onClick={onClose}
            className="text-sm text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
          >
            {t('maybeLater')}
          </button>
        </div>
      </div>
    </div>
  )
}
