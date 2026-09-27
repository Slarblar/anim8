import { resolveClientPortal } from '@/lib/client-portal-access';
import { BriefBuilder } from '@/components/clients/BriefBuilder';

export const dynamic = 'force-dynamic';

type PageProps = {
  params: { slug: string };
};

export default async function ClientBriefBuilderPage({ params }: PageProps) {
  const client = await resolveClientPortal(params.slug);

  return <BriefBuilder slug={client.slug} displayName={client.displayName} />;
}
