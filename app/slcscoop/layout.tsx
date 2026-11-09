import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'SLC Scoop — Partner studio',
  robots: {
    index: false,
    follow: false,
    googleBot: { index: false, follow: false, noarchive: true, nosnippet: true },
  },
};

export default function SlcScoopLayout({ children }: { children: React.ReactNode }) {
  return children;
}
