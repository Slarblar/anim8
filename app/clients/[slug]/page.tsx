import { resolveClientPortal } from '@/lib/client-portal-access';
import { ClientPortal } from '@/components/clients/ClientPortal';
import { getClientPortalTasks } from '@/lib/asana';

type PageProps = {
  params: { slug: string };
  searchParams: { submitted?: string };
};

export default async function ClientPortalPage({ params, searchParams }: PageProps) {
  const client = await resolveClientPortal(params.slug);

  let pendingProjects: Awaited<ReturnType<typeof getClientPortalTasks>>['pending'] = [];
  let activeProjects: Awaited<ReturnType<typeof getClientPortalTasks>>['active'] = [];
  let tasksError: string | null = null;

  try {
    const tasks = await getClientPortalTasks(
      client.filters,
      client.intakeProjectGid
    );
    pendingProjects = tasks.pending;
    activeProjects = tasks.active;
  } catch (err) {
    console.error('Failed to load client tasks', err);
    tasksError =
      'We could not load your projects right now. You can still submit a new request below.';
  }

  return (
    <ClientPortal
      slug={client.slug}
      displayName={client.displayName}
      pendingProjects={pendingProjects}
      activeProjects={activeProjects}
      tasksError={tasksError}
      showSubmittedSuccess={searchParams.submitted === '1'}
    />
  );
}
