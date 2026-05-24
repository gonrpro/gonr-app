import type { ReactNode } from 'react'
import { Nunito_Sans } from 'next/font/google'
import ConsumerShellChrome from '@/components/consumer/ConsumerShellChrome'

// Brand type direction from the kit (Nunito Sans). Scoped to the consumer shell
// only; the rest of the app keeps its existing theme/font.
const nunito = Nunito_Sans({
  subsets: ['latin'],
  weight: ['400', '600', '700', '800', '900'],
  variable: '--font-nunito',
  display: 'swap',
})

export default function ConsumerShellLayout({ children }: { children: ReactNode }) {
  return (
    <div className={`${nunito.variable} gonr-consumer`} style={{ minHeight: '100dvh' }}>
      <ConsumerShellChrome />
      {children}
    </div>
  )
}
