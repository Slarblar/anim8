import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Anim-8 | Character Production for AI & Web3',
  description: 'Production-ready 3D characters in 3-4 days. Led by RTFKT co-founder Chris Le. Specialized in developing social and community-based IP.',
  keywords: ['3D characters', 'character production', 'AI training', 'Web3', 'NFT', 'VeeFriends', 'RTFKT'],
  authors: [{ name: 'Anim-8' }],
  creator: 'Anim-8',
  openGraph: {
    type: 'website',
    locale: 'en_US',
    title: 'Anim-8 | Character Production',
    description: 'Production-ready 3D characters for AI & Web3',
    siteName: 'Anim-8',
    images: ['/images/anim8card.jpg'],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Anim-8 | Character Production',
    description: 'Production-ready 3D characters for AI & Web3',
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
      </head>
      <body>
        {children}
      </body>
    </html>
  )
}

