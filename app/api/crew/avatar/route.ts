import { NextRequest, NextResponse } from 'next/server';
import { requireCrewSession } from '@/lib/auth-guards';
import { fetchAsanaAvatarBytes } from '@/lib/asana-users';

const PLACEHOLDER_PATH = '/images/avatars/avatar-placeholder.png';

/**
 * Proxies a crew member's Asana profile photo (matched by email) so the
 * browser never has to deal with Asana's short-lived signed photo URLs
 * directly, and so we don't need to allowlist Asana's CDN domain in
 * next.config.js. Falls back to a static placeholder whenever there's no
 * Asana account match, no photo set, or any upstream error — this route
 * always resolves to *something* displayable.
 *
 * Gated by the same crew session check as everything else under
 * /api/crew — middleware already protects this path too, but every route
 * handler re-checks per the "don't couple API auth to middleware" rule.
 */
export async function GET(req: NextRequest) {
  const session = await requireCrewSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const email = req.nextUrl.searchParams.get('email');
  if (!email) {
    return NextResponse.redirect(new URL(PLACEHOLDER_PATH, req.url));
  }

  try {
    const avatar = await fetchAsanaAvatarBytes(email);
    if (!avatar) {
      return NextResponse.redirect(new URL(PLACEHOLDER_PATH, req.url), {
        headers: { 'Cache-Control': 'private, max-age=300' },
      });
    }

    return new NextResponse(avatar.bytes, {
      headers: {
        'Content-Type': avatar.contentType,
        // Signed source URL is fresh every fetch, but the photo behind it
        // rarely changes — an hour of browser caching is a good tradeoff.
        'Cache-Control': 'private, max-age=3600',
      },
    });
  } catch {
    // Asana hiccup — never let an avatar failure break the status board.
    return NextResponse.redirect(new URL(PLACEHOLDER_PATH, req.url), {
      headers: { 'Cache-Control': 'private, max-age=60' },
    });
  }
}
