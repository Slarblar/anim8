import { notFound } from 'next/navigation';
import { ClientRequestForm } from '@/components/clients/ClientRequestForm';
import { getClientBySlug } from '@/lib/client-registry';

type PageProps = {
  params: { slug: string };
};

export default async function ClientNewRequestPage({ params }: PageProps) {
  const client = await getClientBySlug(params.slug);
  if (!client) notFound();

  return <ClientRequestForm slug={client.slug} displayName={client.displayName} />;
}
