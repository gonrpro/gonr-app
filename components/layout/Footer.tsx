'use client'

import Link from 'next/link'
import { useLanguage } from '@/lib/i18n/LanguageContext'

export default function Footer() {
  const { lang } = useLanguage()

  return (
    <footer
      className="pb-[72px] pt-6 px-4 border-t border-gray-200 dark:border-white/10 mt-8"
      style={{ textAlign: 'center' }}
    >
      {/* Liability disclaimer */}
      <p className="text-[10px] leading-relaxed mb-4 mx-auto max-w-sm" style={{ color: 'var(--text-secondary)', opacity: 0.7 }}>
        {lang === 'es'
          ? 'Los protocolos de GONR son solo para fines informativos y no constituyen asesoramiento profesional. Siempre pruebe en un área no visible antes de tratar cualquier prenda. GONR Labs LLC no se responsabiliza por daños a prendas, telas o materiales resultantes del uso de cualquier protocolo, recomendación o contenido generado por IA.'
          : 'GONR protocols are informational only and do not constitute professional advice. Always test on an inconspicuous area before treating any garment. GONR Labs LLC is not liable for damage to garments, fabrics, or materials resulting from the use of any protocol, recommendation, or AI-generated content.'}
      </p>

      <p className="text-xs font-semibold mb-3" style={{ color: 'var(--text-secondary)' }}>
        GONR Labs LLC
      </p>

      <div className="flex items-center justify-center gap-2 flex-nowrap">
        <Link href="/privacy" className="hover:underline whitespace-nowrap" style={{ color: 'var(--text-secondary)', fontSize: '11px' }}>
          {lang === 'es' ? 'Privacidad' : 'Privacy'}
        </Link>
        <span style={{ color: 'var(--text-secondary)', fontSize: '10px' }}>·</span>
        <Link href="/terms" className="hover:underline whitespace-nowrap" style={{ color: 'var(--text-secondary)', fontSize: '11px' }}>
          {lang === 'es' ? 'Términos' : 'Terms'}
        </Link>
        <span style={{ color: 'var(--text-secondary)', fontSize: '10px' }}>·</span>
        <Link href="/partners" className="hover:underline whitespace-nowrap" style={{ color: 'var(--text-secondary)', fontSize: '11px' }}>
          {lang === 'es' ? 'Socios' : 'Brand Partners'}
        </Link>
        <span style={{ color: 'var(--text-secondary)', fontSize: '10px' }}>·</span>
        <a href="mailto:hello@gonr.pro" className="hover:underline whitespace-nowrap" style={{ color: 'var(--text-secondary)', fontSize: '11px' }}>
          {lang === 'es' ? 'Contacto' : 'Contact'}
        </a>
      </div>

      <p className="text-[10px] mt-3" style={{ color: 'var(--text-secondary)', opacity: 0.5 }}>
        © {new Date().getFullYear()} GONR Labs LLC. {lang === 'es' ? 'Todos los derechos reservados.' : 'All rights reserved.'}
      </p>
    </footer>
  )
}
