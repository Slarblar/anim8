'use client'

import { SHOW_COOKIE_BANNER_EVENT } from '@/lib/cookie-consent'

export function CookieSettingsButton() {
  return (
    <button
      type="button"
      onClick={() => window.dispatchEvent(new Event(SHOW_COOKIE_BANNER_EVENT))}
      className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg border border-brand-cyan/40 text-brand-cyan text-xs font-bold uppercase tracking-widest hover:bg-brand-cyan/10 hover:border-brand-cyan/60 transition-colors font-mono"
    >
      Cookie settings
    </button>
  )
}
