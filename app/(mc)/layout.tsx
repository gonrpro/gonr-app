import type { Metadata } from 'next'
import '../globals.css'

export const metadata: Metadata = {
  title: 'GONR Mission Control',
}

export default function MCLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="font-sans antialiased bg-[#0a0e14] text-gray-100">
        {children}
      </body>
    </html>
  )
}
