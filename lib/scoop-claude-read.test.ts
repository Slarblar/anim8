import { afterEach, describe, expect, it, vi } from 'vitest';
import { readViaClaude } from '@/lib/scoop-claude-read';

const article = 'Police in South Jordan responded to a report near 10600 South on Saturday. '.repeat(12);
function reply(content: unknown[], status = 200) {
  return vi.fn(async () => new Response(JSON.stringify(status === 200 ? { content } : { error: { message: 'nope' } }), { status }));
}

describe('readViaClaude', () => {
  afterEach(() => { vi.unstubAllGlobals(); delete process.env.ANTHROPIC_API_KEY; });

  it('returns the fetched page text and the metadata Claude reads', async () => {
    process.env.ANTHROPIC_API_KEY = 'k';
    const f = reply([
      { type: 'server_tool_use', id: 's1', name: 'web_fetch', input: { url: 'https://www.ksl.com/article/1/x' } },
      { type: 'web_fetch_tool_result', tool_use_id: 's1', content: { type: 'web_fetch_result', url: 'https://www.ksl.com/article/1/x', content: { type: 'document', title: 'South Jordan police respond', source: { type: 'text', media_type: 'text/plain', data: article } } } },
      { type: 'text', text: '{"siteName":"KSL.com","byline":"Jane Doe","published":"2026-11-15T10:00:00-07:00"}' },
    ]);
    vi.stubGlobal('fetch', f);
    const r = await readViaClaude('https://www.ksl.com/article/1/x', ['ksl.com']);
    expect('error' in r).toBe(false);
    if ('error' in r) return;
    expect(r.title).toBe('South Jordan police respond');
    expect(r.siteName).toBe('KSL.com');
    expect(r.published).toContain('2026-11-15');
    expect(r.isNewsOutlet).toBe(true);
    const sent = JSON.parse((f.mock.calls[0] as unknown as [string, { body: string }])[1].body);
    expect(sent.tools[0].name).toBe('web_fetch');
    expect(sent.messages[0].content).toContain('https://www.ksl.com/article/1/x');
  });

  it('turns a blocked fetch into a clear reason', async () => {
    process.env.ANTHROPIC_API_KEY = 'k';
    vi.stubGlobal('fetch', reply([{ type: 'web_fetch_tool_result', tool_use_id: 's1', content: { type: 'web_fetch_tool_result_error', error_code: 'url_not_accessible' } }]));
    const r = await readViaClaude('https://www.sltrib.com/news/x', []);
    expect(r).toMatchObject({ error: 'unreadable' });
  });

  it('never sends private or social links to Claude', async () => {
    process.env.ANTHROPIC_API_KEY = 'k';
    const f = reply([]);
    vi.stubGlobal('fetch', f);
    expect(await readViaClaude('https://x.com/slcpd/status/1', [])).toMatchObject({ error: 'social' });
    expect('error' in (await readViaClaude('http://127.0.0.1/admin', []))).toBe(true);
    expect(f).not.toHaveBeenCalled();
  });
});
