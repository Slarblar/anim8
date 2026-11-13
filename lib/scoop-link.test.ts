import { describe, expect, it } from 'vitest';
import { DEFAULT_OUTLETS } from '@/lib/scoop-brand';
import { hostIsOutlet, isBlockedIp, isSocialHost, looksLikePaywall, parsePublicUrl } from '@/lib/scoop-link';
import { readPublicArticle } from '@/lib/scoop-read';

const articleHtml = `<!doctype html><html><head>
<meta property="og:site_name" content="The Salt Lake Tribune">
<meta property="og:type" content="article">
<meta property="article:published_time" content="2026-03-01T12:00:00Z">
<title>Council delays the water vote</title>
</head><body><article><h1>Council delays the water vote</h1>
<p>${'The city council delayed the water rate vote until June after residents asked for another hearing. '.repeat(8)}</p>
</article></body></html>`;

describe('address guards', () => {
  it('rejects private, loopback, link-local, and metadata addresses', () => {
    for (const ip of ['10.1.2.3', '172.16.0.1', '172.31.255.1', '192.168.1.9', '127.0.0.1', '169.254.169.254', '::1', 'fc00::1', 'fd12::1', 'fe80::1']) {
      expect(isBlockedIp(ip), ip).toBe(true);
    }
    expect(isBlockedIp('::ffff:127.0.0.1')).toBe(true);
    expect(isBlockedIp('8.8.8.8')).toBe(false);
    expect(isBlockedIp('1.1.1.1')).toBe(false);
  });

  it('rejects a private address written as an integer', () => {
    expect(parsePublicUrl('http://2130706433/')).toEqual({ ok: false, error: 'blocked' });
    expect(parsePublicUrl('http://127.0.0.1/admin')).toEqual({ ok: false, error: 'blocked' });
  });

  it('accepts only http(s) and stops social hosts before a fetch', () => {
    expect(parsePublicUrl('ftp://sltrib.com/story').ok).toBe(false);
    expect(parsePublicUrl('https://user:pass@sltrib.com/').ok).toBe(false);
    expect(parsePublicUrl('https://x.com/slcscoop/status/1')).toMatchObject({ ok: false, error: 'social' });
    expect(parsePublicUrl('https://www.instagram.com/p/abc')).toMatchObject({ ok: false, error: 'social' });
    expect(isSocialHost('mobile.twitter.com')).toBe(true);
    expect(parsePublicUrl('https://www.sltrib.com/news/2026/03/01/vote/').ok).toBe(true);
  });
});

describe('news outlets', () => {
  it('matches a publisher and its subdomains', () => {
    expect(hostIsOutlet('www.sltrib.com', DEFAULT_OUTLETS)).toBe(true);
    expect(hostIsOutlet('ksl.com', DEFAULT_OUTLETS)).toBe(true);
    expect(hostIsOutlet('news.ksl.com', DEFAULT_OUTLETS)).toBe(true);
    expect(hostIsOutlet('example.com', DEFAULT_OUTLETS)).toBe(false);
  });
});

describe('readPublicArticle', () => {
  it('returns social without fetching', async () => {
    let called = false;
    const result = await readPublicArticle('https://www.tiktok.com/@city/video/1', DEFAULT_OUTLETS, {
      request: async () => { called = true; return { status: 200, headers: {}, body: Buffer.from('') }; },
    });
    expect(result).toEqual({ error: 'social' });
    expect(called).toBe(false);
  });

  it('rejects a redirect onto a private address', async () => {
    const result = await readPublicArticle('https://news.example/story', DEFAULT_OUTLETS, {
      lookup: async () => [{ address: '93.184.216.34', family: 4 }],
      request: async () => ({ status: 302, headers: { location: 'http://169.254.169.254/latest' }, body: Buffer.from('') }),
    });
    expect(result).toEqual({ error: 'blocked' });
  });

  it('rejects a host that resolves to a private address', async () => {
    const result = await readPublicArticle('https://news.example/story', DEFAULT_OUTLETS, {
      lookup: async () => [{ address: '10.0.0.8', family: 4 }],
      request: async () => { throw new Error('should not fetch'); },
    });
    expect(result).toEqual({ error: 'blocked' });
  });

  it('stops after three redirects', async () => {
    let hops = 0;
    const result = await readPublicArticle('https://news.example/story', DEFAULT_OUTLETS, {
      lookup: async () => [{ address: '93.184.216.34', family: 4 }],
      request: async (url) => {
        hops += 1;
        return { status: 302, headers: { location: url.href + '/' + hops }, body: Buffer.from('') };
      },
    });
    expect(result).toMatchObject({ error: 'failed' });
    expect(hops).toBe(4);
  });

  it('returns the article and marks a known outlet', async () => {
    const result = await readPublicArticle('https://www.sltrib.com/news/vote/', DEFAULT_OUTLETS, {
      lookup: async () => [{ address: '93.184.216.34', family: 4 }],
      request: async () => ({ status: 200, headers: { 'content-type': 'text/html; charset=utf-8' }, body: Buffer.from(articleHtml) }),
    });
    expect(result).toMatchObject({
      siteName: 'The Salt Lake Tribune',
      title: 'Council delays the water vote',
      published: '2026-03-01T12:00:00Z',
      isNewsOutlet: true,
      url: 'https://www.sltrib.com/news/vote/',
    });
    if ('text' in result) expect(result.text.length).toBeGreaterThan(300);
  });

  it('refuses a paywall instead of returning the wall', async () => {
    const html = `<!doctype html><html><head><title>Subscribe</title></head><body><article><h1>Subscribe to continue</h1><p>Subscribe to read this story. Sign in to continue.</p></article></body></html>`;
    const result = await readPublicArticle('https://www.deseret.com/story', DEFAULT_OUTLETS, {
      lookup: async () => [{ address: '93.184.216.34', family: 4 }],
      request: async () => ({ status: 200, headers: { 'content-type': 'text/html' }, body: Buffer.from(html) }),
    });
    expect(result).toMatchObject({ error: 'unreadable' });
    expect(result).not.toHaveProperty('text');
  });

  it('refuses a page with too little text', async () => {
    const html = '<!doctype html><html><head><title>Hi</title></head><body><article><p>Short.</p></article></body></html>';
    const result = await readPublicArticle('https://notes.example/post', [], {
      lookup: async () => [{ address: '93.184.216.34', family: 4 }],
      request: async () => ({ status: 200, headers: { 'content-type': 'text/html' }, body: Buffer.from(html) }),
    });
    expect(result).toMatchObject({ error: 'unreadable' });
    expect(looksLikePaywall('Subscribe to read the rest')).toBe(true);
  });

  it('refuses a file that is not html', async () => {
    const result = await readPublicArticle('https://cdn.example/photo.jpg', [], {
      lookup: async () => [{ address: '93.184.216.34', family: 4 }],
      request: async () => ({ status: 200, headers: { 'content-type': 'image/jpeg' }, body: Buffer.from('not html') }),
    });
    expect(result).toMatchObject({ error: 'unreadable' });
  });
});
