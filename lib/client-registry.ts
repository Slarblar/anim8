import { customAlphabet } from 'nanoid';
import { unstable_noStore as noStore } from 'next/cache';
import type { ClientFieldFilter } from './asana';
import { getKv } from './kv';

// Lowercase alphanumeric only, 10 chars — no ambiguous characters, easy to
// read aloud if you ever need to give someone a link over the phone.
const nanoid = customAlphabet('abcdefghijklmnopqrstuvwxyz0123456789', 10);

export type ClientRecord = {
  slug: string;
  displayName: string;
  contactEmail: string;
  /** Which Asana custom field/option value(s) identify this client's tasks */
  filters: ClientFieldFilter[];
  /** Project new submissions get created in — defaults to ANIM-8 CLIENT INTAKE */
  intakeProjectGid: string;
  /** Section within that project — defaults to the top "Untitled section" */
  intakeSectionGid: string;
  /**
   * Public Google Drive folder the client can upload into. Shown on the
   * portal so they don't have to remember the link for large files.
   */
  driveFolderUrl?: string;
  active: boolean;
  /** When a link is renamed, old slug records point here. */
  redirectTo?: string;
  createdAt: string;
};

const KEY_PREFIX = 'client-portal:';

/** Hard-coded fallbacks for links shared before rename metadata existed. */
const LEGACY_SLUG_REDIRECTS: Record<string, string> = {
  'turnemsideways-2026': 'turnemsideways2026',
  turnemsideways: 'turnemsideways2026',
};

/** ANIM-8 CLIENT INTAKE — every client's submissions land here by default. */
export const DEFAULT_INTAKE_PROJECT_GID = '1216732614798537';
/** "New Submissions" — portal requests land here for client review. */
export const DEFAULT_INTAKE_SECTION_GID = '1216734900877796';

export async function getClientBySlug(slug: string): Promise<ClientRecord | null> {
  const record = await getClientRecordBySlug(slug);
  if (!record || !record.active) return null;
  return record;
}

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

/** Active portal whose contact email matches (case-insensitive). */
export async function getClientByEmail(email: string): Promise<ClientRecord | null> {
  const normalized = normalizeEmail(email);
  if (!normalized) return null;

  const records = await listClientRecords();
  return (
    records.find((record) => record.active && normalizeEmail(record.contactEmail) === normalized) ??
    null
  );
}

/** Admin — every client record, active or deactivated, newest first. */
export async function listClientRecords(): Promise<ClientRecord[]> {
  noStore();
  const keys = await getKv().keys(`${KEY_PREFIX}*`);
  if (keys.length === 0) return [];

  const records = await Promise.all(keys.map((key) => getKv().get<ClientRecord>(key)));
  return records
    .filter((record): record is ClientRecord => !!record)
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
}

export async function getClientPortalRedirect(slug: string): Promise<string | null> {
  const legacy = LEGACY_SLUG_REDIRECTS[slug];
  if (legacy) return legacy;

  const record = await getClientRecordBySlug(slug);
  return record?.redirectTo ?? null;
}

async function getClientRecordBySlug(slug: string): Promise<ClientRecord | null> {
  noStore();
  return getKv().get<ClientRecord>(`${KEY_PREFIX}${slug}`);
}

/** Admin — fetch a client record regardless of active/deactivated status. */
export async function getClientRecordForAdmin(slug: string): Promise<ClientRecord | null> {
  return getClientRecordBySlug(slug);
}

function validateSlug(slug: string): void {
  if (!/^[a-z0-9]+$/.test(slug)) {
    throw new Error(
      'Slug must be lowercase letters and numbers only (e.g. turnemsideways2026).'
    );
  }
}

/** Empty string clears the folder. Otherwise must be an https Google Drive URL. */
export function normalizeDriveFolderUrl(raw: string | undefined | null): string | undefined {
  const trimmed = raw?.trim() ?? '';
  if (!trimmed) return undefined;

  let url: URL;
  try {
    url = new URL(trimmed);
  } catch {
    throw new Error('Paste a full Google Drive folder link (https://drive.google.com/...).');
  }

  if (url.protocol !== 'https:') {
    throw new Error('Drive folder link must start with https://');
  }

  const host = url.hostname.toLowerCase();
  if (host !== 'drive.google.com' && host !== 'docs.google.com') {
    throw new Error('Link must be a Google Drive URL (drive.google.com).');
  }

  return url.toString();
}

/**
 * Admin helper — run from scripts/create-client-link.ts, not exposed as a
 * public API route. Generates a random slug unless `slug` is provided.
 */
export async function createClientLink(input: {
  displayName: string;
  contactEmail: string;
  filters: ClientFieldFilter[];
  slug?: string;
  intakeProjectGid?: string;
  intakeSectionGid?: string;
  driveFolderUrl?: string;
}): Promise<ClientRecord> {
  const slug = input.slug ?? `${slugify(input.displayName)}${nanoid()}`;
  validateSlug(slug);

  const existing = await getClientRecordBySlug(slug);
  if (existing?.active) {
    throw new Error(`Slug already in use: ${slug}`);
  }

  const driveFolderUrl = normalizeDriveFolderUrl(input.driveFolderUrl);

  const record: ClientRecord = {
    slug,
    displayName: input.displayName,
    contactEmail: input.contactEmail.trim().toLowerCase(),
    filters: input.filters,
    intakeProjectGid: input.intakeProjectGid ?? DEFAULT_INTAKE_PROJECT_GID,
    intakeSectionGid: input.intakeSectionGid ?? DEFAULT_INTAKE_SECTION_GID,
    ...(driveFolderUrl ? { driveFolderUrl } : {}),
    active: true,
    createdAt: new Date().toISOString(),
  };

  await getKv().set(`${KEY_PREFIX}${slug}`, record);
  return record;
}

/** Move a client to a new slug and deactivate the old link. */
export async function renameClientLink(
  oldSlug: string,
  newSlug: string
): Promise<ClientRecord> {
  validateSlug(newSlug);

  const oldRecord = await getClientRecordBySlug(oldSlug);
  if (!oldRecord) {
    throw new Error(`No client found for slug: ${oldSlug}`);
  }

  const existing = await getClientRecordBySlug(newSlug);
  if (existing?.active) {
    throw new Error(`Slug already in use: ${newSlug}`);
  }

  const record: ClientRecord = { ...oldRecord, slug: newSlug, active: true };
  await getKv().set(`${KEY_PREFIX}${newSlug}`, record);
  await getKv().set(`${KEY_PREFIX}${oldSlug}`, {
    ...oldRecord,
    active: false,
    redirectTo: newSlug,
  });
  return record;
}

/** Revoke a link without losing history — flip `active` back to restore it. */
export async function deactivateClientLink(slug: string): Promise<void> {
  const record = await getKv().get<ClientRecord>(`${KEY_PREFIX}${slug}`);
  if (!record) throw new Error(`No client found for slug: ${slug}`);
  await getKv().set(`${KEY_PREFIX}${slug}`, { ...record, active: false });
}

/** Restore a previously deactivated client link. */
export async function reactivateClientLink(slug: string): Promise<void> {
  const record = await getKv().get<ClientRecord>(`${KEY_PREFIX}${slug}`);
  if (!record) throw new Error(`No client found for slug: ${slug}`);
  await getKv().set(`${KEY_PREFIX}${slug}`, { ...record, active: true, redirectTo: undefined });
}

/** Set or clear the client's public Google Drive folder URL. */
export async function updateClientDriveFolder(
  slug: string,
  raw: string | undefined | null
): Promise<ClientRecord> {
  const record = await getKv().get<ClientRecord>(`${KEY_PREFIX}${slug}`);
  if (!record) throw new Error(`No client found for slug: ${slug}`);

  const driveFolderUrl = normalizeDriveFolderUrl(raw);
  const next: ClientRecord = { ...record };
  if (driveFolderUrl) {
    next.driveFolderUrl = driveFolderUrl;
  } else {
    delete next.driveFolderUrl;
  }

  await getKv().set(`${KEY_PREFIX}${slug}`, next);
  return next;
}

/**
 * Permanently removes a client record from KV — unlike deactivate, this
 * can't be undone (no more "reactivate"). Any other slugs that redirect
 * to this one (via renameClientLink) are cleared so they don't 404 into
 * a dangling redirect.
 */
export async function deleteClientLink(slug: string): Promise<void> {
  const record = await getKv().get<ClientRecord>(`${KEY_PREFIX}${slug}`);
  if (!record) throw new Error(`No client found for slug: ${slug}`);

  const allKeys = await getKv().keys(`${KEY_PREFIX}*`);
  const allRecords = await Promise.all(allKeys.map((key) => getKv().get<ClientRecord>(key)));
  const danglingRedirects = allRecords.filter(
    (r): r is ClientRecord => !!r && r.redirectTo === slug
  );
  await Promise.all(
    danglingRedirects.map((r) => getKv().set(`${KEY_PREFIX}${r.slug}`, { ...r, redirectTo: undefined }))
  );

  await getKv().del(`${KEY_PREFIX}${slug}`);
}

function slugify(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, '');
}
