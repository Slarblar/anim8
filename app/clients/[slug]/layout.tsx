import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Client Portal | Anim-8',
  robots: {
    index: false,
    follow: false,
    googleBot: { index: false, follow: false, noarchive: true, nosnippet: true },
  },
};

export default function ClientPortalLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="client-portal-root antialiased">{children}</div>
  );
}