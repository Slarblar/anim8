import { CreativeSession } from '@/components/clients/CreativeSession';
import { resolveClientPortal } from '@/lib/client-portal-access';

export const dynamic = 'force-dynamic';

type PageProps = {
  params: { slug: string };
};

export default async function ClientNewRequestPage({ params }: PageProps) {
  const client = await resolveClientPortal(params.slug);

  return (
    <CreativeSession
      slug={client.slug}
      displayName={client.displayName}
      driveFolderUrl={client.driveFolderUrl}
      engagement={client.engagement}
      allowPreview={process.env.NODE_ENV === 'development'}
    />
  );
}
