import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Careers — Anim-8',
  description: 'Join the Anim-8 team. Open roles in design, 3D modeling, and visual storytelling. Based in Ho Chi Minh City, working with U.S. clients on global projects.',
}

export default function CareersLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <link rel="preconnect" href="https://fonts.googleapis.com" />
      <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
      <link
        href="https://fonts.googleapis.com/css2?family=Be+Vietnam+Pro:wght@700;800;900&display=swap"
        rel="stylesheet"
      />
      {children}
    </>
  )
}
