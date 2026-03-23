import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import Nav from '@/components/layout/Nav'
import Header from '@/components/layout/Header'

const inter = Inter({ subsets: ['latin'], variable: '--font-inter' })

export const metadata: Metadata = {
  title: 'GONR — AI Stain Intelligence',
  description: 'Expert stain removal protocols powered by AI. Built by a 3rd generation dry cleaner.',
  icons: {
    icon: "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 512 512'%3E%3Crect width='512' height='512' rx='96' fill='%230A0A0A'/%3E%3Cg transform='translate(270,256)'%3E%3Cpath d='M74-76L36-38C20-56-2-68-30-68C-80-68-108-30-108 8C-108 46-80 84-30 84C0 84 20 70 30 44L30 28L-22 28L-22-8L84-8L84 60C62 110 22 138-30 138C-118 138-166 74-166 8C-166-58-118-122-30-122C16-122 46-106 74-76Z' fill='%2322C55E'/%3E%3C/g%3E%3C/svg%3E"
  }
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${inter.variable} font-sans antialiased`}>
        <Header />
        <main className="px-4 pt-2 pb-4">
          {children}
        </main>
        <Nav />
        {/* Theme init script — runs before paint to avoid flash */}
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
