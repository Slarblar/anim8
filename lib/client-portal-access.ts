import { notFound, redirect } from 'next/navigation';
import {
  getClientBySlug,
  getClientPortalRedirect,
  type ClientRecord,
} from './client-registry';

/** Resolve an active client portal record, following renamed / legacy slugs. */
export async function resolveClientPortal(slug: string): Promise<ClientRecord> {
  const client = await getClientBySlug(slug);
  if (client) return client;

  const redirectSlug = await getClientPortalRedirect(slug);
  if (redirectSlug) redirect(`/clients/${redirectSlug}`);

  notFound();
}
