/** Shown while a page is waiting on the Anim8 KPI project in Asana. */

export function AsanaLoadingStatus({
  title,
  detail,
  layout = 'banner',
}: {
  title: string;
  detail: string;
  layout?: 'banner' | 'page';
}) {
  if (layout === 'page') {
    return (
      <div
        className="flex min-h-[50vh] flex-col items-center justify-center gap-4 text-center"
        role="status"
        aria-live="polite"
      >
        <span
          className="h-9 w-9 animate-spin rounded-full border-2 border-white/15 border-t-brand-cyan"
          aria-hidden
        />
        <p className="text-sm font-black uppercase tracking-widest text-white">{title}</p>
        <p className="max-w-sm text-sm leading-relaxed text-[#8b95a8]">{detail}</p>
      </div>
    );
  }

  return (
    <div
      className="flex items-center gap-3 rounded-lg border border-brand-cyan/30 bg-brand-cyan/10 px-4 py-3"
      role="status"
      aria-live="polite"
    >
      <span
        className="h-5 w-5 shrink-0 animate-spin rounded-full border-2 border-white/20 border-t-brand-cyan"
        aria-hidden
      />
      <div>
        <p className="text-sm font-bold text-white">{title}</p>
        <p className="text-xs leading-relaxed text-[#8b95a8]">{detail}</p>
      </div>
    </div>
  );
}
