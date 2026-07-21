import { resolveClientPortal } from '@/lib/client-portal-access';
import { ClientScheduleCall } from '@/components/clients/ClientScheduleCall';

type PageProps = {
  params: { slug: string };
};

export default async function ClientSchedulePage({ params }: PageProps) {
  const client = await resolveClientPortal(params.slug);

  return (
    <ClientScheduleCall slug={client.slug} displayName={client.displayName} />
  );
}
