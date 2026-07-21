/** Shared Tailwind classes for client portal pages — matches main site / privacy patterns. */

export const portalEyebrow =
  'text-brand-lime text-xs font-bold uppercase tracking-[0.2em] font-mono';

export const portalPageTitle =
  'text-white text-[clamp(1.625rem,5vw,2.5rem)] font-black uppercase tracking-tight leading-[1.05]';

export const portalSectionTitle =
  'text-white text-base min-[480px]:text-lg md:text-xl font-black uppercase tracking-tight';

export const portalBody = 'text-[#8b95a8] text-sm min-[480px]:text-[0.9375rem] leading-relaxed';

export const portalLabel =
  'block text-[10px] min-[480px]:text-xs font-bold uppercase tracking-widest text-[#8b95a8] font-mono';

export const portalInput =
  'portal-input mt-2 w-full rounded-lg border border-white/10 bg-white/[0.03] px-3.5 py-2.5 min-[480px]:px-4 min-[480px]:py-3 text-sm text-text placeholder:text-text-muted/50 outline-none transition-[border-color,box-shadow,background-color,transform] duration-300 ease-out focus:border-brand-lime/40 focus:ring-2 focus:ring-brand-lime/15 focus:bg-white/[0.05]';

export const portalTaskCard = 'glass-card p-4 min-[480px]:p-5 md:p-6';

export const portalAlertSuccess =
  'rounded-[20px] border border-brand-lime/30 bg-brand-lime/10 px-5 py-4 text-sm text-brand-lime';

export const portalAlertError =
  'rounded-[20px] border border-brand-pink/30 bg-brand-pink/10 px-5 py-4 text-sm text-red-100';

export const portalAlertWarning =
  'rounded-[20px] border border-brand-cyan/30 bg-brand-cyan/10 px-5 py-4 text-sm text-cyan-100';

export const portalBackLink =
  'text-xs font-bold uppercase tracking-widest text-brand-cyan transition hover:text-brand-lime font-mono';

/** Primary CTA — Anim-8 cyan with white text. */
export const portalBtnPrimary =
  'portal-btn-primary inline-flex w-full min-[480px]:w-auto shrink-0 items-center justify-center rounded-lg border border-brand-cyan/50 bg-brand-cyan px-4 py-2.5 min-[480px]:px-5 text-xs min-[480px]:text-sm font-bold text-white shadow-[0_4px_20px_rgba(56,194,214,0.35)] transition hover:brightness-110 focus-lime';

export const portalBtnSecondary =
  'inline-flex w-full min-[480px]:w-auto shrink-0 items-center justify-center rounded-lg border-2 border-white/25 bg-white/5 px-4 py-2.5 min-[480px]:px-5 text-xs min-[480px]:text-sm font-semibold text-white transition hover:border-white/40 hover:bg-white/10 focus-lime';

export const portalBtnDanger =
  'inline-flex w-full min-[480px]:w-auto shrink-0 items-center justify-center rounded-lg border border-brand-pink/40 bg-brand-pink/10 px-4 py-2.5 min-[480px]:px-5 text-xs min-[480px]:text-sm font-bold text-brand-pink transition hover:border-brand-pink/55 hover:bg-brand-pink/15 focus-lime disabled:opacity-50';

/** High-visibility callout for booking instructions. */
export const portalCallout =
  'rounded-[20px] border-2 border-brand-cyan/40 bg-brand-cyan/10 px-5 py-4 text-sm leading-relaxed text-white';

export function pipelineBadgeClass(pipeline: 'Production' | 'Design'): string {
  return pipeline === 'Production'
    ? 'rounded-full border border-brand-cyan/30 bg-brand-cyan/10 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-brand-cyan font-mono'
    : 'rounded-full border border-brand-pink/30 bg-brand-pink/10 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-brand-pink font-mono';
}

export const portalStatusBadge =
  'rounded-full border border-brand-lime/30 bg-brand-lime/10 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-brand-lime font-mono';

/** Animated lime→cyan fill for portal task progress bars. */
export const portalProgressFill =
  'portal-progress-fill h-full rounded-full transition-[width] duration-500 ease-out';
