/** Pull a draft object out of a model reply. The reply often has raw line breaks, a missing comma, or a second JSON object. */
export function parseModelJson(text: string): Record<string, unknown> {
  const objects = topLevelObjects(text);
  const parsed = objects
    .map((slice) => tryParse(slice) ?? tryParse(repairJson(slice)) ?? tryParse(repairJson(closeJson(slice))))
    .filter((value): value is Record<string, unknown> => !!value && typeof value === 'object' && !Array.isArray(value));
  const draft = [...parsed].reverse().find(isDraft) || parsed[parsed.length - 1];
  if (draft) return draft;
  throw new SyntaxError('no json');
}

function isDraft(row: Record<string, unknown>): boolean {
  return Array.isArray(row.headlines) || typeof row.article === 'string' || (!!row.fields && typeof row.fields === 'object');
}

function tryParse(slice: string): Record<string, unknown> | null {
  try {
    const value = JSON.parse(slice) as unknown;
    return value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : null;
  } catch {
    return null;
  }
}

function topLevelObjects(text: string): string[] {
  const out: string[] = [];
  let depth = 0;
  let start = -1;
  let inString = false;
  let escape = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (inString) {
      if (escape) escape = false;
      else if (ch === '\\') escape = true;
      else if (ch === '"') inString = false;
      continue;
    }
    if (ch === '"') { inString = true; continue; }
    if (ch === '{') {
      if (depth === 0) start = i;
      depth += 1;
    } else if (ch === '}') {
      if (depth === 0) continue;
      depth -= 1;
      if (depth === 0 && start >= 0) {
        out.push(text.slice(start, i + 1));
        start = -1;
      }
    }
  }
  if (start >= 0) out.push(text.slice(start));
  return out;
}

function repairJson(json: string): string {
  const relaxed = repairJsonStrings(json);
  return relaxed
    .replace(/,\s*([}\]])/g, '$1')
    .replace(/([}\]"])\s*(?=[{\["])/g, '$1,');
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
    if (escape) { out += ch; escape = false; continue; }
    if (ch === '\\') { out += ch; escape = true; continue; }
    if (ch === '"') { out += ch; inString = false; continue; }
    if (ch === '\n') { out += '\\n'; continue; }
    if (ch === '\r') { out += '\\r'; continue; }
    if (ch === '\t') { out += '\\t'; continue; }
    if (ch.charCodeAt(0) < 32) continue;
    out += ch;
  }
  return out;
}

function closeJson(json: string): string {
  let inString = false;
  let escape = false;
  const stack: string[] = [];
  for (const ch of json) {
    if (inString) {
      if (escape) escape = false;
      else if (ch === '\\') escape = true;
      else if (ch === '"') inString = false;
      continue;
    }
    if (ch === '"') { inString = true; continue; }
    if (ch === '{') stack.push('}');
    else if (ch === '[') stack.push(']');
    else if ((ch === '}' || ch === ']') && stack[stack.length - 1] === ch) stack.pop();
  }
  let out = json;
  if (inString) out += '"';
  while (stack.length) out += stack.pop();
  return out;
}
