/** The model often puts a real line break inside a JSON string. Repair those, and leave valid JSON alone. */
export function parseModelJson(text: string): Record<string, unknown> {
  const start = text.indexOf('{');
  const end = text.lastIndexOf('}');
  if (start < 0 || end <= start) throw new SyntaxError('no json');
  const slice = text.slice(start, end + 1);
  try {
    return JSON.parse(slice) as Record<string, unknown>;
  } catch (error) {
    if (!(error instanceof SyntaxError)) throw error;
    return JSON.parse(repairJsonStrings(slice)) as Record<string, unknown>;
  }
}

function repairJsonStrings(json: string): string {
  let out = '';
  let inString = false;
  let escape = false;
  for (const ch of json) {
    if (!inString) {
      out += ch;
      if (ch === '"') inString = true;
      continue;
    }
    if (escape) {
      out += ch;
      escape = false;
      continue;
    }
    if (ch === '\\') {
      out += ch;
      escape = true;
      continue;
    }
    if (ch === '"') {
      out += ch;
      inString = false;
      continue;
    }
    if (ch === '\n') { out += '\\n'; continue; }
    if (ch === '\r') { out += '\\r'; continue; }
    if (ch === '\t') { out += '\\t'; continue; }
    if (ch.charCodeAt(0) < 32) continue;
    out += ch;
  }
  return out;
}
