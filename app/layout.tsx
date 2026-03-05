import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Anim-8 | 3D Character Production Studio',
  description: 'Full-pipeline 3D character studio specializing in modeling, rigging, animation, and rendering — for IP owners, gaming studios, and entertainment brands. Led by RTFKT co-founder Chris Le.',
  keywords: ['3D characters', 'character production', 'character modeling', 'rigging', 'animation', 'IP development', 'gaming studio', 'RTFKT'],
  authors: [{ name: 'Anim-8' }],
  creator: 'Anim-8',
  openGraph: {
    type: 'website',
    locale: 'en_US',
    title: 'Anim-8 | 3D Character Production Studio',
    description: 'Production-ready 3D characters for IP owners, gaming studios, and entertainment brands.',
    siteName: 'Anim-8',
    images: ['/images/anim8card.jpg'],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Anim-8 | 3D Character Production Studio',
    description: 'Production-ready 3D characters for IP owners, gaming studios, and entertainment brands.',
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
        <link href="https://fonts.googleapis.com/css2?family=Be+Vietnam+Pro:wght@700;800;900&display=swap" rel="stylesheet" />
      </head>
      <body>
        {children}
      </body>
    </html>
  )
}

