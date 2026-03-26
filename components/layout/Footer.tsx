'use client'

import Link from 'next/link'

export default function Footer() {
  return (
    <footer
      className="pb-[72px] pt-6 px-4 border-t border-gray-200 dark:border-white/10 mt-8"
      style={{ textAlign: 'center' }}
    >
      <p className="text-xs font-semibold mb-3" style={{ color: 'var(--text-secondary)' }}>
        GONR Labs LLC
      </p>
      <div className="flex items-center justify-center gap-4 flex-wrap">
        <Link href="/privacy" className="text-xs hover:underline" style={{ color: 'var(--text-secondary)' }}>
          Privacy Policy
        </Link>
        <span style={{ color: 'var(--text-secondary)', fontSize: '10px' }}>·</span>
        <Link href="/terms" className="text-xs hover:underline" style={{ color: 'var(--text-secondary)' }}>
          Terms of Service
        </Link>
        <span style={{ color: 'var(--text-secondary)', fontSize: '10px' }}>·</span>
        <Link href="/partners" className="text-xs hover:underline" style={{ color: 'var(--text-secondary)' }}>
          Brand Partners
        </Link>
        <span style={{ color: 'var(--text-secondary)', fontSize: '10px' }}>·</span>
        <a href="mailto:hello@gonr.pro" className="text-xs hover:underline" style={{ color: 'var(--text-secondary)' }}>
          Contact
        </a>
      </div>
      <p className="text-[10px] mt-3" style={{ color: 'var(--text-secondary)', opacity: 0.5 }}>
        © {new Date().getFullYear()} GONR Labs LLC. All rights reserved.
      </p>
    </footer>
  )
}
