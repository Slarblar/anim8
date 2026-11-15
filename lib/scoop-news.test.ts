import { describe, expect, it } from 'vitest';
import {
  collectNews,
  denverMidnight,
  mentionsUtah,
  newsSitemapFromRobots,
  normalizeNewsSources,
  parseFeed,
  parseNewsSitemap,
  parsePage,
  passesWindow,
  NEWS_SEED,
} from '@/lib/scoop-news';

const NOW = new Date('2026-11-14T20:00:00.000Z');

describe('news sitemap dates', () => {
  it('reads a Google News sitemap like an RSS item and flags a date-only stamp', () => {
    const items = parseNewsSitemap(`<?xml version="1.0"?>
      <urlset xmlns:news="http://www.google.com/schemas/sitemap-news/0.9">
        <url>
          <loc>https://www.ksl.com/article/1/utah-airport-reopens</loc>
          <news:news><news:title>Airport reopens in Salt Lake</news:title><news:publication_date>2026-11-14</news:publication_date></news:news>
        </url>
        <url>
          <loc>https://www.ksl.com/article/2/fight</loc>
          <news:news><news:title>Title fight in New York</news:title><news:publication_date>2026-11-14T18:00:00Z</news:publication_date></news:news>
        </url>
      </urlset>`);
    expect(items).toHaveLength(2);
    expect(items[0].dateOnly).toBe(true);
    expect(items[0].publishedAt).toBe(denverMidnight('2026-11-14').toISOString());
    expect(items[1].dateOnly).toBe(false);
    expect(items[0].title).toBe('Airport reopens in Salt Lake');
  });

  it('puts a date-only stamp at Denver midnight and keeps it out of the 3 hour and 6 hour lists', () => {
    const at = denverMidnight('2026-11-14');
    expect(at.toISOString()).toBe('2026-11-14T07:00:00.000Z');
    expect(denverMidnight('2026-07-14').toISOString()).toBe('2026-07-14T06:00:00.000Z');
    const item = { publishedAt: at.toISOString(), dateOnly: true };
    const morning = new Date('2026-11-14T08:00:00.000Z');
    expect(passesWindow(item, '3h', morning)).toBe(false);
    expect(passesWindow(item, '6h', morning)).toBe(false);
    expect(passesWindow(item, '24h', morning)).toBe(true);
    expect(passesWindow({ publishedAt: '2026-11-14T18:30:00.000Z', dateOnly: false }, '3h', NOW)).toBe(true);
  });
});

describe('feeds and pages', () => {
  it('reads an RSS item', () => {
    const items = parseFeed(`<rss><channel><title>Ignore</title><item>
      <title><![CDATA[Council delays the vote]]></title>
      <link>https://www.sltrib.com/news/vote/</link>
      <pubDate>Sat, 14 Nov 2026 18:00:00 GMT</pubDate>
      <description>The council waited.</description>
    </item></channel></rss>`);
    expect(items).toHaveLength(1);
    expect(items[0].title).toBe('Council delays the vote');
    expect(items[0].dateOnly).toBe(false);
  });

  it('reads article links and their timestamps, and JSON-LD when the page has no anchors', () => {
    const linked = parsePage(`<article><a href="/news/local/storm">Valley storm warning</a><time datetime="2026-11-14T18:00:00-07:00"></time></article>`, 'https://kutv.com/news/local', 'a[href*="/news/local/"]', 'time');
    expect(linked[0].title).toBe('Valley storm warning');
    expect(linked[0].url).toBe('https://kutv.com/news/local/storm');
    const script = parsePage(`<script type="application/ld+json">{"@type":"NewsArticle","headline":"Crews reopen the freeway","url":"https://kutv.com/news/local/freeway","datePublished":"2026-11-14T22:25:58.000-07:00"}</script>`, 'https://kutv.com/news/local', 'a[href*="/news/local/"]', 'time');
    expect(script[0].title).toBe('Crews reopen the freeway');
    expect(script[0].dateOnly).toBe(false);
  });

  it('takes the news sitemap listed in robots.txt', () => {
    expect(newsSitemapFromRobots('User-agent: *\nSitemap: https://example.com/sitemap.xml\nSitemap: https://example.com/news-sitemap.xml\n')).toBe('https://example.com/news-sitemap.xml');
    expect(newsSitemapFromRobots('user-agent: *\nallow: /\n')).toBeNull();
  });
});

describe('utah relevance and validation', () => {
  it('keeps a Utah place and sends a national wire headline to the grouping call', async () => {
    expect(mentionsUtah('Airport reopens in Salt Lake', '', 'https://www.ksl.com/article/1')).toBe(true);
    expect(mentionsUtah('Title fight in New York', '', 'https://www.ksl.com/article/2/fight')).toBe(false);
    const seen: string[][] = [];
    const result = await collectNews({
      now: NOW,
      window: '6h',
      sources: [{ id: 'ksl', name: 'KSL.com', type: 'newsmap', url: 'https://www.ksl.com/google-news-sitemap.xml', kind: 'outlet', enabled: true, utahFilter: true }],
      fetchText: async () => ({ ok: true, text: `<?xml version="1.0"?><urlset>
        <url><loc>https://www.ksl.com/article/1/salt-lake-vote</loc><news:title>Salt Lake delays the vote</news:title><news:publication_date>2026-11-14T18:00:00Z</news:publication_date></url>
        <url><loc>https://www.ksl.com/article/2/fight</loc><news:title>Title fight in New York</news:title><news:publication_date>2026-11-14T18:30:00Z</news:publication_date></url>
        <url><loc>https://www.ksl.com/article/3/old</loc><news:title>Old Utah note</news:title><news:publication_date>2026-11-01</news:publication_date></url>
      </urlset>` }),
      decideUtah: async (titles) => { seen.push(titles); return titles.map((title) => title.includes('New York')); },
    });
    expect(seen).toEqual([['Title fight in New York']]);
    expect(result.items.map((item) => item.title)).toEqual(['Title fight in New York', 'Salt Lake delays the vote']);
    expect(result.items.some((item) => item.dateOnly)).toBe(false);
    expect(result.sources[0].status).toBe('ok');
  });

  it('keeps a failed source and records why', async () => {
    const result = await collectNews({
      now: NOW,
      sources: [
        { id: 'deseret', name: 'Deseret News', type: 'rss', url: 'https://www.deseret.com/rss/index.xml', kind: 'outlet', enabled: true },
        { id: 'udot', name: 'UDOT Traffic events', type: 'api', url: 'https://udottraffic.utah.gov/developers/doc', kind: 'agency', enabled: true },
      ],
      fetchText: async () => ({ ok: false, error: 'The page was not found.' }),
    });
    expect(result.sources.map((source) => source.status)).toEqual(['failed', 'failed']);
    expect(result.sources[0].error).toBe('The page was not found.');
    expect(result.sources[1].error).toMatch(/UDOT developer key/);
    expect(result.items).toEqual([]);
  });

  it('treats an empty weather alert list as a live source and rejects an HTML page', async () => {
    const quiet = await collectNews({
      now: NOW,
      sources: [{ id: 'nws-utah', name: 'National Weather Service (Utah alerts)', type: 'nws', url: 'https://api.weather.gov/alerts/active?area=UT', kind: 'agency', enabled: true }],
      fetchText: async () => ({ ok: true, text: '{"type":"FeatureCollection","features":[],"updated":"2026-11-15T07:09:49+00:00"}' }),
    });
    expect(quiet.sources[0].status).toBe('ok');
    expect(quiet.items).toEqual([]);
    const page = await collectNews({
      now: NOW,
      sources: [{ id: 'kslnewsradio', name: 'KSL NewsRadio', type: 'rss', url: 'https://kslnewsradio.com/feed/', kind: 'outlet', enabled: true }],
      fetchText: async () => ({ ok: true, text: '<!doctype html><html><title>KSL</title></html>' }),
    });
    expect(page.sources[0]).toMatchObject({ status: 'failed', error: 'The address returned a web page, not a feed.' });
  });

  it('does not let a date-only item through the short windows', async () => {
    const result = await collectNews({
      now: new Date('2026-11-14T08:00:00.000Z'),
      window: '3h',
      sources: [{ id: 'ksl', name: 'KSL.com', type: 'newsmap', url: 'https://www.ksl.com/map.xml', kind: 'outlet', enabled: true }],
      fetchText: async () => ({ ok: true, text: '<urlset><url><loc>https://www.ksl.com/article/9/utah-note</loc><news:title>Utah note</news:title><news:publication_date>2026-11-14</news:publication_date></url></urlset>' }),
    });
    expect(result.sources[0].status).toBe('ok');
    expect(result.items).toEqual([]);
    const week = await collectNews({
      now: new Date('2026-11-14T08:00:00.000Z'),
      window: '7d',
      sources: result.sources,
      fetchText: async () => ({ ok: true, text: '<urlset><url><loc>https://www.ksl.com/article/9/utah-note</loc><news:title>Utah note</news:title><news:publication_date>2026-11-14</news:publication_date></url></urlset>' }),
    });
    expect(week.items[0].dateOnly).toBe(true);
  });
});

describe('seed', () => {
  it('fills the list when brand settings have no sources and leaves a saved failure in place', () => {
    const seeded = normalizeNewsSources(undefined);
    expect(seeded.find((source) => source.id === 'ksl')?.type).toBe('newsmap');
    expect(seeded.find((source) => source.id === 'kutv')).toMatchObject({ type: 'page', url: 'https://kutv.com/news/local' });
    expect(seeded.find((source) => source.id === 'utcourts')?.url).toBe('https://legacy.utcourts.gov/utc/news/feed/');
    expect(seeded.find((source) => source.id === 'parkrecord')?.enabled).toBe(false);
    const saved = normalizeNewsSources([{ id: 'deseret', name: 'Deseret News', type: 'rss', url: 'https://www.deseret.com/rss/index.xml', kind: 'outlet', enabled: true, status: 'failed', checkedAt: '2026-11-14T00:00:00.000Z', error: 'The page was not found.' }]);
    expect(saved).toHaveLength(1);
    expect(saved[0].status).toBe('failed');
    expect(saved[0].error).toBe('The page was not found.');
  });

  it('includes every outlet domain in the credit list', async () => {
    const { creditOutlets } = await import('@/lib/scoop-brand');
    const hosts = creditOutlets({ outlets: ['sltrib.com'], newsSources: NEWS_SEED });
    for (const host of ['ksl.com', 'kutv.com', 'kuer.org', 'utahnewsdispatch.com', 'parkrecord.com', 'townlift.com', 'upr.org', 'cityweekly.net', 'fox13now.com', 'abc4.com']) {
      expect(hosts, host).toContain(host);
    }
    expect(hosts).not.toContain('police.slc.gov');
    expect(hosts).not.toContain('api.weather.gov');
  });
});
