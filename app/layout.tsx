import type { Metadata } from 'next'
import './globals.css'
import { cookies, headers } from 'next/headers'
import Nav from '@/components/layout/Nav'
import Header from '@/components/layout/Header'
import Footer from '@/components/layout/Footer'
import HtmlLangSetter from '@/components/layout/HtmlLangSetter'
import PreviewBanner from '@/components/ui/PreviewBanner'
import { LanguageProvider } from '@/lib/i18n/LanguageContext'
import { AuthProvider } from '@/lib/auth/AuthContext'

export async function generateMetadata(): Promise<Metadata> {
  const host = (await headers()).get('host')?.split(':')[0]?.toLowerCase()
  const isSpottingBoardHost = host === 'spottingboard.com' || host === 'www.spottingboard.com'
  const gonrTitle = 'GONR — Know what to do. Know what not to.'
  const gonrDescription = 'Show us the stain. GONR reads what it can and asks only what matters.'
  const gonrShareImage = '/og-image-20260609.png'

  if (isSpottingBoardHost) {
    return {
      metadataBase: new URL('https://spottingboard.com'),
      title: 'Spotting Board — Plant Brain Workbench',
      description: 'Private plant brain workbench for dry cleaners.',
      openGraph: {
        title: 'Spotting Board — Plant Brain Workbench',
        description: 'Private plant brain workbench for dry cleaners.',
        url: 'https://spottingboard.com',
        siteName: 'Spotting Board',
        type: 'website',
      },
      twitter: {
        card: 'summary',
        title: 'Spotting Board — Plant Brain Workbench',
        description: 'Private plant brain workbench for dry cleaners.',
      },
    }
  }

  return {
    metadataBase: new URL('https://gonr.app'),
    title: gonrTitle,
    description: gonrDescription,
    icons: {
      icon: [
        { url: '/brand/gonr-o-icon.png', type: 'image/png' },
        { url: '/favicon.svg', type: 'image/svg+xml' },
      ],
      shortcut: '/favicon.ico',
      apple: '/brand/gonr-o-icon.png',
    },
    openGraph: {
      title: gonrTitle,
      description: gonrDescription,
      url: 'https://gonr.app/solve-v2',
      siteName: 'GONR™',
      images: [{ url: gonrShareImage, width: 1200, height: 630 }],
      type: 'website',
    },
    twitter: {
      card: 'summary_large_image',
      title: gonrTitle,
      description: gonrDescription,
      images: [gonrShareImage],
    },
  }
}

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const host = (await headers()).get('host')?.split(':')[0]?.toLowerCase()
  const isSpottingBoardHost = host === 'spottingboard.com' || host === 'www.spottingboard.com'

  // Server-read the persisted language cookie so the FIRST paint is rendered in
  // the user's language (the server can't read localStorage, but it can read
  // this cookie, which setLang mirrors). This makes the server, the html lang
  // attribute, and the provider's first client render all agree — removing the
  // one-frame English flash on a fresh/direct /solve-v2 (or subroute) load.
  const langCookie = (await cookies()).get('gonr_lang')?.value
  const initialLang = langCookie === 'es' ? 'es' : 'en'

  return (
    <html lang={initialLang} suppressHydrationWarning>
      <body className="font-sans antialiased">
        <AuthProvider>
          <LanguageProvider initialLang={initialLang}>
            <HtmlLangSetter />
            <PreviewBanner />
            <Header brand={isSpottingBoardHost ? 'spottingboard' : 'gonr'} />
            <main className="px-4 pt-2 pb-4">
              {children}
            </main>
            <Footer brand={isSpottingBoardHost ? 'spottingboard' : 'gonr'} />
            <Nav brand={isSpottingBoardHost ? 'spottingboard' : 'gonr'} />
          </LanguageProvider>
        </AuthProvider>
        <script dangerouslySetInnerHTML={{ __html: `
          (function() {
            var t = localStorage.getItem('gonr_theme');
            if (t === 'dark') {
              document.documentElement.classList.add('dark');
            }
          })();
        `}} />
      </body>
    </html>
  )
}
