import type { Metadata } from 'next'
import localFont from 'next/font/local'

// Bundled files, so the production build does not fetch Google Fonts.
const dmSans = localFont({
  src: './fonts/dm-sans-latin.woff2',
  weight: '300 500',
  style: 'normal',
  display: 'swap',
  variable: '--font-invita-dm',
})

const cormorant = localFont({
  src: [
    {
      path: './fonts/cormorant-latin.woff2',
      weight: '300 400',
      style: 'normal',
    },
    {
      path: './fonts/cormorant-latin-italic.woff2',
      weight: '300 400',
      style: 'italic',
    },
  ],
  display: 'swap',
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
