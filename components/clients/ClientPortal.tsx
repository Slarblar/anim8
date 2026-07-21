'use client';

import type {
  ClientPortalActiveTask,
  ClientPortalTask,
  ClientPortalTasks,
  TaskProgress,
} from '@/lib/asana';
import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import { ClientPortalShell } from './ClientPortalShell';
import {
  pipelineBadgeClass,
  portalAlertSuccess,
  portalAlertWarning,
  portalBody,
  portalBtnPrimary,
  portalBtnSecondary,
  portalEyebrow,
  portalPageTitle,
  portalProgressFill,
  portalSectionTitle,
  portalTaskCard,
} from './portal-ui';

type ClientPortalProps = {
  slug: string;
  displayName: string;
  pendingProjects: ClientPortalTask[];
  activeProjects: ClientPortalActiveTask[];
  tasksError: string | null;
  showSubmittedSuccess?: boolean;
};

const PROGRESS_POLL_MS = 45_000;

function formatDueDate(dueOn: string | null): string {
  if (!dueOn) return 'No due date';
  return new Date(`${dueOn}T00:00:00`).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

function ProgressBar({
  progress,
  pending,
}: {
  progress: TaskProgress;
  pending?: boolean;
}) {
  if (progress.percent === null) {
    return (
      <p className={`mt-4 ${portalBody}`}>
        {pending
          ? 'Awaiting Anim-8 review — production steps begin once we kick off.'
          : 'Production steps are being set up.'}
      </p>
    );
  }

  return (
    <div className="mt-4">
      <div className="mb-2 flex justify-between text-[10px] font-bold uppercase tracking-wider text-text-muted font-mono">
        <span>Progress</span>
        <span>
          {progress.completedSubtasks}/{progress.totalSubtasks} steps · {progress.percent}%
        </span>
      </div>
      <div className="h-2 overflow-hidden rounded-full border border-white/5 bg-black/20">
        <div
          className={portalProgressFill}
          style={{ width: `${progress.percent}%` }}
        />
      </div>
    </div>
  );
}

function TaskList({
  tasks,
  emptyMessage,
  showPipeline,
  pendingSection,
  slug,
}: {
  tasks: Array<ClientPortalTask | ClientPortalActiveTask>;
  emptyMessage: string;
  showPipeline?: boolean;
  pendingSection?: boolean;
  slug?: string;
}) {
  if (tasks.length === 0) {
    return (
      <div className={`${portalTaskCard} mt-5 text-center`}>
        <p className={portalBody}>{emptyMessage}</p>
        {pendingSection && slug ? (
          <Link href={`/clients/${slug}/new`} className={`${portalBtnPrimary} mt-5 inline-flex`}>
            New request
          </Link>
        ) : null}
      </div>
    );
  }

  return (
    <ul className="mt-5 space-y-4">
      {tasks.map((task) => (
        <li key={task.gid} className={portalTaskCard}>
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <p className="font-bold text-white text-sm min-[480px]:text-base break-words">{task.name}</p>
                {showPipeline && 'pipeline' in task ? (
                  <span className={pipelineBadgeClass(task.pipeline)}>
                    {task.pipeline}
                  </span>
                ) : null}
              </div>
              <p className={`mt-1 ${portalBody}`}>Due {formatDueDate(task.dueOn)}</p>
            </div>
          </div>
          <ProgressBar progress={task.progress} pending={pendingSection} />
        </li>
      ))}
    </ul>
  );
}

export function ClientPortal({
  slug,
  displayName,
  pendingProjects: initialPending,
  activeProjects: initialActive,
  tasksError: initialTasksError,
  showSubmittedSuccess = false,
}: ClientPortalProps) {
  const [pendingProjects, setPendingProjects] = useState(initialPending);
  const [activeProjects, setActiveProjects] = useState(initialActive);
  const [tasksError, setTasksError] = useState(initialTasksError);

  useEffect(() => {
    setPendingProjects(initialPending);
    setActiveProjects(initialActive);
    setTasksError(initialTasksError);
  }, [initialPending, initialActive, initialTasksError]);

  const refreshProgress = useCallback(async () => {
    try {
      const res = await fetch(`/api/clients/${slug}`);
      if (!res.ok) return;

      const data = (await res.json()) as ClientPortalTasks;
      setPendingProjects(data.pending);
      setActiveProjects(data.active);
      setTasksError(null);
    } catch {
      // Keep showing the last known progress if a poll fails quietly.
    }
  }, [slug]);

  useEffect(() => {
    const interval = window.setInterval(refreshProgress, PROGRESS_POLL_MS);
    return () => window.clearInterval(interval);
  }, [refreshProgress]);

  return (
    <ClientPortalShell
      slug={slug}
      headerAction={
        <div className="flex w-full flex-col gap-2 min-[480px]:w-auto min-[480px]:flex-row min-[480px]:flex-wrap min-[480px]:justify-end">
          <Link href={`/clients/${slug}/schedule`} className={portalBtnSecondary}>
            Schedule call
          </Link>
          <Link href={`/clients/${slug}/new`} className={portalBtnPrimary}>
            New request
          </Link>
        </div>
      }
    >
      <div className="border-b border-white/10 pb-6 pt-1 min-[480px]:pb-8 min-[480px]:pt-2 md:pt-4">
        <p className={portalEyebrow}>Client portal</p>
        <h1 className={`${portalPageTitle} mt-2 min-[480px]:mt-3 break-words`}>{displayName}</h1>
        <p className={`${portalBody} mt-2 min-[480px]:mt-3 max-w-2xl`}>
          Track pending intake requests and active pipeline progress. Updates refresh
          automatically while this page is open.
        </p>
      </div>

      {showSubmittedSuccess ? (
        <p className={`${portalAlertSuccess} mt-8`}>
          Request submitted. We will follow up soon.
        </p>
      ) : null}

      {tasksError ? (
        <p className={`${portalAlertWarning} mt-8`}>{tasksError}</p>
      ) : null}

      <section className="mt-8 min-[480px]:mt-10 md:mt-12">
        <h2 className={portalSectionTitle}>Pending projects</h2>
        <p className={`${portalBody} mt-2`}>
          New submissions in intake before they move into a pipeline.
        </p>
        <TaskList
          tasks={pendingProjects}
          emptyMessage="No pending projects right now."
          pendingSection
          slug={slug}
        />
      </section>

      <section className="mt-8 min-[480px]:mt-10 md:mt-12">
        <h2 className={portalSectionTitle}>Active projects</h2>
        <p className={`${portalBody} mt-2`}>
          Work in the production or design pipeline.
        </p>
        <TaskList
          tasks={activeProjects}
          emptyMessage="No active projects right now."
          showPipeline
        />
      </section>
    </ClientPortalShell>
  );
}
