import { NextRequest, NextResponse } from 'next/server';
import { guard } from '@/lib/scoop';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

type Check = { name: string; ok: boolean; detail: string; ms?: number };

async function timed(name: string, fn: () => Promise<string>): Promise<Check> {
  const t = Date.now();
  try {
    return { name, ok: true, detail: await fn(), ms: Date.now() - t };
  } catch (err) {
    return { name, ok: false, detail: err instanceof Error ? err.message : String(err), ms: Date.now() - t };
  }
}

/**
 * GET /api/scoop/news-diag — one-click check of everything Latest local news depends on.
 * Imports the news modules dynamically so a crash while loading them is reported, not fatal.
 */
export async function GET(req: NextRequest) {
  const denied = guard(req);
  if (denied) return denied;
  const key = process.env.ANTHROPIC_API_KEY?.trim();
  const model = process.env.SCOOP_NEWS_HAIKU?.trim() || 'claude-haiku-5-5';
  const checks: Check[] = [
    { name: 'Node version', ok: Number(process.versions.node.split('.')[0]) >= 20, detail: process.versions.node },
    { name: 'ANTHROPIC_API_KEY set', ok: !!key, detail: key ? `…${key.slice(-4)}` : 'missing' },
    { name: 'BLOB_READ_WRITE_TOKEN set', ok: !!process.env.BLOB_READ_WRITE_TOKEN, detail: process.env.BLOB_READ_WRITE_TOKEN ? 'set' : 'missing' },
  ];
  checks.push(await timed('Load HTML parser (jsdom)', async () => { await import('jsdom'); return 'loaded'; }));
  checks.push(await timed('Load news module', async () => { await import('@/lib/scoop-news'); return 'loaded'; }));
  checks.push(await timed('Read brand settings', async () => {
    const { readBrandRecord } = await import('@/lib/scoop-brand');
    const rec = await readBrandRecord();
    const n = Array.isArray(rec?.newsSources) ? rec.newsSources.length : 0;
    return `ok · ${n} news sources saved`;
  }));
  checks.push(await timed('Fetch a feed (NWS Utah alerts)', async () => {
    const { fetchPublicBody } = await import('@/lib/scoop-read');
    const r = await fetchPublicBody('https://api.weather.gov/alerts/active?area=UT', {
      headers: { 'user-agent': 'SLC Scoop news check (contact via site)', accept: 'application/geo+json' }, timeoutMs: 8_000, includeStatus: true,
    });
    if ('error' in r) throw new Error(`${r.reason || 'failed'}${r.status ? ` (HTTP ${r.status})` : ''}`);
    return `HTTP ${r.status} · ${r.text.length} bytes`;
  }));
  if (key) {
    checks.push(await timed(`Anthropic web search (${model})`, async () => {
      const res = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        signal: AbortSignal.timeout(30_000),
        headers: { 'content-type': 'application/json', 'x-api-key': key, 'anthropic-version': '2023-06-01' },
        body: JSON.stringify({
          model, max_tokens: 300,
          tools: [{ type: 'web_search_20250305', name: 'web_search', max_uses: 1, allowed_domains: ['weather.gov'] }],
          messages: [{ role: 'user', content: 'Use web search once to find the current Salt Lake City forecast. Answer in one sentence.' }],
        }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(`HTTP ${res.status} ${body?.error?.type || ''}: ${body?.error?.message || 'no message'}`);
      const searches = Number(body?.usage?.server_tool_use?.web_search_requests) || 0;
      if (!searches) throw new Error('The API answered but did not run a web search.');
      return `ok · ${searches} search · stop_reason ${body?.stop_reason}`;
    }));
  }
  if (key) {
    checks.push(await timed('Read a link through Claude (web fetch)', async () => {
      const { readViaClaude } = await import('@/lib/scoop-claude-read');
      const r = await readViaClaude('https://www.utahnewsdispatch.com/', []);
      if ('error' in r && r.error !== 'unreadable') throw new Error(r.reason || r.error);
      return 'error' in r ? `fetched (page not an article: ${r.reason || r.error})` : `ok · ${r.text.length} characters`;
    }));
  }
  return NextResponse.json({ ok: checks.every((c) => c.ok), checkedAt: new Date().toISOString(), checks }, { headers: { 'cache-control': 'no-store' } });
}
