import { notFound } from 'next/navigation';
import { ClientScheduleCall } from '@/components/clients/ClientScheduleCall';
import { getClientBySlug } from '@/lib/client-registry';

type PageProps = {
  params: { slug: string };
};

export default async function ClientSchedulePage({ params }: PageProps) {
  const client = await getClientBySlug(params.slug);
  if (!client) notFound();

  return (
    <ClientScheduleCall slug={client.slug} displayName={client.displayName} />
  );
}
