'use client';

import { useCrewLanguage, type CrewLang } from '@/lib/crew-language';

/** Same pill style as the /careers language switch, for visual consistency across the site. */
export function CrewLanguageToggle() {
  const { lang, setLang } = useCrewLanguage();

  return (
    <div className="flex items-center gap-1 rounded-full border border-white/10 bg-white/5 p-1">
      {(['en', 'vn'] as CrewLang[]).map((l) => (
        <button
          key={l}
          type="button"
          onClick={() => setLang(l)}
          aria-pressed={lang === l}
          className={`rounded-full px-3 py-1 text-[11px] font-bold uppercase tracking-widest transition-all duration-200 ${
            lang === l ? 'bg-brand-lime text-brand-black shadow-sm' : 'text-text-muted hover:text-white'
          }`}
        >
          {l === 'en' ? 'EN' : 'VN'}
        </button>
      ))}
    </div>
  );
}
