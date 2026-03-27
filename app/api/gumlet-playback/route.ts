import { NextRequest, NextResponse } from 'next/server'

const BROWSER_UA =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36'

function decodeHtmlAttrUrl(url: string) {
  return url.replace(/&amp;/gi, '&').replace(/&quot;/g, '"').replace(/&#39;/g, "'")
}

function extractHlsFromJsonLd(raw: string): string | null {
  try {
    const data = JSON.parse(raw.trim()) as Record<string, unknown>
    const candidates: unknown[] = []
    if (Array.isArray(data['@graph'])) {
      candidates.push(...data['@graph'])
    } else {
      candidates.push(data)
    }
    for (const node of candidates) {
      if (!node || typeof node !== 'object') continue
      const o = node as { contentUrl?: unknown; '@type'?: unknown }
      const u = o.contentUrl
      if (typeof u === 'string' && u.includes('main.m3u8')) {
        return decodeHtmlAttrUrl(u)
      }
    }
  } catch {
    /* ignore */
  }
  return null
}

export async function GET(request: NextRequest) {
  const id = request.nextUrl.searchParams.get('id')
  if (!id || !/^[a-zA-Z0-9]+$/.test(id)) {
    return NextResponse.json({ error: 'Invalid id' }, { status: 400 })
  }

  let html: string
  try {
    const res = await fetch(`https://play.gumlet.io/embed/${id}`, {
      headers: { 'User-Agent': BROWSER_UA },
    })
    if (!res.ok) return NextResponse.json({ hls: null })
    html = await res.text()
  } catch {
    return NextResponse.json({ hls: null })
  }

  const ldBlocks = [
    ...html.matchAll(/<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi),
  ]
  for (const m of ldBlocks) {
    const hls = extractHlsFromJsonLd(m[1])
    if (hls) {
      return NextResponse.json(
        { hls },
        { headers: { 'Cache-Control': 'public, max-age=3600, stale-while-revalidate=86400' } },
      )
    }
  }

  const loose = html.match(/https:\/\/video\.gumlet\.io\/[a-zA-Z0-9]+\/[a-zA-Z0-9]+\/main\.m3u8/)
  if (loose?.[0]) {
    return NextResponse.json(
      { hls: loose[0] },
      { headers: { 'Cache-Control': 'public, max-age=3600, stale-while-revalidate=86400' } },
    )
  }

  const og =
    html.match(/<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']+)["']/)?.[1]
    ?? html.match(/<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:image["']/)?.[1]
  if (og) {
    const decoded = decodeHtmlAttrUrl(og)
    const prefix = decoded.match(/^(https:\/\/video\.gumlet\.io\/[a-zA-Z0-9]+\/[a-zA-Z0-9]+)\//)
    if (prefix) {
      return NextResponse.json(
        { hls: `${prefix[1]}/main.m3u8` },
        { headers: { 'Cache-Control': 'public, max-age=3600, stale-while-revalidate=86400' } },
      )
    }
  }

  return NextResponse.json({ hls: null })
}
