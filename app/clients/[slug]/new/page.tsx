import { resolveClientPortal } from '@/lib/client-portal-access';
import { ClientRequestForm } from '@/components/clients/ClientRequestForm';

type PageProps = {
  params: { slug: string };
};

export default async function ClientNewRequestPage({ params }: PageProps) {
  const client = await resolveClientPortal(params.slug);

  return <ClientRequestForm slug={client.slug} displayName={client.displayName} />;
}
