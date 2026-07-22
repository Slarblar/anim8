'use client';

import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';

/**
 * EN/VN toggle for the /crew section — the crew is a mix of Vietnamese and
 * English speakers, so every crew-facing page can read the active language
 * from this context instead of each page re-implementing its own switch.
 */
export type CrewLang = 'en' | 'vn';

const STORAGE_KEY = 'crew-lang';

type CrewLanguageContextValue = {
  lang: CrewLang;
  setLang: (lang: CrewLang) => void;
};

const CrewLanguageContext = createContext<CrewLanguageContextValue | null>(null);

/**
 * Syncs `<html lang>` + `crew-lang-vn` so globals.css applies the system UI
 * Vietnamese stack (Segoe UI sans — same family as the reliable .font-mono).
 */
function applyHtmlLang(lang: CrewLang) {
  const root = document.documentElement;
  root.lang = lang === 'vn' ? 'vi' : 'en';
  // Class drives the Be Vietnam Pro lock in globals.css — more reliable than
  // :lang() alone, which lost to body/utility futura-pt rules and caused
  // mixed-glyph "bouncing" on Vietnamese diacritics.
  root.classList.toggle('crew-lang-vn', lang === 'vn');
}

export function CrewLanguageProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<CrewLang>('en');

  // Read the saved preference after mount only — keeps SSR/client markup in sync on first paint.
  useEffect(() => {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    if (stored === 'en' || stored === 'vn') {
      setLangState(stored);
      applyHtmlLang(stored);
    }
    // Reset the root lang when leaving the crew section so other pages
    // (which default to English markup) don't inherit a stale "vi" tag.
    return () => {
      document.documentElement.lang = 'en';
      document.documentElement.classList.remove('crew-lang-vn');
    };
  }, []);

  const setLang = (next: CrewLang) => {
    setLangState(next);
    window.localStorage.setItem(STORAGE_KEY, next);
    applyHtmlLang(next);
  };

  return <CrewLanguageContext.Provider value={{ lang, setLang }}>{children}</CrewLanguageContext.Provider>;
}

/** Falls back to English if ever rendered outside the provider, rather than throwing. */
export function useCrewLanguage(): CrewLanguageContextValue {
  const ctx = useContext(CrewLanguageContext);
  return ctx ?? { lang: 'en', setLang: () => {} };
}
