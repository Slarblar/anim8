import { createClient, type VercelKV } from '@vercel/kv';

function getKvUrl(): string {
  return process.env.STORAGE_KV_REST_API_URL ?? process.env.KV_REST_API_URL ?? '';
}

function getKvToken(): string {
  return process.env.STORAGE_KV_REST_API_TOKEN ?? process.env.KV_REST_API_TOKEN ?? '';
}

let kv: VercelKV | null = null;

/** Shared Vercel KV client — used by client-registry, crew-directory, pto-requests, etc. */
export function getKv(): VercelKV {
  if (!kv) {
    kv = createClient({
      url: getKvUrl(),
      token: getKvToken(),
    });
  }
  return kv;
}
