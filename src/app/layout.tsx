import type { Metadata } from 'next'
import { Inter, Bricolage_Grotesque } from 'next/font/google'
import './globals.css'

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
})

// Brand wordmark font: bold grotesque with an optical-size axis, so it stays crisp at huge display sizes
const brand = Bricolage_Grotesque({
  subsets: ['latin'],
  variable: '--font-brand',
  axes: ['opsz'],
  display: 'swap',
})

export const metadata: Metadata = {
  title: 'lockdin',
  description: 'Focus together.',
  icons: {
    icon: '/favicon.svg',
    shortcut: '/favicon.svg',
  },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning className={`${inter.variable} ${brand.variable}`}>
      <body>{children}</body>
    </html>
  )
}
