import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Careers — Anim-8',
  description: 'Join the Anim-8 team. Open roles in design, 3D modeling, and visual storytelling. Based in Ho Chi Minh City, working with U.S. clients on global projects.',
}

export default function CareersLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
