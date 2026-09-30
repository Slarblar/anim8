import { redirect } from 'next/navigation';
import { resolveClientPortal } from '@/lib/client-portal-access';

export const dynamic = 'force-dynamic';

type PageProps = {
  params: { slug: string };
};

/** Older brief-builder links land in the creative session. */
export default async function ClientBriefBuilderPage({ params }: PageProps) {
  const client = await resolveClientPortal(params.slug);
  redirect(`/clients/${client.slug}/new`);
}
