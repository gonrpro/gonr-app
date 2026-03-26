import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import Nav from '@/components/layout/Nav'
import Header from '@/components/layout/Header'
import Footer from '@/components/layout/Footer'
import { LanguageProvider } from '@/lib/i18n/LanguageContext'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'GONR — AI Stain Intelligence for Textile Professionals',
  description: 'Professional stain removal protocols powered by AI. Built by a 3rd-generation dry cleaner. Scan a stain, get a protocol in seconds.',
  keywords: ['stain removal', 'dry cleaning', 'textile care', 'spotting protocol', 'AI stain guide', 'dry cleaner app', 'professional spotting'],
  authors: [{ name: 'GONR Labs LLC' }],
  metadataBase: new URL('https://gonr.app'),
  alternates: {
    canonical: 'https://gonr.app',
  },
  openGraph: {
    title: 'GONR — AI Stain Intelligence for Textile Professionals',
    description: 'Scan a stain. Get a professional protocol in seconds. Built by a 3rd-generation dry cleaner.',
    url: 'https://gonr.app',
    siteName: 'GONR',
    locale: 'en_US',
    type: 'website',
    images: [{ url: 'https://gonr.app/og-image.png', width: 1536, height: 1024, alt: 'GONR — AI Stain Intelligence' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'GONR — AI Stain Intelligence',
    description: 'Professional stain removal protocols powered by AI. Built by a 3rd-generation dry cleaner.',
    site: '@gonrlabs',
    images: ['https://gonr.app/og-image.png'],
  },
  icons: {
    icon: '/favicon.svg',
    shortcut: '/favicon.svg',
    apple: '/favicon.svg',
  },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${inter.className} antialiased`}>
        <LanguageProvider>
          <Header />
          <main className="px-4 pt-2 pb-4">
            {children}
          </main>
          <Footer />
          <Nav />
        </LanguageProvider>
        {/* Theme init script — runs before paint to avoid flash */}
        <script dangerouslySetInnerHTML={{ __html: `
          (function() {
            var t = localStorage.getItem('gonr_theme');
            if (t === 'dark' || (!t && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
              document.documentElement.classList.add('dark');
            }
          })();
        `}} />
      </body>
    </html>
  )
}
