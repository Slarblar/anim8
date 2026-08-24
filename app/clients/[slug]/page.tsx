import { resolveClientPortal } from '@/lib/client-portal-access';
import { ClientPortal } from '@/components/clients/ClientPortal';
import { getClientPortalTasks } from '@/lib/asana';

export const dynamic = 'force-dynamic';

type PageProps = {
  params: { slug: string };
  searchParams: { submitted?: string };
};

export default async function ClientPortalPage({ params, searchParams }: PageProps) {
  const client = await resolveClientPortal(params.slug);

  let pendingProjects: Awaited<ReturnType<typeof getClientPortalTasks>>['pending'] = [];
  let approvedProjects: Awaited<ReturnType<typeof getClientPortalTasks>>['approved'] = [];
  let activeProjects: Awaited<ReturnType<typeof getClientPortalTasks>>['active'] = [];
  let pastProjects: Awaited<ReturnType<typeof getClientPortalTasks>>['past'] = [];
  let tasksError: string | null = null;

  try {
    const tasks = await getClientPortalTasks(
      client.filters,
      client.intakeProjectGid
    );
    pendingProjects = tasks.pending;
    approvedProjects = tasks.approved;
    activeProjects = tasks.active;
    pastProjects = tasks.past;
  } catch (err) {
    console.error('Failed to load client tasks', err);
    tasksError =
      'We could not load your projects right now. You can still submit a new request below.';
  }

  return (
    <ClientPortal
      slug={client.slug}
      displayName={client.displayName}
      driveFolderUrl={client.driveFolderUrl}
      pendingProjects={pendingProjects}
      approvedProjects={approvedProjects}
      activeProjects={activeProjects}
      pastProjects={pastProjects}
      tasksError={tasksError}
      showSubmittedSuccess={searchParams.submitted === '1'}
    />
  );
}
