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
import { ClientRejectModal } from './ClientRejectModal';
import {
  pipelineBadgeClass,
  portalAlertSuccess,
  portalAlertWarning,
  portalBody,
  portalBtnDanger,
  portalBtnPrimary,
  portalBtnSecondary,
  portalEyebrow,
  portalLabel,
  portalPageTitle,
  portalProgressFill,
  portalSectionTitle,
  portalStatusBadge,
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
  if (!dueOn) return '—';
  return new Date(`${dueOn}T00:00:00`).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

function formatBillableHours(hours: number | null): string {
  if (hours == null) return '—';
  return `${hours.toLocaleString('en-US', { maximumFractionDigits: 1 })} hrs`;
}

function formatCostEstimate(cost: number | null): string {
  if (cost == null) return '—';
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }).format(cost);
}

function TaskMetaRow({ task }: { task: ClientPortalTask | ClientPortalActiveTask }) {
  return (
    <dl className="mt-3 grid grid-cols-3 gap-3 border-t border-white/5 pt-3">
      <div className="min-w-0">
        <dt className={portalLabel}>Date</dt>
        <dd className="mt-1 text-sm text-white font-mono">{formatDueDate(task.dueOn)}</dd>
      </div>
      <div className="min-w-0">
        <dt className={portalLabel}>Est. billable hours</dt>
        <dd className="mt-1 text-sm text-white font-mono">{formatBillableHours(task.billableHours)}</dd>
      </div>
      <div className="min-w-0">
        <dt className={portalLabel}>Est. cost</dt>
        <dd className="mt-1 text-sm text-white font-mono">{formatCostEstimate(task.costEstimate)}</dd>
      </div>
      <p className={`col-span-3 mt-1 text-[11px] leading-snug text-[#8b95a8]/90`}>
        You&apos;ll get a cost and hour estimate before we start. That number holds — we
        won&apos;t exceed it without talking to you first.
      </p>
    </dl>
  );
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
      <div className="portal-progress-track mt-0 h-2 rounded-full border border-white/5 bg-black/20">
        <div
          className={portalProgressFill}
          style={{ width: `${progress.percent}%` }}
        />
      </div>
    </div>
  );
}

function PendingApprovalActions({
  task,
  loading,
  onApprove,
  onReject,
}: {
  task: ClientPortalTask;
  loading: boolean;
  onApprove: (taskGid: string) => void;
  onReject: (task: ClientPortalTask) => void;
}) {
  if (!task.needsClientApproval) {
    return (
      <p className={`mt-4 ${portalBody}`}>
        Awaiting Anim-8 review — we&apos;ll send an estimate here when it&apos;s ready.
      </p>
    );
  }

  return (
    <div className="mt-4 border-t border-white/5 pt-4">
      <p className={`${portalBody} mb-3`}>
        Review the estimate above, then approve to kick off or reject to request changes.
      </p>
      <div className="flex flex-col gap-2 min-[480px]:flex-row">
        <button
          type="button"
          className={portalBtnPrimary}
          disabled={loading}
          onClick={() => onApprove(task.gid)}
        >
          {loading ? 'Approving…' : 'Approve'}
        </button>
        <button
          type="button"
          className={portalBtnDanger}
          disabled={loading}
          onClick={() => onReject(task)}
        >
          Reject
        </button>
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
  actionLoadingGid,
  onApprove,
  onReject,
}: {
  tasks: Array<ClientPortalTask | ClientPortalActiveTask>;
  emptyMessage: string;
  showPipeline?: boolean;
  pendingSection?: boolean;
  slug?: string;
  actionLoadingGid?: string | null;
  onApprove?: (taskGid: string) => void;
  onReject?: (task: ClientPortalTask) => void;
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
                {showPipeline && 'status' in task && task.status ? (
                  <span className={portalStatusBadge}>{task.status}</span>
                ) : null}
                {showPipeline && 'pipeline' in task ? (
                  <span className={pipelineBadgeClass(task.pipeline)}>
                    {task.pipeline}
                  </span>
                ) : null}
              </div>
              <TaskMetaRow task={task} />
            </div>
          </div>
          <ProgressBar progress={task.progress} pending={pendingSection && !task.needsClientApproval} />
          {pendingSection && slug && onApprove && onReject ? (
            <PendingApprovalActions
              task={task}
              loading={actionLoadingGid === task.gid}
              onApprove={onApprove}
              onReject={onReject}
            />
          ) : null}
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
  const [actionLoadingGid, setActionLoadingGid] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [rejectTask, setRejectTask] = useState<ClientPortalTask | null>(null);
  const [rejectSubmitting, setRejectSubmitting] = useState(false);
  const [rejectError, setRejectError] = useState<string | null>(null);
  const [approveSuccess, setApproveSuccess] = useState<string | null>(null);

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

  const handleApprove = useCallback(
    async (taskGid: string) => {
      setActionLoadingGid(taskGid);
      setActionError(null);
      setApproveSuccess(null);

      try {
        const res = await fetch(`/api/clients/${slug}/tasks/${taskGid}/approve`, {
          method: 'POST',
        });
        const data = (await res.json()) as { error?: string };
        if (!res.ok) {
          setActionError(data.error ?? 'Could not approve this project.');
          return;
        }

        setApproveSuccess('Estimate approved. Our team has been notified.');
        await refreshProgress();
      } catch {
        setActionError('Could not approve this project. Please try again.');
      } finally {
        setActionLoadingGid(null);
      }
    },
    [slug, refreshProgress]
  );

  const handleRejectSubmit = useCallback(
    async (input: { reason: string; contactEmail: string }) => {
      if (!rejectTask) return;

      setRejectSubmitting(true);
      setRejectError(null);

      try {
        const res = await fetch(`/api/clients/${slug}/tasks/${rejectTask.gid}/reject`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(input),
        });
        const data = (await res.json()) as { error?: string };
        if (!res.ok) {
          setRejectError(data.error ?? 'Could not send your feedback.');
          return;
        }

        setRejectTask(null);
        await refreshProgress();
      } catch {
        setRejectError('Could not send your feedback. Please try again.');
      } finally {
        setRejectSubmitting(false);
      }
    },
    [rejectTask, slug, refreshProgress]
  );

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

      {actionError ? (
        <p className={`${portalAlertWarning} mt-8`}>{actionError}</p>
      ) : null}

      {approveSuccess ? (
        <p className={`${portalAlertSuccess} mt-8`}>{approveSuccess}</p>
      ) : null}

      <section className="mt-8 min-[480px]:mt-10 md:mt-12">
        <h2 className={portalSectionTitle}>Pending projects</h2>
        <p className={`${portalBody} mt-2`}>
          New submissions in intake before they are moved into a pipeline.
        </p>
        <TaskList
          tasks={pendingProjects}
          emptyMessage="No pending projects right now."
          pendingSection
          slug={slug}
          actionLoadingGid={actionLoadingGid}
          onApprove={handleApprove}
          onReject={(task) => {
            setRejectError(null);
            setRejectTask(task);
          }}
        />
      </section>

      <section className="mt-8 min-[480px]:mt-10 md:mt-12">
        <h2 className={portalSectionTitle}>Active projects</h2>
        <p className={`${portalBody} mt-2`}>
          View your projects in real time in our pipeline.
        </p>
        <TaskList
          tasks={activeProjects}
          emptyMessage="No active projects right now."
          showPipeline
        />
      </section>

      <ClientRejectModal
        open={rejectTask != null}
        taskName={rejectTask?.name ?? ''}
        submitting={rejectSubmitting}
        error={rejectError}
        onClose={() => {
          if (!rejectSubmitting) setRejectTask(null);
        }}
        onSubmit={handleRejectSubmit}
      />
    </ClientPortalShell>
  );
}
