'use client'

import FooterContent from '@/components/layout/FooterContent'

export default function Footer({ brand = 'gonr' }: { brand?: 'gonr' | 'spottingboard' }) {
  if (brand === 'spottingboard') return null

  return (
    <footer
      className="pb-[72px] pt-6 px-4 border-t border-gray-200 dark:border-white/10 mt-8"
    >
      <FooterContent />
    </footer>
  )
}
