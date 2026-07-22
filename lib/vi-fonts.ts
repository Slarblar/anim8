/**
 * Vietnamese UI font stacks for /crew (and careers VN mode).
 * Segoe UI Mono on Windows is the most reliable for diacritics — proportional
 * Futura / web sans stacks still produce mixed glyphs when Typekit is loaded.
 */
export const crewViMonoStack =
  'ui-monospace, "Cascadia Code", "Segoe UI Mono", Menlo, Consolas, monospace';

/** @deprecated Prefer crewViMonoStack — sans stack still conflicted with Futura on headings. */
export const crewViSansStack =
  'ui-sans-serif, system-ui, "Segoe UI", "Segoe UI Variable", "Helvetica Neue", Arial, sans-serif';
