import { createClient, type VercelKV } from '@vercel/kv';
import { customAlphabet } from 'nanoid';
import type { ClientFieldFilter } from './asana';

function getKvUrl(): string {
  return (
    process.env.STORAGE_KV_REST_API_URL ??
    process.env.KV_REST_API_URL ??
    ''
  );
}

function getKvToken(): string {
  return (
    process.env.STORAGE_KV_REST_API_TOKEN ??
    process.env.KV_REST_API_TOKEN ??
    ''
  );
}

let kv: VercelKV | null = null;

function getKv(): VercelKV {
  if (!kv) {
    kv = createClient({
      url: getKvUrl(),
      token: getKvToken(),
    });
  }
  return kv;
}

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
  active: boolean;
  createdAt: string;
};

const KEY_PREFIX = 'client-portal:';

/** ANIM-8 CLIENT INTAKE — every client's submissions land here by default. */
export const DEFAULT_INTAKE_PROJECT_GID = '1216732614798537';
/** "Untitled section" — the default landing spot within that project. */
export const DEFAULT_INTAKE_SECTION_GID = '1216732614798538';

export async function getClientBySlug(slug: string): Promise<ClientRecord | null> {
  const record = await getClientRecordBySlug(slug);
  if (!record || !record.active) return null;
  return record;
}

async function getClientRecordBySlug(slug: string): Promise<ClientRecord | null> {
  return getKv().get<ClientRecord>(`${KEY_PREFIX}${slug}`);
}

function validateSlug(slug: string): void {
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) {
    throw new Error(
      'Slug must be lowercase letters, numbers, and hyphens only (e.g. turnemsideways-2026).'
    );
  }
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
}): Promise<ClientRecord> {
  const slug = input.slug ?? `${slugify(input.displayName)}-${nanoid()}`;
  validateSlug(slug);

  const existing = await getClientRecordBySlug(slug);
  if (existing?.active) {
    throw new Error(`Slug already in use: ${slug}`);
  }

  const record: ClientRecord = {
    slug,
    displayName: input.displayName,
    contactEmail: input.contactEmail,
    filters: input.filters,
    intakeProjectGid: input.intakeProjectGid ?? DEFAULT_INTAKE_PROJECT_GID,
    intakeSectionGid: input.intakeSectionGid ?? DEFAULT_INTAKE_SECTION_GID,
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
  await getKv().set(`${KEY_PREFIX}${oldSlug}`, { ...oldRecord, active: false });
  return record;
}

/** Revoke a link without losing history — flip `active` back to restore it. */
export async function deactivateClientLink(slug: string): Promise<void> {
  const record = await getKv().get<ClientRecord>(`${KEY_PREFIX}${slug}`);
  if (!record) return;
  await getKv().set(`${KEY_PREFIX}${slug}`, { ...record, active: false });
}

function slugify(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}
