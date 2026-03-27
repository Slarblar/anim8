import type { Metadata } from 'next'
import Link from 'next/link'
import { CookieSettingsButton } from './CookieSettingsButton'

export const metadata: Metadata = {
  title: 'Privacy & Cookie Policy | Anim-8',
  description:
    'How Anim-8 handles personal data and cookies. Anim-8 is a 3D creative studio for brands and IP.',
  robots: { index: true, follow: true },
}

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-brand-navy text-text">
      <header className="border-b border-white/10 bg-brand-navy/80 backdrop-blur-md">
        <div className="container-custom flex items-center justify-between py-5">
          <Link href="/" className="inline-block opacity-90 hover:opacity-100 transition-opacity">
            <img
              src="/images/logos/anim-8-completewordmark-white-01.svg"
              alt="Anim-8"
              className="h-5 w-auto"
            />
          </Link>
          <Link
            href="/"
            className="text-xs font-bold uppercase tracking-widest text-brand-cyan hover:text-brand-lime transition-colors font-mono"
          >
            ← Back to site
          </Link>
        </div>
      </header>

      <main className="container-custom py-12 md:py-16 max-w-3xl">
        <h1 className="text-white text-3xl md:text-4xl font-black uppercase tracking-tight mb-3">
          Privacy &amp; cookie policy
        </h1>
        <p className="text-text-muted text-sm mb-10">
          Last updated: March 2026. This summary describes how we handle information on this
          website. For project contracts, separate terms may apply.
        </p>

        <section className="mb-10">
          <h2 className="text-brand-lime text-xs font-bold uppercase tracking-[0.2em] mb-3 font-mono">
            Who we are
          </h2>
          <p className="text-text-muted text-sm leading-relaxed">
            Anim-8 (&quot;we&quot;, &quot;us&quot;) operates this website. For privacy-related
            requests about this site, contact us at{' '}
            <a
              href="mailto:hello@anim-8.xyz"
              className="text-brand-cyan hover:text-brand-lime transition-colors"
            >
              hello@anim-8.xyz
            </a>
            .
          </p>
        </section>

        <section className="mb-10">
          <h2 className="text-brand-lime text-xs font-bold uppercase tracking-[0.2em] mb-3 font-mono">
            Cookies &amp; storage
          </h2>
          <p className="text-text-muted text-sm leading-relaxed mb-4">
            We use cookies and browser storage where needed to run the site and respect your
            choices.
          </p>
          <ul className="space-y-3 text-text-muted text-sm leading-relaxed list-disc pl-5">
            <li>
              <span className="text-white/90 font-semibold">Essential.</span> Required for basic
              functionality (for example, remembering that you have set cookie preferences). These
              are used when you choose &quot;Essential only&quot; or &quot;Accept all&quot;.
            </li>
            <li>
              <span className="text-white/90 font-semibold">Optional / analytics.</span> If you
              choose &quot;Accept all&quot;, we may load optional tools in the future to understand
              how the site is used (for example, aggregated analytics). We do not sell your personal
              data from this banner choice.
            </li>
          </ul>
        </section>

        <section className="mb-10">
          <h2 className="text-brand-lime text-xs font-bold uppercase tracking-[0.2em] mb-3 font-mono">
            Your choices
          </h2>
          <p className="text-text-muted text-sm leading-relaxed mb-4">
            You can change your mind at any time. Use the button below to reopen the cookie banner,
            or clear site data for this domain in your browser.
          </p>
          <CookieSettingsButton />
        </section>

        <section className="mb-10">
          <h2 className="text-brand-lime text-xs font-bold uppercase tracking-[0.2em] mb-3 font-mono">
            Forms &amp; third parties
          </h2>
          <p className="text-text-muted text-sm leading-relaxed">
            If you submit information through our contact or careers forms, we use that data to
            respond to your inquiry. Embedded media or third-party services (for example video
            hosts) may set their own cookies; see their respective policies.
          </p>
        </section>

        <p className="text-text-muted text-xs border-t border-white/10 pt-8">
          This page is provided for transparency. It is not legal advice; consult qualified counsel
          for your specific obligations.
        </p>
      </main>
    </div>
  )
}
