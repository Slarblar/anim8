/* Deterministic type fitting. The model never supplies sizes or coordinates. */
(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  root.ScoopFit = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  const LIMITS = {
    headline: { min: 54, max: 110, maxLines: 4 },
    dek: { min: 28, max: 40, maxLines: 4 },
    tag: { min: 14, max: 28, maxLines: 1 },
    category: { min: 18, max: 40, maxLines: 1 },
  };

  function wordsOf(text) {
    return String(text || '')
      .replace(/\s+/g, ' ')
      .trim()
      .split(' ')
      .filter(Boolean);
  }

  function variance(widths) {
    if (!widths.length) return 0;
    const mean = widths.reduce((a, b) => a + b, 0) / widths.length;
    return widths.reduce((a, w) => a + (w - mean) ** 2, 0) / widths.length;
  }

  function balanceScore(widths) {
    if (!widths || widths.length < 2) return 1;
    const mean = widths.reduce((a, b) => a + b, 0) / widths.length;
    if (mean < 1) return 1;
    return Math.max(0, 1 - Math.sqrt(variance(widths)) / mean);
  }

  /**
   * Split words into exactly lineCount lines, minimizing width variance.
   * The last line keeps at least two words whenever that is possible.
   * widthOf(line) is measured at one font size.
   */
  function balanceLines(text, lineCount, widthOf) {
    const words = wordsOf(text);
    const n = lineCount | 0;
    if (!words.length || n < 1) return null;
    if (n === 1) return [words.join(' ')];
    if (words.length < n) return null;
    if (words.length === n) return null;
    let best = null;
    function consider(lines) {
      if (lines[lines.length - 1].split(' ').length < 2) return;
      const widths = lines.map(widthOf);
      const v = variance(widths);
      const widest = Math.max.apply(null, widths);
      if (!best || v < best.v - 0.01 || (Math.abs(v - best.v) <= 0.01 && widest < best.widest)) {
        best = { lines: lines.slice(), v, widths, widest };
      }
    }
    function rec(start, left, acc) {
      if (left === 1) {
        consider(acc.concat([words.slice(start).join(' ')]));
        return;
      }
      const remain = words.length - start;
      const maxTake = remain - (left - 1) - 1;
      for (let take = 1; take <= maxTake; take++) {
        acc.push(words.slice(start, start + take).join(' '));
        rec(start + take, left - 1, acc);
        acc.pop();
      }
    }
    rec(0, n, []);
    return best ? best.lines : null;
  }

  function fillScore(fill, targetFill) {
    const lo = targetFill ? Math.max(0.45, targetFill - 0.05) : 0.85;
    const hi = targetFill ? Math.min(1, targetFill + 0.05) : 0.95;
    if (fill >= lo && fill <= hi) return 1;
    const edge = fill < lo ? lo : hi;
    return Math.max(0, 1 - Math.abs(fill - edge) / 0.5);
  }

  function optionScore(opt) {
    const span = opt.max - opt.min;
    const sizeScore = span > 0 ? (opt.size - opt.min) / span : 1;
    const close = opt.targetLines
      ? 1 - Math.min(1, Math.abs(opt.lines - opt.targetLines) / Math.max(1, opt.maxLines || 4))
      : 1;
    const base = sizeScore + fillScore(opt.fill, opt.targetFill) + opt.balance + close;
    if (opt.fits === false) return base - 10 - (opt.overflow || 0) / 80;
    return base;
  }

  function fitsAt(lines, size, measureWidth, lineHeight, zoneW, zoneH) {
    let widest = 0;
    const widths = lines.map((line) => {
      const w = measureWidth(line, size);
      if (w > widest) widest = w;
      return w;
    });
    const blockH = Math.max(lineHeight * size, lines.length * size * lineHeight);
    return {
      ok: widest <= zoneW + 0.5 && blockH <= zoneH + 0.5,
      widest,
      widths,
      blockH,
    };
  }

  function largestSize(lines, min, max, measureWidth, lineHeight, zoneW, zoneH) {
    const floor = fitsAt(lines, min, measureWidth, lineHeight, zoneW, zoneH);
    if (!floor.ok) return { size: min, fits: false, widest: floor.widest, widths: floor.widths, blockH: floor.blockH };
    let lo = min;
    let hi = max;
    let best = min;
    for (let i = 0; i < 18; i++) {
      const mid = (lo + hi) / 2;
      if (fitsAt(lines, mid, measureWidth, lineHeight, zoneW, zoneH).ok) {
        best = mid;
        lo = mid;
      } else hi = mid;
    }
    let size = Math.round(best * 10) / 10;
    let box = fitsAt(lines, size, measureWidth, lineHeight, zoneW, zoneH);
    while (size > min + 0.05 && !box.ok) {
      size = Math.round((size - 0.1) * 10) / 10;
      box = fitsAt(lines, size, measureWidth, lineHeight, zoneW, zoneH);
    }
    if (!box.ok) size = min;
    box = fitsAt(lines, size, measureWidth, lineHeight, zoneW, zoneH);
    return { size, fits: box.ok, widest: box.widest, widths: box.widths, blockH: box.blockH };
  }

  function fitLines(opts) {
    const lineCount = opts.lineCount | 0;
    const preferred = Array.isArray(opts.preferred)
      ? opts.preferred.map((line) => String(line || '').replace(/\s+/g, ' ').trim()).filter(Boolean)
      : null;
    let lines = preferred && preferred.length === lineCount ? preferred.slice() : null;
    const measureWidth = opts.measureWidth;
    if (!lines) {
      const widthAt = (size) => (line) => measureWidth(line, size);
      lines = balanceLines(opts.text, lineCount, widthAt(opts.max));
      if (!lines) return null;
    }
    let found = largestSize(lines, opts.min, opts.max, measureWidth, opts.lineHeight, opts.zoneW, opts.zoneH);
    if (!(preferred && preferred.length === lineCount)) {
      const again = balanceLines(opts.text, lineCount, (line) => measureWidth(line, found.size));
      if (again && again.join('\n') !== lines.join('\n')) {
        lines = again;
        found = largestSize(lines, opts.min, opts.max, measureWidth, opts.lineHeight, opts.zoneW, opts.zoneH);
      }
    }
    const zoneArea = Math.max(1, opts.zoneW * opts.zoneH);
    const fill = (found.widest * found.blockH) / zoneArea;
    const balance = balanceScore(found.widths);
    const overflow = found.fits ? 0 : overflowChars(lines, measureWidth, found.size, opts.zoneW, opts.zoneH, opts.lineHeight);
    const score = optionScore({
      size: found.size,
      min: opts.min,
      max: opts.max,
      fill,
      balance,
      lines: lines.length,
      targetLines: opts.targetLines || 0,
      maxLines: opts.maxLines || lineCount,
      targetFill: opts.targetFill || 0,
      fits: found.fits,
      overflow,
    });
    return {
      lines,
      size: found.size,
      fits: found.fits,
      overflow,
      fill,
      balance,
      score,
      widest: found.widest,
      widths: found.widths,
      blockH: found.blockH,
    };
  }

  function rankFits(opts) {
    const out = [];
    const maxLines = opts.maxLines || 1;
    for (let n = 1; n <= maxLines; n++) {
      const fit = fitLines(Object.assign({}, opts, { lineCount: n, maxLines }));
      if (fit) out.push(fit);
    }
    out.sort((a, b) => (a.fits === b.fits ? 0 : a.fits ? -1 : 1) || b.score - a.score || b.size - a.size || a.lines.length - b.lines.length);
    return out;
  }

  function charBudget(zoneWidth, charWidth, lines) {
    const perLine = Math.max(4, Math.floor(zoneWidth / Math.max(0.01, charWidth)));
    const n = Math.max(1, lines | 0);
    return { perLine, lines: n, maxChars: perLine * n };
  }

  function overflowChars(lines, measureWidth, size, zoneW, zoneH, lineHeight) {
    const charW = Math.max(1, measureWidth('N', size));
    let extra = 0;
    for (const line of lines) {
      const w = measureWidth(line, size);
      if (w > zoneW + 0.5) extra += Math.ceil((w - zoneW) / charW);
    }
    const blockH = lines.length * size * lineHeight;
    if (blockH > zoneH + 0.5) {
      const extraLines = (blockH - zoneH) / Math.max(1, size * lineHeight);
      const avg = Math.max(1, Math.round(lines.reduce((n, line) => n + line.length, 0) / lines.length));
      extra += Math.max(1, Math.round(extraLines * avg));
    }
    return Math.max(extra, lines.length ? 1 : 0);
  }

  return { LIMITS, wordsOf, balanceLines, balanceScore, fillScore, optionScore, fitLines, rankFits, charBudget, overflowChars, fitsAt };
});
