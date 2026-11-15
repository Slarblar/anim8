import { cleanArticleText, hostIsOutlet, isSocialHost, looksLikePaywall, parsePublicUrl } from '@/lib/scoop-link';
import type { LinkResult } from '@/lib/scoop-read';

/**
 * Reads a public article through Claude's web fetch tool. Anthropic's servers download the page, so sites that
 * block Vercel's data-center addresses still work. No charge beyond tokens; the page text comes back in the
 * tool result, so Claude only writes a short metadata line.
 */
const ANTHROPIC_URL = 'https://api.anthropic.com/v1/messages';
const MODEL = () => process.env.SCOOP_READ_MODEL?.trim() || process.env.SCOOP_NEWS_HAIKU?.trim() || 'claude-haiku-5-5';
const TOOL = 'web_fetch_20260309';

const FETCH_ERRORS: Record<string, LinkResult> = {
  url_not_accessible: { error: 'unreadable', reason: "The site wouldn't let the page be read (paywall, login, or blocked)." },
  unsupported_content_type: { error: 'unreadable', reason: 'The link is not an article page.' },
  content_too_large: { error: 'unreadable', reason: 'The page is too large to read.' },
  url_too_long: { error: 'invalid' },
  url_not_allowed: { error: 'blocked' },
  too_many_requests: { error: 'failed', reason: 'Too many reads at once. Try again in a minute.' },
  unavailable: { error: 'failed', reason: 'Page reading is unavailable right now. Try again shortly.' },
};

type Block = Record<string, unknown>;

function wall(text: string): boolean {
  return /subscribe to (continue|read)|already a subscriber|sign in to (continue|read)|create a free account to/i.test(text.slice(0, 1500));
}

export async function readViaClaude(input: string, outlets: string[]): Promise<LinkResult> {
  const key = process.env.ANTHROPIC_API_KEY?.trim();
  if (!key) return { error: 'failed', reason: 'Page reading needs ANTHROPIC_API_KEY.' };
  const parsed = parsePublicUrl(input);
  if (!parsed.ok) return { error: parsed.error };
  if (isSocialHost(parsed.url.hostname)) return { error: 'social' };
  const url = parsed.url.href;

  let res: Response;
  try {
    res = await fetch(ANTHROPIC_URL, {
      method: 'POST',
      signal: AbortSignal.timeout(35_000),
      headers: { 'content-type': 'application/json', 'x-api-key': key, 'anthropic-version': '2023-06-01' },
      body: JSON.stringify({
        model: MODEL(),
        max_tokens: 300,
        tools: [{ type: TOOL, name: 'web_fetch', max_uses: 1, max_content_tokens: 12_000, use_cache: false }],
        messages: [{
          role: 'user',
          content: `Fetch this page with web_fetch: ${url}\nThen reply with JSON only: {"siteName": "", "byline": "", "published": ""}. published is the article's publish date/time exactly as the page shows it (ISO if possible), or "" if none. Do not summarize the article.`,
        }],
      }),
    });
  } catch (err) {
    const timeout = err instanceof Error && (err.name === 'TimeoutError' || err.name === 'AbortError');
    return { error: 'failed', reason: timeout ? 'The page took too long to read.' : 'Page reading could not connect.' };
  }
  const body = await res.json().catch(() => ({})) as Block;
  const apiError = body.error && typeof body.error === 'object' ? body.error as Block : {};
  if (!res.ok) {
    console.error('[scoop read-link] Claude fetch error', res.status, apiError.message);
    if (res.status === 401) return { error: 'failed', reason: 'The Anthropic API key was rejected.' };
    if (res.status === 429) return { error: 'failed', reason: 'Page reading is busy. Try again in a minute.' };
    const msg = String(apiError.message || '');
    if (/web.?fetch/i.test(msg)) return { error: 'failed', reason: `Web fetch isn't available for this Anthropic organization: ${msg}` };
    return { error: 'failed', reason: `Page reading failed (HTTP ${res.status}).` };
  }

  const content = Array.isArray(body.content) ? body.content as Block[] : [];
  const result = content.find((block) => block?.type === 'web_fetch_tool_result')?.content as Block | undefined;
  if (!result) return { error: 'failed', reason: 'The page was not fetched. Try again.' };
  if (result.type === 'web_fetch_tool_result_error') {
    return FETCH_ERRORS[String(result.error_code)] || { error: 'failed', reason: `The page could not be read (${result.error_code}).` };
  }
  const doc = (result.content && typeof result.content === 'object' ? result.content : {}) as Block;
  const source = doc.source && typeof doc.source === 'object' ? doc.source as Block : {};
  if (source.type !== 'text') return { error: 'unreadable', reason: 'The link is not an article page.' };
  const text = cleanArticleText(String(source.data || ''));
  if (wall(text) || (text.length < 800 && looksLikePaywall(text.slice(0, 400)))) {
    return { error: 'unreadable', reason: 'The page looks like a paywall or login wall.' };
  }
  if (text.length < 300) return { error: 'unreadable', reason: 'The page did not include enough article text.' };

  let meta: Block = {};
  const said = content.filter((block) => block?.type === 'text').map((block) => String(block.text || '')).join('');
  try {
    const start = said.indexOf('{');
    const end = said.lastIndexOf('}');
    if (start >= 0 && end > start) meta = JSON.parse(said.slice(start, end + 1)) as Block;
  } catch { meta = {}; }

  const finalUrl = String(result.url || url);
  let host = parsed.url.hostname;
  try { host = new URL(finalUrl).hostname; } catch { /* keep the host we already checked */ }
  return {
    title: String(doc.title || '').replace(/\s+/g, ' ').trim().slice(0, 200),
    siteName: String(meta.siteName || host.replace(/^www\./, '')).slice(0, 80),
    byline: String(meta.byline || '').replace(/\s+/g, ' ').trim().slice(0, 160),
    published: String(meta.published || '').slice(0, 40),
    text,
    url: finalUrl,
    isNewsOutlet: hostIsOutlet(host, outlets),
  };
}
