import type { Metadata } from 'next'
import './globals.css'
import { CookieBanner } from '@/components/ui/CookieBanner'

export const metadata: Metadata = {
  icons: {
    icon: '/images/favicon-anim-8-01.svg',
    shortcut: '/images/favicon-anim-8-01.svg',
  },
  title: 'Anim-8 | 3D Creative Studio for Brands & IP',
  description: 'Anim-8 is a full-pipeline 3D creative studio helping brands and IP owners develop characters, worlds, and assets — from concept to production-ready. Led by RTFKT co-founder Chris Le.',
  keywords: ['3D characters', 'character production', 'IP development', 'brand characters', 'character modeling', 'rigging', 'animation', 'entertainment studio', 'RTFKT'],
  authors: [{ name: 'Anim-8' }],
  creator: 'Anim-8',
  openGraph: {
    type: 'website',
    locale: 'en_US',
    title: 'Anim-8 | 3D Creative Studio for Brands & IP',
    description: 'Full-pipeline 3D creative studio helping brands and IP owners develop characters, worlds, and assets — from concept to production-ready.',
    siteName: 'Anim-8',
    images: ['/images/anim8card.jpg'],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Anim-8 | 3D Creative Studio for Brands & IP',
    description: 'Full-pipeline 3D creative studio helping brands and IP owners develop characters, worlds, and assets — from concept to production-ready.',
    images: ['/images/anim8card.jpg'],
  },
  robots: {
    index: true,
    follow: true,
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <head>
        <link rel="stylesheet" href="https://use.typekit.net/yde3ltr.css" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Be+Vietnam+Pro:ital,wght@0,300;0,400;0,500;0,600;0,700;0,800;0,900;1,400&display=swap" rel="stylesheet" />
        <link href="https://fonts.googleapis.com/css2?family=Jost:ital,wght@0,300;0,400;0,500;0,600;0,700;0,800;0,900;1,300&display=swap" rel="stylesheet" />
      </head>
      <body>
        {children}
        <CookieBanner />
      </body>
    </html>
  )
}

