import type { Metadata } from 'next'
import { Geist } from 'next/font/google'
import { Toaster } from '@/components/ui/sonner'
import { Providers } from '@/components/providers'
import './globals.css'

const geist = Geist({ subsets: ['latin'], variable: '--font-sans' })

export const metadata: Metadata = {
  title: 'Earmarked — Find cheap used books',
  description: 'Build a list of books, find cheap used copies, minimize cost by grouping sellers.',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${geist.variable} antialiased`}>
        <Providers>
          {children}
          <Toaster />
        </Providers>
      </body>
    </html>
  )
}
