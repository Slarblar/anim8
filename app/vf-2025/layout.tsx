import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'VeeFriends Character Production Proposal | Anim-8',
  description: 'Confidential character production proposal for VeeFriends. Production-ready 3D characters in 3-4 days.',
  robots: {
    index: false,
    follow: false,
    googleBot: {
      index: false,
      follow: false,
    },
  },
  openGraph: {
    title: 'VeeFriends Proposal - Anim-8',
    description: 'Confidential proposal for VeeFriends character production',
    images: ['/images/anim8card.jpg'],
    type: 'website',
  },
}

export default function VeeFriendsLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return <>{children}</>
}

