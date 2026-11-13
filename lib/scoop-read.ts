import { lookup } from 'dns/promises';
import http from 'http';
import https from 'https';
import { JSDOM } from 'jsdom';
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
  if (!records.length || records.some((record) => isBlockedIp(record.address))) return { error: 'blocked' };
  return records.map((record) => record.address);
}

function nodeLookup(): LookupFn {
  return (hostname) => lookup(hostname, { all: true, verbatim: true });
}

function nodeRequest(): RequestFn {
  return (url, signal) => new Promise((resolve, reject) => {
    const lib = url.protocol === 'https:' ? https : http;
    const req = lib.request(url, {
      method: 'GET',
      headers: {
        'user-agent': UA,
        accept: 'text/html,application/xhtml+xml;q=0.9,*/*;q=0.8',
        'accept-language': 'en-US,en;q=0.9',
      },
      lookup: (hostname, options, callback) => {
        const done = typeof options === 'function' ? options : callback;
        const wantAll = typeof options === 'object' && !!options.all;
        lookup(hostname, { all: true, verbatim: true }).then((records) => {
          if (!records.length || records.some((record) => isBlockedIp(record.address))) {
            done(Object.assign(new Error('blocked address'), { code: 'EBLOCKED' }), '', 4);
            return;
          }
          if (wantAll) done(null, records);
          else done(null, records[0].address, records[0].family);
        }).catch((err) => done(err as NodeJS.ErrnoException, '', 4));
      },
      signal,
    }, (res) => {
      const chunks: Buffer[] = [];
      let size = 0;
      const declared = Number(res.headers['content-length'] || 0);
      if (declared > MAX_BYTES) {
        res.destroy();
        reject(Object.assign(new Error('too big'), { code: 'ESIZE' }));
        return;
      }
      res.on('data', (chunk: Buffer) => {
        size += chunk.length;
        if (size > MAX_BYTES) {
          res.destroy();
          reject(Object.assign(new Error('too big'), { code: 'ESIZE' }));
          return;
        }
        chunks.push(chunk);
      });
      res.on('end', () => resolve({ status: res.statusCode || 0, headers: res.headers, body: Buffer.concat(chunks) }));
      res.on('error', reject);
    });
    req.on('error', reject);
    req.end();
  });
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

function extract(html: string, pageUrl: string, outlets: string[]): Article | LinkError {
  const dom = new JSDOM(html, { url: pageUrl });
  const doc = dom.window.document;
  const host = new URL(pageUrl).hostname;
  const ogType = meta(doc, 'og:type');
  const siteName = meta(doc, 'og:site_name') || host.replace(/^www\./, '');
  const isNewsOutlet = hostIsOutlet(host, outlets) || /^article\b/i.test(ogType);
  const article = new Readability(doc).parse();
  const text = cleanArticleText(article?.textContent || '');
  const sample = `${article?.title || ''}\n${text}`;
  if (looksLikePaywall(sample) || looksLikePaywall(meta(doc, 'og:description'))) {
    return { error: 'unreadable', reason: 'The page looks like a paywall or login wall.' };
  }
  if (text.length < 300) return { error: 'unreadable', reason: 'The page did not include enough article text.' };
  return {
    title: (article?.title || meta(doc, 'og:title') || '').replace(/\s+/g, ' ').trim().slice(0, 200),
    siteName: siteName.slice(0, 80),
    byline: (article?.byline || '').replace(/\s+/g, ' ').trim().slice(0, 160),
    published: publishedFrom(doc),
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
      if (res.status < 200 || res.status >= 300) return { error: 'failed', reason: 'The page did not load.' };
      const type = header(res.headers, 'content-type').split(';')[0].trim().toLowerCase();
      if (type !== 'text/html') return { error: 'unreadable', reason: 'The page is not an article.' };
      const charset = /charset=([^;\s]+)/i.exec(header(res.headers, 'content-type'))?.[1] || 'utf-8';
      let html = '';
      try {
        html = new TextDecoder(charset).decode(res.body);
      } catch {
        html = res.body.toString('utf8');
      }
      return extract(html, current.href, outlets);
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
