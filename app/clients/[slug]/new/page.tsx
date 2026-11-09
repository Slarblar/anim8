import { CreativeSession } from '@/components/clients/CreativeSession';
import { ConversationalBriefBuilder } from '@/components/clients/ConversationalBriefBuilder';
import { resolveClientPortal } from '@/lib/client-portal-access';
import { isStudioPiece, toInspoPiece } from '@/lib/work-bank';
import { listWorkPieces } from '@/lib/work-bank-store';

export const dynamic = 'force-dynamic';

type PageProps = {
  params: { slug: string };
  searchParams: { from?: string; legacy?: string };
};

export default async function ClientNewRequestPage({ params, searchParams }: PageProps) {
  const client = await resolveClientPortal(params.slug);
  const fromAdmin = searchParams.from === 'admin';
  const pieces = (await listWorkPieces()).map(toInspoPiece).filter(isStudioPiece);
  const initialSeed = Math.floor(Math.random() * 1_000_000_000) || 1;
  const useLegacy =
    searchParams.legacy === '1' || process.env.CONVERSATIONAL_BRIEF_ENABLED === '0';

  if (!useLegacy) {
    return (
      <ConversationalBriefBuilder
        slug={client.slug}
        displayName={client.displayName}
        driveFolderUrl={client.driveFolderUrl}
        initialPieces={pieces}
        showExamples={process.env.NODE_ENV === 'development'}
        returnHref={fromAdmin ? '/admin/clients' : undefined}
        returnLabel={fromAdmin ? '← Admin' : undefined}
      />
    );
  }

  return (
    <CreativeSession
      slug={client.slug}
      displayName={client.displayName}
      driveFolderUrl={client.driveFolderUrl}
      engagement={client.engagement}
      initialPieces={pieces}
      initialSeed={initialSeed}
      allowPreview={process.env.NODE_ENV === 'development'}
      returnHref={fromAdmin ? '/admin/clients' : undefined}
      returnLabel={fromAdmin ? '← Admin' : undefined}
      doneHref={fromAdmin ? '/admin/clients?requested=1' : undefined}
    />
  );
}
