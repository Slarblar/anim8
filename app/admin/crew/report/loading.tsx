export default function StaffReportLoading() {
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
      <p className="text-sm font-black uppercase tracking-widest text-white">Building staff report</p>
      <p className="max-w-sm text-sm leading-relaxed text-[#8b95a8]">
        Gathering KPI, PTO, and attendance for every active crew member. This can take a moment.
      </p>
    </div>
  );
}
