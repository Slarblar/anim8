import { CreativeSession } from '@/components/clients/CreativeSession';
import { resolveClientPortal } from '@/lib/client-portal-access';

export const dynamic = 'force-dynamic';

type PageProps = {
  params: { slug: string };
  searchParams: { from?: string };
};

export default async function ClientNewRequestPage({ params, searchParams }: PageProps) {
  const client = await resolveClientPortal(params.slug);
  const fromAdmin = searchParams.from === 'admin';

  return (
    <CreativeSession
      slug={client.slug}
      displayName={client.displayName}
      driveFolderUrl={client.driveFolderUrl}
      engagement={client.engagement}
      allowPreview={process.env.NODE_ENV === 'development'}
      returnHref={fromAdmin ? '/admin/clients' : undefined}
      returnLabel={fromAdmin ? '← Admin' : undefined}
      doneHref={fromAdmin ? '/admin/clients?requested=1' : undefined}
    />
  );
}
