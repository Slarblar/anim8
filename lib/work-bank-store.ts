import 'server-only';

import { customAlphabet } from 'nanoid';
import { getKv } from './kv';
import { isWorkTag, type WorkInput, type WorkPiece, type WorkTag } from './work-bank';

const KEY = 'work-bank:pieces';
const newId = customAlphabet('abcdefghijklmnopqrstuvwxyz0123456789', 12);

function isPiece(value: unknown): value is WorkPiece {
  if (!value || typeof value !== 'object') return false;
  const piece = value as WorkPiece;
  return (
    typeof piece.id === 'string' &&
    typeof piece.title === 'string' &&
    typeof piece.client === 'string' &&
    typeof piece.year === 'string' &&
    typeof piece.imageUrl === 'string' &&
    typeof piece.gumletUrl === 'string' &&
    Array.isArray(piece.tags) &&
    piece.tags.every((tag) => typeof tag === 'string' && isWorkTag(tag))
  );
}

async function readAll(): Promise<WorkPiece[]> {
  const raw = await getKv().get<unknown>(KEY);
  if (!Array.isArray(raw)) return [];
  return raw.filter(isPiece).map((piece) => ({
    ...piece,
    stat: typeof piece.stat === 'string' ? piece.stat : '',
  }));
}

async function writeAll(pieces: WorkPiece[]): Promise<void> {
  await getKv().set(KEY, pieces);
}

export async function listWorkPieces(): Promise<WorkPiece[]> {
  try {
    const pieces = await readAll();
    return pieces.sort((a, b) => (b.updatedAt || '').localeCompare(a.updatedAt || ''));
  } catch (err) {
    console.error('Work bank read failed', err);
    return [];
  }
}

export async function createWorkPiece(input: WorkInput): Promise<WorkPiece> {
  const now = new Date().toISOString();
  const piece: WorkPiece = {
    id: newId(),
    title: input.title,
    client: input.client,
    year: input.year,
    imageUrl: input.imageUrl,
    gumletUrl: input.gumletUrl,
    tags: input.tags as WorkTag[],
    stat: input.stat,
    createdAt: now,
    updatedAt: now,
  };
  const pieces = await readAll();
  pieces.unshift(piece);
  await writeAll(pieces);
  return piece;
}

export async function updateWorkPiece(id: string, input: WorkInput): Promise<WorkPiece | null> {
  const pieces = await readAll();
  const index = pieces.findIndex((piece) => piece.id === id);
  if (index < 0) return null;
  const current = pieces[index];
  const next: WorkPiece = {
    ...current,
    title: input.title,
    client: input.client,
    year: input.year,
    imageUrl: input.imageUrl,
    gumletUrl: input.gumletUrl,
    tags: input.tags,
    stat: input.stat,
    updatedAt: new Date().toISOString(),
  };
  pieces[index] = next;
  await writeAll(pieces);
  return next;
}

export async function deleteWorkPiece(id: string): Promise<boolean> {
  const pieces = await readAll();
  const next = pieces.filter((piece) => piece.id !== id);
  if (next.length === pieces.length) return false;
  await writeAll(next);
  return true;
}
