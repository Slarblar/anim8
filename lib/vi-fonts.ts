/**
 * Vietnamese UI font stacks for /crew (and careers VN mode).
 * System UI fonts render diacritics reliably on Windows (Segoe UI / Segoe UI Mono).
 * Web faces like Futura or Be Vietnam Pro can still produce mixed glyphs when loading
 * or when Typekit is on the page — prefer these stacks for VN copy.
 */
export const crewViSansStack =
  'ui-sans-serif, system-ui, "Segoe UI", "Segoe UI Variable", "Helvetica Neue", Arial, sans-serif';

export const crewViMonoStack =
  'ui-monospace, "Cascadia Code", "Segoe UI Mono", Menlo, monospace';
