'use client'

import { useEffect, useState, useCallback } from 'react'
import Link from 'next/link'
import {
  getStoredConsent,
  saveConsent,
  SHOW_COOKIE_BANNER_EVENT,
  COOKIE_CONSENT_CHANGED_EVENT,
  type CookieConsentChoice,
} from '@/lib/cookie-consent'

export function CookieBanner() {
  const [mounted, setMounted] = useState(false)
  const [visible, setVisible] = useState(false)

  const dismiss = useCallback((choice: CookieConsentChoice) => {
    saveConsent(choice)
    setVisible(false)
    window.dispatchEvent(
      new CustomEvent(COOKIE_CONSENT_CHANGED_EVENT, { detail: { choice } })
    )
  }, [])

  useEffect(() => {
    setMounted(true)
    if (!getStoredConsent()) setVisible(true)

    const open = () => setVisible(true)
    window.addEventListener(SHOW_COOKIE_BANNER_EVENT, open)
    return () => window.removeEventListener(SHOW_COOKIE_BANNER_EVENT, open)
  }, [])

  if (!mounted || !visible) return null

  return (
    <div
      className="fixed inset-x-0 bottom-0 z-[9990] px-4 pb-4 pt-2 sm:px-6 sm:pb-6 pointer-events-none"
      style={{ paddingBottom: 'max(1rem, env(safe-area-inset-bottom))' }}
    >
      <div
        role="dialog"
        aria-modal="false"
        aria-labelledby="cookie-banner-title"
        aria-describedby="cookie-banner-desc"
        className="pointer-events-auto mx-auto max-w-3xl rounded-2xl border border-white/10 border-t-brand-lime/30 bg-brand-navy/95 shadow-[0_-8px_40px_rgba(0,0,0,0.35)] backdrop-blur-xl"
      >
        <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-brand-cyan/40 to-transparent" />

        <div className="p-5 sm:p-6">
          <p
            id="cookie-banner-title"
            className="text-[11px] font-bold uppercase tracking-[0.2em] text-brand-lime mb-2 font-mono"
          >
            Cookies & privacy
          </p>
          <p id="cookie-banner-desc" className="text-sm text-text-muted leading-relaxed mb-5">
            We use cookies and similar technologies to operate this site, remember your choices, and
            — if you agree — to measure and improve performance. Essential cookies are always on.
            Read our{' '}
            <Link
              href="/privacy"
              className="text-brand-cyan underline decoration-brand-cyan/40 underline-offset-2 hover:text-brand-lime hover:decoration-brand-lime/50 transition-colors"
            >
              Privacy &amp; Cookie Policy
            </Link>
            .
          </p>

          <div className="flex flex-col-reverse sm:flex-row sm:flex-wrap sm:items-center gap-3 sm:justify-end">
            <button
              type="button"
              onClick={() => dismiss('essential')}
              className="w-full sm:w-auto px-5 py-2.5 rounded-lg border border-white/15 text-text text-xs font-bold uppercase tracking-widest hover:bg-white/5 hover:border-white/25 transition-colors font-mono"
            >
              Essential only
            </button>
            <button
              type="button"
              onClick={() => dismiss('all')}
              className="w-full sm:w-auto px-5 py-2.5 rounded-lg bg-brand-lime text-brand-black text-xs font-bold uppercase tracking-widest hover:bg-brand-lime/90 transition-colors font-mono shadow-[0_0_24px_rgba(124,193,66,0.25)]"
            >
              Accept all
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
