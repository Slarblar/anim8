/**
 * Cookie / storage consent (GDPR-style). Preference is stored in localStorage.
 * Listen for `anim8-cookie-consent-changed` on `window` to load optional scripts (e.g. analytics).
 */

export const COOKIE_CONSENT_STORAGE_KEY = 'anim8.cookieConsent'

/** Bump when policy or categories change so users see the banner again. */
export const COOKIE_CONSENT_VERSION = 1

export type CookieConsentChoice = 'essential' | 'all'

export interface StoredCookieConsent {
  version: number
  choice: CookieConsentChoice
  updatedAt: string
}

export function getStoredConsent(): StoredCookieConsent | null {
  if (typeof window === 'undefined') return null
  try {
    const raw = localStorage.getItem(COOKIE_CONSENT_STORAGE_KEY)
    if (!raw) return null
    const p = JSON.parse(raw) as Partial<StoredCookieConsent>
    if (p.version !== COOKIE_CONSENT_VERSION || (p.choice !== 'essential' && p.choice !== 'all')) {
      return null
    }
    return {
      version: p.version,
      choice: p.choice,
      updatedAt: typeof p.updatedAt === 'string' ? p.updatedAt : new Date().toISOString(),
    }
  } catch {
    return null
  }
}

export function saveConsent(choice: CookieConsentChoice): void {
  const payload: StoredCookieConsent = {
    version: COOKIE_CONSENT_VERSION,
    choice,
    updatedAt: new Date().toISOString(),
  }
  localStorage.setItem(COOKIE_CONSENT_STORAGE_KEY, JSON.stringify(payload))
}

/** Re-open the banner (e.g. from Privacy page). */
export const SHOW_COOKIE_BANNER_EVENT = 'anim8-show-cookie-banner'

export const COOKIE_CONSENT_CHANGED_EVENT = 'anim8-cookie-consent-changed'
