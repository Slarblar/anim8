import { unstable_cache } from 'next/cache';
import 'server-only';

/**
 * Crew avatars — matches crew directory emails to Asana workspace users
 * (same assumption KPI already makes: crew directory email == Asana
 * assignee/user email) to show their Asana profile photo on the status
 * board, falling back to a placeholder when there's no match or no photo.
 *
 * Asana's profile photo URLs are short-lived signed links (they expire a
 * few hours after being issued — see Asana's 2024 CDN migration and 2022
 * "presigned URLs" changes), so we deliberately do NOT cache the photo
 * URL itself. Only the much more stable email -> Asana user gid mapping
 * is cached; the actual photo URL (and the image bytes behind it) are
 * always fetched fresh by the /api/crew/avatar route right before serving.
 */

const ASANA_BASE = 'https://app.asana.com/api/1.0';
const WORKSPACE_GID = process.env.ASANA_WORKSPACE_GID ?? '1210991035370090';

function getToken(): string {
  const token = process.env.ASANA_ACCESS_TOKEN ?? process.env.ASANA_PAT;
  if (!token) {
    throw new Error('ASANA_ACCESS_TOKEN or ASANA_PAT is not set');
  }
  return token;
}

type AsanaWorkspaceUser = { gid: string; email: string | null };
type AsanaUserPhoto = { photo: { image_128x128: string | null } | null };

/**
 * email (lowercased) -> Asana user gid, for everyone in the workspace.
 * Cached for 24h — who's in the workspace barely changes day to day, and
 * a stale entry just means a newly-added person's avatar shows the
 * placeholder for up to a day, not anything broken.
 */
const getWorkspaceUserEmailMap = unstable_cache(
  async (): Promise<Record<string, string>> => {
    const map: Record<string, string> = {};
    let offset: string | undefined;

    do {
      const params = new URLSearchParams({ opt_fields: 'email', limit: '100' });
      if (offset) params.set('offset', offset);

      const res = await fetch(`${ASANA_BASE}/workspaces/${WORKSPACE_GID}/users?${params.toString()}`, {
        headers: { Authorization: `Bearer ${getToken()}` },
      });
      if (!res.ok) throw new Error(`Asana workspace users fetch failed: ${res.status}`);

      const json = await res.json();
      for (const user of (json.data ?? []) as AsanaWorkspaceUser[]) {
        if (user.email) map[user.email.toLowerCase()] = user.gid;
      }
      offset = json.next_page?.offset;
    } while (offset);

    return map;
  },
  ['asana-workspace-user-emails'],
  { revalidate: 60 * 60 * 24, tags: ['asana-users'] }
);

/**
 * Live (uncached) lookup of a single user's current profile photo URL.
 * Returns null if the user has no photo set. Throws on API failure —
 * callers should treat any failure the same as "no photo" (fall back to
 * the placeholder) rather than breaking the whole status board.
 */
async function getAsanaUserPhotoUrl(gid: string): Promise<string | null> {
  const res = await fetch(`${ASANA_BASE}/users/${gid}?opt_fields=photo.image_128x128`, {
    headers: { Authorization: `Bearer ${getToken()}` },
    cache: 'no-store',
  });
  if (!res.ok) throw new Error(`Asana user photo fetch failed: ${res.status}`);

  const json = await res.json();
  const data = json.data as AsanaUserPhoto;
  return data.photo?.image_128x128 ?? null;
}

/**
 * Full pipeline for one email: workspace membership -> current photo URL
 * -> image bytes, all fetched fresh except the (stable) email->gid map.
 * Returns null anywhere along the chain the person can't be matched to a
 * photo — /api/crew/avatar treats that as "serve the placeholder".
 */
export async function fetchAsanaAvatarBytes(
  email: string
): Promise<{ bytes: ArrayBuffer; contentType: string } | null> {
  const gid = (await getWorkspaceUserEmailMap())[email.toLowerCase()];
  if (!gid) return null;

  const photoUrl = await getAsanaUserPhotoUrl(gid);
  if (!photoUrl) return null;

  const imageRes = await fetch(photoUrl, { cache: 'no-store' });
  if (!imageRes.ok) return null;

  return {
    bytes: await imageRes.arrayBuffer(),
    // NOT `imageRes.headers.get('content-type')` — Asana's S3-backed photo
    // URLs serve the object as `binary/octet-stream` regardless of actual
    // format (a known Asana API quirk), which browsers refuse to render as
    // an <img>. We only ever request `image_128x128`, and Asana's docs
    // guarantee every size except 1024 is PNG, so this is always correct.
    contentType: 'image/png',
  };
}
