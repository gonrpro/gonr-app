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
    title: 'GONR™ — Professional Stain Protocols',
    description: 'Professional stain-removal protocols built from real dry-cleaning experience.',
    icons: {
      icon: "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 512 512'%3E%3Crect width='512' height='512' rx='96' fill='%230A0A0A'/%3E%3Cg transform='translate(270,256)'%3E%3Cpath d='M74-76L36-38C20-56-2-68-30-68C-80-68-108-30-108 8C-108 46-80 84-30 84C0 84 20 70 30 44L30 28L-22 28L-22-8L84-8L84 60C62 110 22 138-30 138C-118 138-166 74-166 8C-166-58-118-122-30-122C16-122 46-106 74-76Z' fill='%233f7f52'/%3E%3C/g%3E%3C/svg%3E"
    },
    openGraph: {
      title: 'GONR™ — Professional Stain Protocols',
      description: 'Professional stain-removal protocols built from real dry-cleaning experience.',
      url: 'https://gonr.app',
      siteName: 'GONR™',
      images: [{ url: '/og-image.png', width: 1200, height: 630 }],
      type: 'website',
    },
    twitter: {
      card: 'summary_large_image',
      title: 'GONR™ — Professional Stain Protocols',
      description: 'Professional stain-removal protocols built from real dry-cleaning experience.',
      images: ['/og-image.png'],
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
