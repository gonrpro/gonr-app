import type { Metadata } from 'next'
import './globals.css'
import { headers } from 'next/headers'
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

  if (isSpottingBoardHost) {
    return {
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
    title: 'GONR Pretreat — On-the-Go Stain & Odor Relief',
    description: 'Single-use pretreat and laundry booster packets for the sweatiest, smelliest, stainiest loads. Join the waitlist.',
    icons: {
      icon: '/assets/favicon-32.png',
      apple: '/assets/apple-touch-icon.png',
    },
    openGraph: {
      title: 'GONR Pretreat — On-the-Go Stain & Odor Relief',
      description: 'Single-use pretreat and laundry booster packets for the sweatiest, smelliest, stainiest loads. Join the waitlist.',
      url: 'https://gonr.app',
      siteName: 'GONR™',
      images: [{ url: '/assets/og-image.jpg', width: 1200, height: 630 }],
      type: 'website',
    },
    twitter: {
      card: 'summary_large_image',
      title: 'GONR Pretreat — On-the-Go Stain & Odor Relief',
      description: 'Single-use pretreat and laundry booster packets for the sweatiest, smelliest, stainiest loads. Join the waitlist.',
      images: ['/assets/og-image.jpg'],
    },
  }
}

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const host = (await headers()).get('host')?.split(':')[0]?.toLowerCase()
  const isSpottingBoardHost = host === 'spottingboard.com' || host === 'www.spottingboard.com'

  return (
    <html lang="en" suppressHydrationWarning>
      <body className="font-sans antialiased">
        <AuthProvider>
          <LanguageProvider>
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
