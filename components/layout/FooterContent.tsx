'use client'

import Image from 'next/image'
import Link from 'next/link'
import { useLanguage } from '@/lib/i18n/LanguageContext'

// Shared footer BODY (links + liability + faded trademark mark), with no <footer>
// wrapper so it can be embedded both in the global layout <Footer> AND inside the
// consumer shell screens (which CSS-hide the global <footer> for the full-viewport
// PWA feel — see app/globals.css `body.gonr-consumer-shell > footer`). Single
// source of truth so the legal/liability/trademark copy can never drift between
// the marketing pages and the in-app home screen.
export default function FooterContent() {
  const { lang } = useLanguage()
  const year = new Date().getFullYear()

  return (
    <div style={{ textAlign: 'center' }}>
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

      {/* Strengthened liability / use-at-your-own-risk notice */}
      <p className="text-[10px] mt-4 mx-auto max-w-sm leading-relaxed" style={{ color: 'var(--text-secondary)', opacity: 0.55 }}>
        {lang === 'es'
          ? 'GONR ofrece orientación sobre manchas asistida por IA solo con fines informativos. Los resultados no están garantizados. Pruebe siempre primero en una zona poco visible. Úselo bajo su propio riesgo: GONR Labs LLC no se hace responsable de ningún daño, pérdida o resultado adverso derivado del uso de esta información.'
          : 'GONR provides AI-assisted stain guidance for informational purposes only. Results are not guaranteed. Always test on an inconspicuous area first. Use at your own risk — GONR Labs LLC is not liable for any damage, loss, or adverse outcome resulting from use of this information.'}
      </p>

      {/* Faded brand mark + trademark line */}
      <Image
        src="/brand/gonr-logo.png"
        alt="GONR"
        width={100}
        height={28}
        className="mx-auto mt-5"
        style={{ filter: 'grayscale(1)', opacity: 0.35, height: 'auto' }}
      />
      <p className="text-[10px] mt-2" style={{ color: 'var(--text-secondary)', opacity: 0.5 }}>
        {lang === 'es'
          ? `GONR™ es una marca comercial de GONR Labs LLC. © ${year} GONR Labs LLC. Todos los derechos reservados.`
          : `GONR™ is a trademark of GONR Labs LLC. © ${year} GONR Labs LLC. All rights reserved.`}
      </p>
    </div>
  )
}
