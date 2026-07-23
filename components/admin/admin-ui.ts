/** Shared Tailwind classes for /admin and /crew — dark, functional, no marketing flourish. */

export const adminCard = 'glass-card p-5 min-[480px]:p-6';

export const adminSectionTitle = 'text-white text-lg md:text-xl font-black uppercase tracking-tight';

export const adminBody = 'text-[#8b95a8] text-sm leading-relaxed';

export const adminLabel =
  'block text-[10px] font-bold uppercase tracking-widest text-[#8b95a8] font-mono mb-1.5';

export const adminInput =
  'w-full rounded-lg border border-white/10 bg-white/[0.03] px-3.5 py-2.5 text-sm text-white placeholder:text-text-muted/50 outline-none transition focus:border-brand-cyan/40 focus:ring-2 focus:ring-brand-cyan/15';

/**
 * `<select>`'s closed box can be fully themed with plain classes, but the
 * *open* option list is drawn by the OS/browser, not by us — no amount of
 * Tailwind reaches it. `color-scheme: dark` (set globally in globals.css)
 * is what actually makes that native popup render dark instead of the
 * jarring default white box; this class just strips the native arrow
 * (`appearance-none`) so we can swap in our own via `adminSelectChevronStyle`
 * below, since the native one doesn't match once color-scheme changes it.
 */
export const adminSelect = `${adminInput} appearance-none cursor-pointer pr-9`;

/** Spread onto the `style` prop (not a Tailwind class) so the data-URI SVG doesn't have to survive Tailwind's arbitrary-value parsing. Pair with `adminSelect`. */
export const adminSelectChevronStyle = {
  backgroundImage:
    "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 12 8' fill='none'%3E%3Cpath d='M1 1l5 5 5-5' stroke='%2338c2d6' stroke-width='1.7' stroke-linecap='round' stroke-linejoin='round'/%3E%3C/svg%3E\")",
  backgroundRepeat: 'no-repeat',
  backgroundPosition: 'right 0.9rem center',
  backgroundSize: '11px 7px',
} as const;

/** Checkboxes: `accent-*` colors the native check/box itself (works alongside `color-scheme: dark` for the unchecked state) — much less code than a fully custom checkbox component for the handful we have. */
export const adminCheckbox =
  'h-4 w-4 shrink-0 cursor-pointer rounded border-white/20 bg-white/5 accent-[#38c2d6] focus:outline-none focus:ring-2 focus:ring-brand-cyan/30';

export const adminBtnPrimary =
  'inline-flex shrink-0 items-center justify-center rounded-lg border border-brand-cyan/50 bg-brand-cyan px-4 py-2.5 text-sm font-bold text-white shadow-[0_4px_20px_rgba(56,194,214,0.25)] transition hover:brightness-110 disabled:opacity-50';

export const adminBtnSecondary =
  'inline-flex shrink-0 items-center justify-center rounded-lg border-2 border-white/20 bg-white/5 px-4 py-2.5 text-sm font-semibold text-white transition hover:border-white/40 hover:bg-white/10 disabled:opacity-50';

export const adminBtnDanger =
  'inline-flex shrink-0 items-center justify-center rounded-lg border border-brand-pink/40 bg-brand-pink/10 px-4 py-2.5 text-sm font-bold text-brand-pink transition hover:border-brand-pink/55 hover:bg-brand-pink/15 disabled:opacity-50';

export const adminBtnGhost =
  'inline-flex shrink-0 items-center justify-center rounded-md border border-white/15 px-3 py-1.5 text-xs font-semibold text-white transition hover:border-white/35 disabled:opacity-50';

export const adminBadgeActive =
  'rounded-full border border-brand-lime/30 bg-brand-lime/10 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-brand-lime font-mono';

export const adminBadgeInactive =
  'rounded-full border border-white/15 bg-white/5 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-text-muted font-mono';

export const adminBadgePending =
  'rounded-full border border-brand-cyan/30 bg-brand-cyan/10 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-brand-cyan font-mono';

export const adminBadgeApproved =
  'rounded-full border border-brand-lime/30 bg-brand-lime/10 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-brand-lime font-mono';

export const adminBadgeRejected =
  'rounded-full border border-brand-pink/30 bg-brand-pink/10 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-brand-pink font-mono';

export const adminAlertError =
  'rounded-lg border border-brand-pink/30 bg-brand-pink/10 px-4 py-3 text-sm text-red-100';

export const adminAlertSuccess =
  'rounded-lg border border-brand-lime/30 bg-brand-lime/10 px-4 py-3 text-sm text-brand-lime';
