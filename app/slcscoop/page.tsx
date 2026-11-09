import { ConversationalBriefBuilder } from '@/components/clients/ConversationalBriefBuilder';
import { SlcScoopRequestSetup } from '@/components/slcscoop/SlcScoopRequestSetup';
import { SlcScoopStudio } from '@/components/slcscoop/SlcScoopStudio';
import { getClientBySlug } from '@/lib/client-registry';
import { isStudioPiece, toInspoPiece } from '@/lib/work-bank';
import { listWorkPieces } from '@/lib/work-bank-store';

export const dynamic = 'force-dynamic';

const SCOOP_SLUG = 'slcscoop';

type PageProps = {
  searchParams: { tool?: string };
};

export default async function SlcScoopPage({ searchParams }: PageProps) {
  if (searchParams.tool !== 'request') {
    return <SlcScoopStudio />;
  }

  const client = await getClientBySlug(SCOOP_SLUG);
  if (!client) return <SlcScoopRequestSetup />;

  const pieces = (await listWorkPieces()).map(toInspoPiece).filter(isStudioPiece);
  return (
    <div className="client-portal-root antialiased">
      <ConversationalBriefBuilder
        slug={client.slug}
        displayName="SLC Scoop"
        driveFolderUrl={client.driveFolderUrl}
        initialPieces={pieces}
        showExamples={process.env.NODE_ENV === 'development'}
        returnHref="/slcscoop"
        returnLabel="← Posts"
      />
    </div>
  );
}
