import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Anim8 Studio | 3D Animation & Visual Effects',
  description: 'Professional 3D animation studio specializing in cutting-edge visual effects, motion graphics, and immersive storytelling.',
  keywords: ['3D animation', 'visual effects', 'motion graphics', 'animation studio', 'VFX'],
  authors: [{ name: 'Anim8 Studio' }],
  creator: 'Anim8 Studio',
  openGraph: {
    type: 'website',
    locale: 'en_US',
    url: 'https://anim8studio.com',
    title: 'Anim8 Studio | 3D Animation & Visual Effects',
    description: 'Professional 3D animation studio specializing in cutting-edge visual effects.',
    siteName: 'Anim8 Studio',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Anim8 Studio | 3D Animation & Visual Effects',
    description: 'Professional 3D animation studio specializing in cutting-edge visual effects.',
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

