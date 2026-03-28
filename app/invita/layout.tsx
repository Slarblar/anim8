import type { Metadata } from 'next'
import { Cormorant, DM_Sans } from 'next/font/google'

const dmSans = DM_Sans({
  subsets: ['latin'],
  weight: ['300', '400', '500'],
  variable: '--font-invita-dm',
})

const cormorant = Cormorant({
  subsets: ['latin'],
  weight: ['300', '400'],
  style: ['normal', 'italic'],
  variable: '--font-invita-cormorant',
})

export const metadata: Metadata = {
  title: 'Invita — Content Portal',
  robots: {
    index: false,
    follow: false,
    googleBot: { index: false, follow: false, noarchive: true, nosnippet: true },
  },
}

export default function InvitaLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className={`${dmSans.variable} ${cormorant.variable} ${dmSans.className}`}>
      {children}
    </div>
  )
}
