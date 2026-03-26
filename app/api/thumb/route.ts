import { NextRequest, NextResponse } from 'next/server'

const BROWSER_UA = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36'

/** Gumlet meta tags use `&amp;` in attribute values; fetch() needs real `&`. */
function decodeHtmlAttrUrl(url: string) {
  return url
    .replace(/&amp;/gi, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
}

async function resolveThumbUrl(id: string): Promise<string | null> {
  // 1. Try the legacy shortcut (often 403 now — Gumlet uses collection-prefixed paths)
  const simple = `https://video.gumlet.io/${id}/thumbnail.jpg`
  try {
    const res = await fetch(simple, { method: 'HEAD', headers: { 'User-Agent': BROWSER_UA } })
    if (res.ok) return simple
  } catch { /* ignore */ }

  // 2. Embed page — og:image and/or JSON-LD carry the real thumbnail-1-0.png URL
  let html: string
  try {
    html = await fetch(`https://play.gumlet.io/embed/${id}`, {
      headers: { 'User-Agent': BROWSER_UA },
    }).then(r => r.text())
  } catch {
    return null
  }

  const og =
    html.match(/<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']+)["']/)?.[1]
    ?? html.match(/<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:image["']/)?.[1]
  if (og) return decodeHtmlAttrUrl(og)

  const ldBlocks = [...html.matchAll(/<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)]
  for (const m of ldBlocks) {
    try {
      const data = JSON.parse(m[1].trim()) as { thumbnailUrl?: string }
      const u = data.thumbnailUrl
      if (u && /^https?:\/\//i.test(u)) return decodeHtmlAttrUrl(u)
    } catch { /* ignore */ }
  }

  return null
}

export async function GET(request: NextRequest) {
  const id = new URL(request.url).searchParams.get('id')
  if (!id || !/^[a-zA-Z0-9]+$/.test(id)) {
    return new NextResponse('Bad Request', { status: 400 })
  }

  const thumbUrl = await resolveThumbUrl(id)
  if (!thumbUrl) return new NextResponse('Not Found', { status: 404 })

  const imgRes = await fetch(thumbUrl, { headers: { 'User-Agent': BROWSER_UA } })
  if (!imgRes.ok) return new NextResponse('Not Found', { status: 404 })
  const buffer = await imgRes.arrayBuffer()
  const ct = imgRes.headers.get('content-type')?.split(';')[0]?.trim() || 'image/jpeg'

  return new NextResponse(buffer, {
    headers: {
      'Content-Type':  ct,
      'Cache-Control': 'public, max-age=86400, stale-while-revalidate=604800',
    },
  })
}
