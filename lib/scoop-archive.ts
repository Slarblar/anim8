/**
 * Post archive: every shared or downloaded post is kept for ARCHIVE_DAYS so the team
 * can reopen it and fix a mistake. Two collections hold it:
 *   archive/<id>       small summary for the list (headline, thumbnail, times, uploaded photo URLs)
 *   archiveposts/<id>  the full editable post
 * Anything first archived more than ARCHIVE_DAYS ago is deleted, with the photos it uploaded.
 */
export const ARCHIVE_DAYS = 7;
export const ARCHIVE_MS = ARCHIVE_DAYS * 24 * 60 * 60 * 1000;

export type ArchiveSummary = { id: string; createdAt?: unknown; assets?: unknown };

/** The post's age counts from its first export; corrections don't extend it. */
export function archiveExpired(entry: ArchiveSummary, now = Date.now()): boolean {
  const created = Number(entry.createdAt);
  if (!Number.isFinite(created) || created <= 0) return false;
  return now - created > ARCHIVE_MS;
}

/** Splits a listing into what stays and what to delete (with the uploaded photo URLs to remove). */
export function splitArchive<T extends ArchiveSummary>(entries: T[], now = Date.now()) {
  const keep: T[] = [];
  const expired: { id: string; assets: string[] }[] = [];
  for (const e of entries) {
    if (archiveExpired(e, now)) {
      const assets = Array.isArray(e.assets) ? e.assets.filter((u): u is string => typeof u === 'string') : [];
      expired.push({ id: e.id, assets });
    } else keep.push(e);
  }
  return { keep, expired };
}
