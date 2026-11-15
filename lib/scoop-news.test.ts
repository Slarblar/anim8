import { describe, expect, it } from 'vitest';
import {
  acceptSearchItems,
  collectNews,
  denverMidnight,
  failureDetail,
  groupStories,
  isUtahStory,
  newsSitemapFromRobots,
  normalizeNewsSources,
  parseFeed,
  parseNewsSitemap,
  parsePage,
  passesWindow,
  NEWS_SEED,
  type NewsSource,
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

  it('reads article links and their timestamps, and JSON-LD when the page has no anchors', async () => {
    const linked = await parsePage(`<article><a href="/news/local/storm">Valley storm warning</a><time datetime="2026-11-14T18:00:00-07:00"></time></article>`, 'https://kutv.com/news/local', 'a[href*="/news/local/"]', 'time');
    expect(linked[0].title).toBe('Valley storm warning');
    expect(linked[0].url).toBe('https://kutv.com/news/local/storm');
    const script = await parsePage(`<script type="application/ld+json">{"@type":"NewsArticle","headline":"Crews reopen the freeway","url":"https://kutv.com/news/local/freeway","datePublished":"2026-11-14T22:25:58.000-07:00"}</script>`, 'https://kutv.com/news/local', 'a[href*="/news/local/"]', 'time');
    expect(script[0].title).toBe('Crews reopen the freeway');
    expect(script[0].dateOnly).toBe(false);
  });

  it('takes the news sitemap listed in robots.txt', () => {
    expect(newsSitemapFromRobots('User-agent: *\nSitemap: https://example.com/sitemap.xml\nSitemap: https://example.com/news-sitemap.xml\n')).toBe('https://example.com/news-sitemap.xml');
    expect(newsSitemapFromRobots('user-agent: *\nallow: /\n')).toBeNull();
  });
});

describe('utah relevance and validation', () => {
  it('keeps a story set in Utah and drops a story from another state', async () => {
    expect(isUtahStory({ title: 'Airport reopens in Salt Lake', url: 'https://www.ksl.com/article/1' })).toBe(true);
    expect(isUtahStory({ title: 'Title fight in New York', summary: 'A Utahn is on the card', url: 'https://www.ksl.com/article/2/fight' })).toBe(false);
    expect(isUtahStory({ title: 'Logan council meets', url: 'https://example.com/logan' })).toBe(false);
    expect(isUtahStory({ title: 'Logan council meets', url: 'https://www.ksl.com/article/logan' })).toBe(true);
    expect(isUtahStory({ location: 'New York', title: 'Salt Lake reacts to the ruling', summary: 'Local leaders commented.', url: 'https://www.ksl.com/article/react' })).toBe(false);
    expect(isUtahStory({ location: 'Statewide', title: 'Lawmakers pass the bill', summary: 'The Utah legislature voted.', url: 'https://www.ksl.com/article/bill' })).toBe(true);
    expect(isUtahStory({ title: 'Real Salt Lake falls in Los Angeles', url: 'https://www.ksl.com/article/rsl' })).toBe(false);
    expect(isUtahStory({ title: 'UDOT closes the freeway', summary: 'Crews are in Salt Lake.', url: 'https://udot.utah.gov/alert' })).toBe(true);
    expect(isUtahStory({ title: 'BYU plays Saturday in Texas', text: 'The game is in Austin.', url: 'https://www.ksl.com/article/byu' })).toBe(false);
    const result = await collectNews({
      now: NOW,
      window: '6h',
      sources: [{ id: 'ksl', name: 'KSL.com', type: 'newsmap', url: 'https://www.ksl.com/google-news-sitemap.xml', kind: 'outlet', enabled: true, utahFilter: true }],
      fetchText: async () => ({ ok: true, text: `<?xml version="1.0"?><urlset>
        <url><loc>https://www.ksl.com/article/1/salt-lake-vote</loc><news:title>Salt Lake delays the vote</news:title><news:publication_date>2026-11-14T18:00:00Z</news:publication_date></url>
        <url><loc>https://www.ksl.com/article/2/fight</loc><news:title>Title fight in New York</news:title><news:publication_date>2026-11-14T18:30:00Z</news:publication_date></url>
        <url><loc>https://www.ksl.com/article/3/old</loc><news:title>Old Utah note</news:title><news:publication_date>2026-11-01</news:publication_date></url>
      </urlset>` }),
    });
    expect(result.items.map((item) => item.title)).toEqual(['Salt Lake delays the vote']);
    expect(result.held).toEqual([]);
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

describe('a source can fail without taking the list down', () => {
  const rss = `<rss><channel><item><title>Salt Lake council delays the vote</title><link>https://www.sltrib.com/news/vote/</link><pubDate>Sat, 14 Nov 2026 18:00:00 GMT</pubDate></item></channel></rss>`;

  it('returns the feed that loaded when another source throws', async () => {
    const result = await collectNews({
      now: NOW,
      window: '6h',
      sources: [
        { id: 'a', name: 'Broken', type: 'rss', url: 'https://broken.example/feed', kind: 'outlet', enabled: true },
        { id: 'b', name: 'Tribune', type: 'rss', url: 'https://www.sltrib.com/feed', kind: 'outlet', enabled: true },
      ],
      fetchText: async (url) => {
        if (url.includes('broken')) throw new Error('boom');
        return { ok: true, text: rss, status: 200 };
      },
    });
    expect(result.items.map((item) => item.sourceId)).toEqual(['b']);
    expect(result.reports.find((row) => row.name === 'Broken')).toMatchObject({ status: 'failed', reason: 'Could not parse the feed' });
    expect(result.reports.find((row) => row.name === 'Tribune')?.status).toBe('ok');
  });

  it('disables a source after three blocked responses and does not fetch it again', async () => {
    expect(failureDetail({ ok: false, error: 'refused', httpStatus: 403 })).toEqual({ reason: 'Blocked (403)', blocked: true, httpStatus: 403 });
    expect(failureDetail({ ok: false, error: 'slow', timeout: true }).reason).toBe('Timed out');
    let calls = 0;
    const fetchText = async () => {
      calls += 1;
      return { ok: false as const, error: 'The site refused the reader.', httpStatus: 403, blocked: true };
    };
    let sources: NewsSource[] = [{ id: 'park', name: 'Park Record', type: 'rss', url: 'https://www.parkrecord.com/feed/', kind: 'outlet', enabled: true }];
    for (let i = 0; i < 3; i += 1) {
      sources = (await collectNews({ now: NOW, window: '6h', recheck: true, sources, fetchText })).sources;
    }
    expect(sources[0].enabled).toBe(false);
    expect(sources[0].failures).toBe(3);
    expect(sources[0].reason).toContain('Blocked (403)');
    calls = 0;
    const again = await collectNews({ now: NOW, window: '6h', sources, fetchText });
    expect(calls).toBe(0);
    expect(again.reports[0]).toMatchObject({ status: 'disabled', httpStatus: 403 });
  });
});

describe('web search results', () => {
  it('drops a row whose URL was not in the search, whose time is missing, or that is older than the window', () => {
    const allowed = ['https://www.ksl.com/article/1/storm', 'https://ksl.com/article/2/old'];
    const items = acceptSearchItems([
      { title: 'Valley storm warning', url: 'https://ksl.com/article/1/storm?utm=1', outlet: 'KSL', published: '2026-11-14T18:30:00Z', summary: 'A storm hit Salt Lake.', location: 'Salt Lake City', category: 'Weather' },
      { title: 'Salt Lake reacts to the vote', url: 'https://ksl.com/article/3/reaction', outlet: 'KSL', published: '2026-11-14T18:40:00Z', summary: 'Leaders commented from home.', location: 'New York', category: 'Politics' },
      { title: 'Made up', url: 'https://example.com/nope', published: '2026-11-14T18:30:00Z', summary: 'No.' },
      { title: 'No time', url: 'https://ksl.com/article/1/storm', published: null, summary: 'Missing.' },
      { title: 'Date only', url: 'https://ksl.com/article/1/storm', published: '2026-11-14', summary: 'Midnight.' },
      { title: 'Old storm warning', url: 'https://www.ksl.com/article/2/old', published: '2026-11-13T00:00:00Z', summary: 'Old.' },
    ], allowed, 6, NOW);
    expect(items).toHaveLength(1);
    expect(items[0].title).toBe('Valley storm warning');
    expect(items[0].url).toContain('ksl.com/article/1/storm');
  });

  it('drops a homepage and keeps an article from the same search', () => {
    const items = acceptSearchItems([
      { title: 'FOX 13 Utah and Salt Lake City', url: 'https://www.fox13now.com/', published: 'today', summary: 'Home.', location: 'Salt Lake City' },
      { title: 'Salt Lake council meets', url: 'https://ksl.com/article/9/today', published: '2 hours ago', summary: 'The council met in Salt Lake.', location: 'Salt Lake City' },
    ], ['https://www.fox13now.com/', 'https://ksl.com/article/9/today'], 6, NOW);
    expect(items.map((item) => item.title)).toEqual(['Salt Lake council meets']);
  });

  it('treats "0 days ago" as today and keeps it in a 6 hour window', () => {
    const items = acceptSearchItems([
      { title: 'BYU beats Baylor in Provo', url: 'https://www.sltrib.com/sports/byu-cougars/2026/11/14/byu-football-beats-baylor-28-7/', published: '0 days ago', summary: 'BYU won in Provo.', location: 'Provo' },
    ], ['https://www.sltrib.com/sports/byu-cougars/2026/11/14/byu-football-beats-baylor-28-7/'], 6, NOW);
    expect(items).toHaveLength(1);
    expect(items[0].timeConfirmed).toBe(true);
  });

  it('groups the same story by URL and by a similar headline', () => {
    const groups = groupStories([
      { title: 'Salt Lake council delays the vote', url: 'https://www.ksl.com/a' },
      { title: 'Salt Lake council delays the vote tonight', url: 'https://www.sltrib.com/b' },
      { title: 'Freeway closes after the crash', url: 'https://kutv.com/c' },
      { title: 'Freeway closes after the crash', url: 'https://www.ksl.com/a' },
    ]);
    expect(groups).toHaveLength(2);
    expect(groups[0]).toHaveLength(3);
  });
});

describe('search result ages', () => {
  const now = new Date('2026-11-15T09:00:00Z');
  it('uses the age the search result showed when the model gives no time', async () => {
    const { acceptSearchItems, emptySearchStats } = await import('@/lib/scoop-news');
    const stats = emptySearchStats();
    const items = acceptSearchItems([
      { title: 'Crash closes I-15 in Lehi', url: 'http://www.ksl.com/article/9/crash', outlet: 'KSL', published: null, summary: 'A crash closed I-15 in Lehi, Utah County.', location: 'Lehi' },
      { title: 'Sandy council votes on budget', url: 'https://www.fox13now.com/news/sandy-budget', outlet: 'FOX 13', published: 'November 15, 2026', summary: 'Sandy City Council in Utah voted.', location: 'Sandy' },
      { title: 'Ogden fire', url: 'https://www.abc4.com/news/ogden-fire', outlet: 'ABC4', published: null, summary: 'A fire in Ogden, Utah.', location: 'Ogden' },
    ], ['https://www.ksl.com/article/9/crash', 'https://www.fox13now.com/news/sandy-budget', 'https://www.abc4.com/news/ogden-fire'], 12, now, {
      ages: { 'https://www.ksl.com/article/9/crash': '2 hours ago' },
      stats,
    });
    expect(items.map((i) => i.title)).toEqual(['Crash closes I-15 in Lehi', 'Sandy council votes on budget']);
    expect(items[0].timeConfirmed).toBe(true);
    expect(items[1].timeConfirmed).toBe(false);
    expect(stats.noDate).toBe(1);
  });
  it('keeps date-only stories out of 3h and 6h windows', async () => {
    const { acceptSearchItems } = await import('@/lib/scoop-news');
    const items = acceptSearchItems([
      { title: 'Sandy council votes on budget', url: 'https://www.fox13now.com/news/sandy-budget', published: 'November 15, 2026', summary: 'Sandy City Council in Utah voted.', location: 'Sandy' },
    ], ['https://www.fox13now.com/news/sandy-budget'], 6, now);
    expect(items).toHaveLength(0);
  });
});
