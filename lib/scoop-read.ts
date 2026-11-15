import { lookup } from 'dns/promises';
import http from 'http';
import https from 'https';
import { Readability } from '@mozilla/readability';
import {
  canonicalIp,
  cleanArticleText,
  hostIsOutlet,
  isBlockedIp,
  isSocialHost,
  looksLikePaywall,
  parsePublicUrl,
} from '@/lib/scoop-link';

const MAX_BYTES = 3 * 1024 * 1024;
const MAX_REDIRECTS = 3;
const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36';

export type Article = {
  title: string;
  siteName: string;
  byline: string;
  published: string;
  text: string;
  url: string;
  isNewsOutlet: boolean;
};

export type LinkError = { error: 'invalid' | 'blocked' | 'social' | 'unreadable' | 'failed'; reason?: string };
export type LinkResult = Article | LinkError;

export type Fetched = {
  status: number;
  headers: Record<string, string | string[] | undefined>;
  body: Buffer;
};

type LookupFn = (hostname: string) => Promise<{ address: string; family: number }[]>;
type RequestFn = (url: URL, signal: AbortSignal) => Promise<Fetched>;

function loadFailure(status: number): LinkError {
  if (status === 401 || status === 403) return { error: 'failed', reason: 'The site refused the reader.' };
  if (status === 404) return { error: 'failed', reason: 'The page was not found.' };
  if (status === 429) return { error: 'failed', reason: 'The site asked the reader to slow down.' };
  return { error: 'failed', reason: 'The page did not load.' };
}

function header(headers: Fetched['headers'], name: string): string {
  const value = headers[name] ?? headers[name.toLowerCase()];
  return Array.isArray(value) ? value[0] || '' : value || '';
}

async function publicAddresses(hostname: string, resolve: LookupFn): Promise<string[] | LinkError> {
  const literal = canonicalIp(hostname);
  if (literal) return isBlockedIp(literal) ? { error: 'blocked' } : [literal];
  let records: { address: string }[];
  try {
    records = await resolve(hostname);
  } catch {
    return { error: 'failed', reason: 'The address could not be resolved.' };
  }
  const usable = records.map((record) => record.address).filter((address) => !isBlockedIp(address));
  if (!usable.length) return { error: 'blocked' };
  return usable;
}

function nodeLookup(): LookupFn {
  return (hostname) => lookup(hostname, { all: true, verbatim: true });
}

function nodeRequest(extra?: Record<string, string>): RequestFn {
  return (url, signal) => new Promise((resolve, reject) => {
    const lib = url.protocol === 'https:' ? https : http;
    const req = lib.request(url, {
      method: 'GET',
      headers: {
        'user-agent': extra?.['user-agent'] || UA,
        accept: extra?.accept || 'text/html,application/xhtml+xml,application/xml,application/json;q=0.9,*/*;q=0.8',
        'accept-language': 'en-US,en;q=0.9',
        ...extra,
      },
      lookup: (hostname, options, callback) => {
        const done = typeof options === 'function' ? options : callback;
        const wantAll = typeof options === 'object' && !!options.all;
        lookup(hostname, { all: true, verbatim: true }).then((records) => {
          const usable = records.filter((record) => !isBlockedIp(record.address));
          if (!usable.length) {
            done(Object.assign(new Error('blocked address'), { code: 'EBLOCKED' }), '', 4);
            return;
          }
          if (wantAll) done(null, usable);
          else done(null, usable[0].address, usable[0].family);
        }).catch((err) => done(err as NodeJS.ErrnoException, '', 4));
      },
      signal,
    }, (res) => {
      const chunks: Buffer[] = [];
      let size = 0;
      let settled = false;
      const finish = () => {
        if (settled) return;
        settled = true;
        resolve({ status: res.statusCode || 0, headers: res.headers, body: Buffer.concat(chunks) });
      };
      res.on('data', (chunk: Buffer) => {
        if (settled || size >= MAX_BYTES) return;
        const slice = size + chunk.length > MAX_BYTES ? chunk.subarray(0, MAX_BYTES - size) : chunk;
        chunks.push(slice);
        size += slice.length;
        if (size >= MAX_BYTES) {
          res.destroy();
          finish();
        }
      });
      res.on('end', finish);
      res.on('error', () => {
        if (chunks.length) finish();
        else reject(Object.assign(new Error('socket'), { code: 'ECONNRESET' }));
      });
    });
    req.on('error', reject);
    req.end();
  });
}

function articleIsWall(text: string): boolean {
  if (!looksLikePaywall(text)) return false;
  if (text.length < 800) return true;
  return looksLikePaywall(text.slice(0, 500));
}

function jsonLdBody(doc: Document): { title: string; body: string; published: string; byline: string } | null {
  let best: { title: string; body: string; published: string; byline: string } | null = null;
  for (const script of doc.querySelectorAll('script[type="application/ld+json"]')) {
    let data: unknown;
    try {
      data = JSON.parse(script.textContent || '');
    } catch {
      continue;
    }
    const stack = Array.isArray(data) ? data.slice() : [data];
    while (stack.length) {
      const node = stack.pop();
      if (!node || typeof node !== 'object') continue;
      const row = node as Record<string, unknown>;
      if (Array.isArray(row['@graph'])) stack.push(...row['@graph']);
      const type = row['@type'];
      const types = (Array.isArray(type) ? type : [type]).map((item) => String(item || ''));
      const body = typeof row.articleBody === 'string' ? row.articleBody : '';
      if (!types.some((item) => /article/i.test(item)) || body.trim().length < 300) continue;
      if (best && best.body.length >= body.length) continue;
      const author = row.author;
      const byline = typeof author === 'string'
        ? author
        : author && typeof author === 'object' && !Array.isArray(author) && typeof (author as { name?: unknown }).name === 'string'
          ? String((author as { name: string }).name)
          : '';
      best = {
        title: typeof row.headline === 'string' ? row.headline : '',
        body,
        published: typeof row.datePublished === 'string' ? row.datePublished : '',
        byline,
      };
    }
  }
  return best;
}

function visibleArticle(doc: Document): string {
  const selectors = ['[itemprop="articleBody"]', 'article', 'main'];
  let best = '';
  for (const selector of selectors) {
    for (const el of doc.querySelectorAll(selector)) {
      const text = (el.textContent || '').replace(/\s+/g, ' ').trim();
      if (text.length > best.length) best = text;
    }
    if (best.length >= 300) break;
  }
  return best;
}

function meta(doc: Document, name: string): string {
  const el = doc.querySelector(`meta[property="${name}"], meta[name="${name}"]`);
  return (el?.getAttribute('content') || '').replace(/\s+/g, ' ').trim();
}

function publishedFrom(doc: Document): string {
  const fromMeta = meta(doc, 'article:published_time') || meta(doc, 'og:published_time') || meta(doc, 'date') || meta(doc, 'pubdate');
  if (fromMeta) return fromMeta.slice(0, 40);
  const time = doc.querySelector('time[datetime]');
  return (time?.getAttribute('datetime') || '').trim().slice(0, 40);
}

let jsdomLoad: Promise<typeof import('jsdom').JSDOM> | null = null;
function loadJsDom() {
  if (!jsdomLoad) jsdomLoad = import('jsdom').then((mod) => mod.JSDOM);
  return jsdomLoad;
}

async function extract(html: string, pageUrl: string, outlets: string[]): Promise<Article | LinkError> {
  const JSDOM = await loadJsDom();
  const dom = new JSDOM(html, { url: pageUrl });
  const doc = dom.window.document;
  const host = new URL(pageUrl).hostname;
  const ogType = meta(doc, 'og:type');
  const siteName = meta(doc, 'og:site_name') || host.replace(/^www\./, '');
  const isNewsOutlet = hostIsOutlet(host, outlets) || /^article\b/i.test(ogType);
  const published = publishedFrom(doc);
  const description = meta(doc, 'og:description');
  const linked = jsonLdBody(doc);
  const visible = visibleArticle(doc);
  let article: ReturnType<Readability['parse']> = null;
  try { article = new Readability(doc).parse(); } catch { article = null; }
  let text = cleanArticleText(article?.textContent || '');
  let title = article?.title || '';
  let byline = article?.byline || '';
  let when = published;
  if (text.length < 300 && linked) {
    text = cleanArticleText(linked.body);
    title = linked.title || title;
    byline = linked.byline || byline;
    when = when || linked.published.slice(0, 40);
  }
  if (text.length < 300) text = cleanArticleText(visible);
  if (articleIsWall(text) || (text.length < 800 && looksLikePaywall(description))) {
    return { error: 'unreadable', reason: 'The page looks like a paywall or login wall.' };
  }
  if (text.length < 300) return { error: 'unreadable', reason: 'The page did not include enough article text.' };
  return {
    title: (title || meta(doc, 'og:title') || '').replace(/\s+/g, ' ').trim().slice(0, 200),
    siteName: siteName.slice(0, 80),
    byline: byline.replace(/\s+/g, ' ').trim().slice(0, 160),
    published: when,
    text,
    url: pageUrl,
    isNewsOutlet,
  };
}

/** Fetch one public article. Every hop is resolved again and rejected if it is private. */
export async function readPublicArticle(
  input: string,
  outlets: string[],
  deps?: { lookup?: LookupFn; request?: RequestFn }
): Promise<LinkResult> {
  const parsed = parsePublicUrl(input);
  if (!parsed.ok) return { error: parsed.error };
  const resolve = deps?.lookup || nodeLookup();
  const request = deps?.request || nodeRequest();
  let current = parsed.url;
  let redirects = 0;
  const signal = AbortSignal.timeout(10_000);
  try {
    while (true) {
      if (isSocialHost(current.hostname)) return { error: 'social' };
      const addresses = await publicAddresses(current.hostname, resolve);
      if (!Array.isArray(addresses)) return addresses;
      const res = await request(current, signal);
      if ([301, 302, 303, 307, 308].includes(res.status)) {
        redirects += 1;
        if (redirects > MAX_REDIRECTS) return { error: 'failed', reason: 'Too many redirects.' };
        const loc = header(res.headers, 'location');
        if (!loc) return { error: 'failed', reason: 'The page redirected without a destination.' };
        let next: URL;
        try {
          next = new URL(loc, current);
        } catch {
          return { error: 'invalid' };
        }
        const hop = parsePublicUrl(next.href);
        if (!hop.ok) return { error: hop.error };
        current = hop.url;
        continue;
      }
      if (res.status < 200 || res.status >= 300) return loadFailure(res.status);
      const type = header(res.headers, 'content-type').split(';')[0].trim().toLowerCase();
      if (type !== 'text/html' && type !== 'application/xhtml+xml') return { error: 'unreadable', reason: 'The page is not an article.' };
      const charset = /charset=([^;\s]+)/i.exec(header(res.headers, 'content-type'))?.[1] || 'utf-8';
      let html = '';
      try {
        html = new TextDecoder(charset).decode(res.body);
      } catch {
        html = res.body.toString('utf8');
      }
      return await extract(html, current.href, outlets);
    }
  } catch (err) {
    const code = (err as { code?: string })?.code || '';
    if (code === 'EBLOCKED') return { error: 'blocked' };
    if (code === 'ESIZE') return { error: 'unreadable', reason: 'The page is too large to read.' };
    if (code === 'ABORT_ERR' || (err instanceof Error && err.name === 'TimeoutError')) {
      return { error: 'failed', reason: 'The page took too long to load.' };
    }
    return { error: 'failed', reason: 'The page could not be read.' };
  }
}

export type PublicBody = { status: number; url: string; type: string; text: string };

/** Fetch a public text document. Every hop is resolved again and rejected if it is private. */
export async function fetchPublicBody(
  input: string,
  opts?: { headers?: Record<string, string>; timeoutMs?: number; includeStatus?: boolean },
  deps?: { lookup?: LookupFn; request?: RequestFn }
): Promise<PublicBody | (LinkError & { status?: number; challenge?: boolean })> {
  const parsed = parsePublicUrl(input);
  if (!parsed.ok) return { error: parsed.error };
  const resolve = deps?.lookup || nodeLookup();
  const request = deps?.request || nodeRequest(opts?.headers);
  let current = parsed.url;
  let redirects = 0;
  const signal = AbortSignal.timeout(opts?.timeoutMs ?? 10_000);
  try {
    while (true) {
      if (isSocialHost(current.hostname)) return { error: 'social' };
      const addresses = await publicAddresses(current.hostname, resolve);
      if (!Array.isArray(addresses)) return addresses;
      const res = await request(current, signal);
      if ([301, 302, 303, 307, 308].includes(res.status)) {
        redirects += 1;
        if (redirects > MAX_REDIRECTS) return { error: 'failed', reason: 'Too many redirects.' };
        const loc = header(res.headers, 'location');
        if (!loc) return { error: 'failed', reason: 'The page redirected without a destination.' };
        let next: URL;
        try { next = new URL(loc, current); } catch { return { error: 'invalid' }; }
        const hop = parsePublicUrl(next.href);
        if (!hop.ok) return { error: hop.error };
        current = hop.url;
        continue;
      }
      if (res.status < 200 || res.status >= 300) {
        const failure = loadFailure(res.status);
        if (!opts?.includeStatus) return failure;
        const sample = res.body.toString('utf8').slice(0, 5000);
        const challenge = /just a moment|cf-browser-verification|cf-challenge|attention required|cdn-cgi\/challenge/i.test(sample);
        return { ...failure, status: res.status, challenge };
      }
      const type = header(res.headers, 'content-type').split(';')[0].trim().toLowerCase();
      if (type && !/text\/|xml|json|javascript/.test(type)) {
        return { error: 'unreadable', reason: 'The source did not return text.' };
      }
      const charset = /charset=([^;\s]+)/i.exec(header(res.headers, 'content-type'))?.[1] || 'utf-8';
      try { return { status: res.status, url: current.href, type, text: new TextDecoder(charset).decode(res.body) }; }
      catch { return { status: res.status, url: current.href, type, text: res.body.toString('utf8') }; }
    }
  } catch (err) {
    const code = (err as { code?: string })?.code || '';
    if (code === 'EBLOCKED') return { error: 'blocked' };
    if (code === 'ABORT_ERR' || (err instanceof Error && err.name === 'TimeoutError')) {
      return { error: 'failed', reason: 'The source took too long to load.' };
    }
    return { error: 'failed', reason: 'The source could not be read.' };
  }
}
