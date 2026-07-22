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

export function CrewLanguageProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<CrewLang>('en');

  // Read the saved preference after mount only — keeps SSR/client markup in sync on first paint.
  useEffect(() => {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    if (stored === 'en' || stored === 'vn') setLangState(stored);
  }, []);

  const setLang = (next: CrewLang) => {
    setLangState(next);
    window.localStorage.setItem(STORAGE_KEY, next);
  };

  return <CrewLanguageContext.Provider value={{ lang, setLang }}>{children}</CrewLanguageContext.Provider>;
}

/** Falls back to English if ever rendered outside the provider, rather than throwing. */
export function useCrewLanguage(): CrewLanguageContextValue {
  const ctx = useContext(CrewLanguageContext);
  return ctx ?? { lang: 'en', setLang: () => {} };
}
