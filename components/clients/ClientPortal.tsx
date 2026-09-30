'use client';

import type {
  ClientPortalActiveTask,
  ClientPortalApprovedTask,
  ClientPortalPastTask,
  ClientPortalTask,
  ClientPortalTasks,
  TaskProgress,
} from '@/lib/asana';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { ClientPortalShell } from './ClientPortalShell';
import { ClientRejectModal } from './ClientRejectModal';
import { PortalDismissibleAlert } from './PortalDismissibleAlert';
import { ClientDriveFolderCallout } from './ClientDriveFolderCallout';
import {
  pipelineBadgeClass,
  portalAlertWarning,
  portalBody,
  portalBtnDanger,
  portalBtnPrimary,
  portalBtnSecondary,
  portalEyebrow,
  formatPortalDisplayName,
  portalLabel,
  portalPageTitle,
  portalProgressFill,
  portalSectionTitle,
  portalStatusBadge,
  portalTaskCard,
} from './portal-ui';
import { portalFadeUp, portalPageStagger, portalVariants } from './portal-motion';

type PortalTask =
  | ClientPortalTask
  | ClientPortalApprovedTask
  | ClientPortalActiveTask
  | ClientPortalPastTask;

type ClientPortalProps = {
  slug: string;
  displayName: string;
  driveFolderUrl?: string;
  pendingProjects: ClientPortalTask[];
  approvedProjects: ClientPortalApprovedTask[];
  activeProjects: ClientPortalActiveTask[];
  pastProjects: ClientPortalPastTask[];
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

function formatCost(cost: number | null): string {
  if (cost == null) return '—';
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: cost % 1 === 0 ? 0 : 2,
  }).format(cost);
}

function sumBilling(tasks: Array<{ costEstimate: number | null; finalCost: number | null }>): {
  estimate: number | null;
  final: number | null;
} {
  let estimate = 0;
  let final = 0;
  let hasEstimate = false;
  let hasFinal = false;
  for (const task of tasks) {
    if (task.costEstimate != null) {
      estimate += task.costEstimate;
      hasEstimate = true;
    }
    if (task.finalCost != null) {
      final += task.finalCost;
      hasFinal = true;
    }
  }
  return {
    estimate: hasEstimate ? estimate : null,
    final: hasFinal ? final : null,
  };
}

function TaskMetaRow({
  task,
  hideDate,
}: {
  task: PortalTask;
  hideDate?: boolean;
}) {
  return (
    <dl
      className={`mt-3 grid gap-3 border-t border-white/5 pt-3 ${hideDate ? 'grid-cols-3' : 'grid-cols-2 min-[480px]:grid-cols-4'}`}
    >
      {hideDate ? null : (
        <div className="min-w-0">
          <dt className={portalLabel}>Date</dt>
          <dd className="mt-1 text-sm text-white font-mono">{formatDueDate(task.dueOn)}</dd>
        </div>
      )}
      <div className="min-w-0">
        <dt className={portalLabel}>Est. hours</dt>
        <dd className="mt-1 text-sm text-white font-mono">{formatBillableHours(task.billableHours)}</dd>
      </div>
      <div className="min-w-0">
        <dt className={portalLabel}>Est. cost</dt>
        <dd className="mt-1 text-sm text-white font-mono">{formatCost(task.costEstimate)}</dd>
      </div>
      <div className="min-w-0">
        <dt className={portalLabel}>Final cost</dt>
        <dd className="mt-1 text-sm text-white font-mono">{formatCost(task.finalCost)}</dd>
      </div>
    </dl>
  );
}

function BillingSummary({ tasks }: { tasks: PortalTask[] }) {
  const totals = sumBilling(tasks);
  if (totals.estimate == null && totals.final == null) return null;

  return (
    <dl className={`${portalTaskCard} mt-5 grid gap-3 min-[480px]:grid-cols-2`}>
      <div className="min-w-0">
        <dt className={portalLabel}>Estimated total</dt>
        <dd className="mt-1 text-sm text-white font-mono">{formatCost(totals.estimate)}</dd>
      </div>
      <div className="min-w-0">
        <dt className={portalLabel}>Final total</dt>
        <dd className="mt-1 text-sm text-white font-mono">{formatCost(totals.final)}</dd>
      </div>
    </dl>
  );
}

function ProgressBar({
  progress,
  pending,
  approved,
}: {
  progress: TaskProgress;
  pending?: boolean;
  approved?: boolean;
}) {
  if (progress.percent === null) {
    return (
      <p className={`mt-4 ${portalBody}`}>
        {approved
          ? "We're gathering assets and assigning your project to the team."
          : pending
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

function defaultExpandedTaskGids(tasks: PortalTask[]): Set<string> {
  if (tasks.length <= 1) {
    return new Set(tasks.map((task) => task.gid));
  }

  return new Set(
    tasks
      .filter((task) => 'needsClientApproval' in task && task.needsClientApproval)
      .map((task) => task.gid)
  );
}

function TaskBadges({
  task,
  showApprovedStatus,
  showPipeline,
  pastSection,
}: {
  task: PortalTask;
  showApprovedStatus?: boolean;
  showPipeline?: boolean;
  pastSection?: boolean;
}) {
  return (
    <>
      {showApprovedStatus && 'status' in task && task.status ? (
        <span className={portalStatusBadge}>{task.status}</span>
      ) : null}
      {(showPipeline || pastSection) && 'status' in task && task.status ? (
        <span className={portalStatusBadge}>{task.status}</span>
      ) : null}
      {(showPipeline || pastSection) && 'pipeline' in task && task.pipeline ? (
        <span className={pipelineBadgeClass(task.pipeline)}>{task.pipeline}</span>
      ) : null}
    </>
  );
}

function CollapsibleTaskCard({
  task,
  expanded,
  onToggle,
  showApprovedStatus,
  showPipeline,
  pendingSection,
  approvedSection,
  pastSection,
  slug,
  actionLoadingGid,
  onApprove,
  onReject,
  index,
}: {
  task: PortalTask;
  expanded: boolean;
  onToggle: () => void;
  showApprovedStatus?: boolean;
  showPipeline?: boolean;
  pendingSection?: boolean;
  approvedSection?: boolean;
  pastSection?: boolean;
  slug?: string;
  actionLoadingGid?: string | null;
  onApprove?: (taskGid: string) => void;
  onReject?: (task: ClientPortalTask) => void;
  index: number;
}) {
  const reduce = useReducedMotion();
  // Neither pending, approved, nor past — the "active pipeline" card variant, where
  // due date + progress are the most important info and should stay visible
  // even while collapsed.
  const isActiveVariant = !pendingSection && !approvedSection && !pastSection;
  const pastCompletedAt =
    pastSection && 'completedAt' in task ? task.completedAt : null;

  const header = (
    <>
      <div className="min-w-0 flex-1">
        <div className="flex items-start justify-between gap-3">
          <p className="min-w-0 flex-1 font-bold text-white text-sm min-[480px]:text-base break-words">
            {task.name}
          </p>
          <p className="shrink-0 text-right text-xs min-[480px]:text-sm font-mono leading-snug">
            {pastSection ? (
              pastCompletedAt ? (
                <>
                  <span className="text-brand-cyan">Completed </span>
                  <span className="text-white">{formatDueDate(pastCompletedAt)}</span>
                </>
              ) : (
                <span className="text-brand-cyan">Archived</span>
              )
            ) : (
              <>
                <span className="text-brand-cyan">Due </span>
                <span className="text-white">{formatDueDate(task.dueOn)}</span>
              </>
            )}
          </p>
        </div>
        <div className={`portal-task-badges ${!expanded ? 'portal-task-badges--hidden' : ''}`}>
          <div className="flex flex-wrap items-center gap-2 pt-2">
            <TaskBadges
              task={task}
              showApprovedStatus={showApprovedStatus}
              showPipeline={showPipeline}
              pastSection={pastSection}
            />
          </div>
        </div>
      </div>
      <span
        className={`portal-task-chevron mt-0.5 shrink-0 text-brand-cyan ${expanded ? 'portal-task-chevron--open' : ''}`}
        aria-hidden
      >
        ▾
      </span>
    </>
  );

  return (
    <motion.li
      className={`portal-task-card ${portalTaskCard} ${expanded ? 'portal-task-card--expanded' : ''}`}
      initial={reduce ? false : { opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.42, ease: [0.22, 1, 0.36, 1], delay: Math.min(index, 6) * 0.045 }}
    >
      <button
        type="button"
        className="portal-task-card-toggle flex w-full items-start justify-between gap-3 text-left"
        aria-expanded={expanded}
        onClick={onToggle}
      >
        {header}
      </button>

      {isActiveVariant ? <ProgressBar progress={task.progress} /> : null}

      <div
        className={`portal-task-expand ${expanded ? 'portal-task-expand--open' : ''}`}
        aria-hidden={!expanded}
      >
        <div className="portal-task-expand-inner">
          <TaskMetaRow task={task} hideDate />
          {pendingSection && slug && onApprove && onReject ? (
            <>
              {task.progress.percent !== null ? <ProgressBar progress={task.progress} /> : null}
              <PendingApprovalActions
                task={task}
                loading={actionLoadingGid === task.gid}
                onApprove={onApprove}
                onReject={onReject}
              />
            </>
          ) : approvedSection ? (
            <ProgressBar progress={task.progress} approved />
          ) : null}
        </div>
      </div>
    </motion.li>
  );
}

function TaskList({
  tasks,
  emptyMessage,
  showPipeline,
  showApprovedStatus,
  pendingSection,
  approvedSection,
  pastSection,
  nested,
  slug,
  actionLoadingGid,
  onApprove,
  onReject,
}: {
  tasks: PortalTask[];
  emptyMessage: string;
  showPipeline?: boolean;
  showApprovedStatus?: boolean;
  pendingSection?: boolean;
  approvedSection?: boolean;
  pastSection?: boolean;
  nested?: boolean;
  slug?: string;
  actionLoadingGid?: string | null;
  onApprove?: (taskGid: string) => void;
  onReject?: (task: ClientPortalTask) => void;
}) {
  const [expandedGids, setExpandedGids] = useState<Set<string>>(() => defaultExpandedTaskGids(tasks));
  const seenGidsRef = useRef<Set<string>>(new Set(tasks.map((task) => task.gid)));

  useEffect(() => {
    setExpandedGids((current) => {
      const seen = seenGidsRef.current;
      const defaults = defaultExpandedTaskGids(tasks);
      const next = new Set<string>();

      for (const task of tasks) {
        // Preserve the user's manual expand/collapse choice for tasks we've
        // already rendered before; only apply defaults to newly-seen tasks
        // so polling refreshes don't keep forcing cards back open.
        const isExpanded = seen.has(task.gid) ? current.has(task.gid) : defaults.has(task.gid);
        if (isExpanded) next.add(task.gid);
      }

      seenGidsRef.current = new Set(tasks.map((task) => task.gid));
      return next;
    });
  }, [tasks]);

  const toggleTask = useCallback((taskGid: string) => {
    setExpandedGids((current) => {
      const next = new Set(current);
      if (next.has(taskGid)) next.delete(taskGid);
      else next.add(taskGid);
      return next;
    });
  }, []);

  if (tasks.length === 0) {
    return (
      <div className={`${portalTaskCard} mt-5 text-center`}>
        <p className={portalBody}>{emptyMessage}</p>
        {pendingSection && slug ? (
          <div className="mt-5 flex flex-col items-center gap-3 min-[480px]:flex-row min-[480px]:justify-center">
            <Link href={`/clients/${slug}/new`} className={portalBtnPrimary}>
              New request
            </Link>
          </div>
        ) : null}
      </div>
    );
  }

  return (
    <ul className={nested ? 'mt-3 space-y-3' : 'mt-5 space-y-4'}>
      {tasks.map((task, index) => (
        <CollapsibleTaskCard
          key={task.gid}
          index={index}
          task={task}
          expanded={expandedGids.has(task.gid)}
          onToggle={() => toggleTask(task.gid)}
          showApprovedStatus={showApprovedStatus}
          showPipeline={showPipeline}
          pendingSection={pendingSection}
          approvedSection={approvedSection}
          pastSection={pastSection}
          slug={slug}
          actionLoadingGid={actionLoadingGid}
          onApprove={onApprove}
          onReject={onReject}
        />
      ))}
    </ul>
  );
}

function archiveYear(task: ClientPortalPastTask): string {
  const stamp = task.completedAt ?? task.dueOn;
  return stamp && /^\d{4}/.test(stamp) ? stamp.slice(0, 4) : 'Undated';
}

function groupArchives(tasks: ClientPortalPastTask[]): { year: string; tasks: ClientPortalPastTask[] }[] {
  const buckets = new Map<string, ClientPortalPastTask[]>();
  for (const task of tasks) {
    const year = archiveYear(task);
    const list = buckets.get(year);
    if (list) list.push(task);
    else buckets.set(year, [task]);
  }
  return [...buckets.entries()]
    .sort(([a], [b]) => {
      if (a === 'Undated') return 1;
      if (b === 'Undated') return -1;
      return b.localeCompare(a);
    })
    .map(([year, yearTasks]) => ({ year, tasks: yearTasks }));
}

function ArchiveSection({ tasks }: { tasks: ClientPortalPastTask[] }) {
  const pipelines = useMemo(() => {
    const present = new Set(tasks.map((task) => task.pipeline).filter((pipeline): pipeline is 'Production' | 'Design' => Boolean(pipeline)));
    return (['Production', 'Design'] as const).filter((pipeline) => present.has(pipeline));
  }, [tasks]);
  const [pipeline, setPipeline] = useState<'all' | 'Production' | 'Design'>('all');
  const filtered = useMemo(
    () => (pipeline === 'all' ? tasks : tasks.filter((task) => task.pipeline === pipeline)),
    [tasks, pipeline]
  );
  const groups = useMemo(() => groupArchives(filtered), [filtered]);
  const [openYears, setOpenYears] = useState<Set<string>>(() => new Set(groups[0] ? [groups[0].year] : []));

  useEffect(() => {
    setOpenYears((current) => {
      const available = new Set(groups.map((group) => group.year));
      const kept = [...current].filter((year) => available.has(year));
      const nextYears = kept.length > 0 ? kept : groups[0] ? [groups[0].year] : [];
      if (nextYears.length === current.size && nextYears.every((year) => current.has(year))) return current;
      return new Set(nextYears);
    });
  }, [groups]);

  function toggleYear(year: string) {
    setOpenYears((current) => {
      const next = new Set(current);
      if (next.has(year)) next.delete(year);
      else next.add(year);
      return next;
    });
  }

  if (tasks.length === 0) {
    return (
      <div className={`${portalTaskCard} mt-5 text-center`}>
        <p className={portalBody}>No archived projects yet.</p>
      </div>
    );
  }

  const showFilter = pipelines.length > 1;

  return (
    <div className="mt-5 space-y-3">
      {groups.length > 1 ? <BillingSummary tasks={filtered} /> : null}
      {showFilter ? (
        <div className="flex flex-wrap gap-2" role="group" aria-label="Filter archives">
          {(['all', ...pipelines] as const).map((option) => {
            const on = pipeline === option;
            const count = option === 'all' ? tasks.length : tasks.filter((task) => task.pipeline === option).length;
            return (
              <button
                key={option}
                type="button"
                aria-pressed={on}
                onClick={() => setPipeline(option)}
                className={`rounded-full border px-3 py-1 text-[10px] font-bold uppercase tracking-wider font-mono transition ${
                  on
                    ? 'border-brand-lime/50 bg-brand-lime/15 text-brand-lime'
                    : 'border-white/15 bg-white/[0.03] text-[#8b95a8] hover:border-white/30 hover:text-white'
                }`}
              >
                {option === 'all' ? 'All' : option} · {count}
              </button>
            );
          })}
        </div>
      ) : null}
      {groups.map((group) => {
        const open = openYears.has(group.year);
        const totals = sumBilling(group.tasks);
        const countLabel = `${group.tasks.length} project${group.tasks.length === 1 ? '' : 's'}`;
        return (
          <section key={group.year}>
            <button
              type="button"
              className={`${portalTaskCard} flex w-full items-center justify-between gap-4 text-left`}
              aria-expanded={open}
              onClick={() => toggleYear(group.year)}
            >
              <span className="min-w-0">
                <span className="block font-black uppercase tracking-tight text-white">{group.year}</span>
                <span className="mt-1 block text-xs text-[#8b95a8]">{countLabel}</span>
              </span>
              <span className="flex shrink-0 items-center gap-4">
                {totals.estimate != null || totals.final != null ? (
                  <span className="hidden text-right font-mono text-[11px] leading-relaxed text-[#8b95a8] min-[480px]:block">
                    {totals.estimate != null ? <span className="block">Est. {formatCost(totals.estimate)}</span> : null}
                    {totals.final != null ? <span className="block text-white">Final {formatCost(totals.final)}</span> : null}
                  </span>
                ) : null}
                <span className={`portal-task-chevron text-brand-cyan ${open ? 'portal-task-chevron--open' : ''}`} aria-hidden>
                  ▾
                </span>
              </span>
            </button>
            {open ? (
              <div className="ml-3 border-l border-white/10 pl-3 min-[480px]:ml-4 min-[480px]:pl-4">
                <TaskList tasks={group.tasks} emptyMessage="" pastSection nested />
              </div>
            ) : null}
          </section>
        );
      })}
    </div>
  );
}

export function ClientPortal({
  slug,
  displayName,
  driveFolderUrl,
  pendingProjects: initialPending,
  approvedProjects: initialApproved,
  activeProjects: initialActive,
  pastProjects: initialPast,
  tasksError: initialTasksError,
  showSubmittedSuccess = false,
}: ClientPortalProps) {
  const [pendingProjects, setPendingProjects] = useState(initialPending);
  const [approvedProjects, setApprovedProjects] = useState(initialApproved);
  const [activeProjects, setActiveProjects] = useState(initialActive);
  const [pastProjects, setPastProjects] = useState(initialPast);
  const [tasksError, setTasksError] = useState(initialTasksError);
  const [actionLoadingGid, setActionLoadingGid] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [rejectTask, setRejectTask] = useState<ClientPortalTask | null>(null);
  const [rejectSubmitting, setRejectSubmitting] = useState(false);
  const [rejectError, setRejectError] = useState<string | null>(null);
  const [approveSuccess, setApproveSuccess] = useState<string | null>(null);
  const [submittedDismissed, setSubmittedDismissed] = useState(false);
  const router = useRouter();
  const reduceMotion = useReducedMotion();

  useEffect(() => {
    setPendingProjects(initialPending);
    setApprovedProjects(initialApproved);
    setActiveProjects(initialActive);
    setPastProjects(initialPast);
    setTasksError(initialTasksError);
  }, [initialPending, initialApproved, initialActive, initialPast, initialTasksError]);

  const refreshProgress = useCallback(async () => {
    try {
      const res = await fetch(`/api/clients/${slug}`);
      if (!res.ok) return;

      const data = (await res.json()) as ClientPortalTasks;
      setPendingProjects(data.pending);
      setApprovedProjects(data.approved);
      setActiveProjects(data.active);
      setPastProjects(data.past ?? []);
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
      <motion.div
        initial="hidden"
        animate="show"
        variants={portalVariants(!!reduceMotion, portalPageStagger)}
      >
      <motion.div
        className="border-b border-white/10 pb-6 pt-1 min-[480px]:pb-8 min-[480px]:pt-2 md:pt-4"
        variants={portalVariants(!!reduceMotion, portalFadeUp)}
      >
        <p className={portalEyebrow}>Client portal</p>
        <h1 className={`${portalPageTitle} mt-2 min-[480px]:mt-3 break-words`}>
          {formatPortalDisplayName(displayName)}
        </h1>
        <p className={`${portalBody} mt-2 min-[480px]:mt-3 max-w-2xl`}>
          Review planning, follow active work, and browse archives. Updates
          refresh automatically while this page is open.
        </p>
      </motion.div>

      {driveFolderUrl ? (
        <motion.div variants={portalVariants(!!reduceMotion, portalFadeUp)}>
          <ClientDriveFolderCallout url={driveFolderUrl} />
        </motion.div>
      ) : null}

      <PortalDismissibleAlert
        message="Request submitted. We will follow up soon."
        visible={showSubmittedSuccess && !submittedDismissed}
        onDismiss={() => {
          setSubmittedDismissed(true);
          router.replace(`/clients/${slug}`, { scroll: false });
        }}
      />

      {tasksError ? (
        <p className={`${portalAlertWarning} mt-8`}>{tasksError}</p>
      ) : null}

      <PortalDismissibleAlert
        message={actionError ?? ''}
        visible={!!actionError}
        variant="warning"
        onDismiss={() => setActionError(null)}
      />

      <PortalDismissibleAlert
        message={approveSuccess ?? ''}
        visible={!!approveSuccess}
        onDismiss={() => setApproveSuccess(null)}
      />

      <motion.section
        className="mt-8 min-[480px]:mt-10 md:mt-12"
        variants={portalVariants(!!reduceMotion, portalFadeUp)}
      >
        <h2 className={portalSectionTitle}>Planning stage</h2>
        <p className={`${portalBody} mt-2`}>
          New requests and estimates to review before production starts.
        </p>
        {pendingProjects.length === 0 && approvedProjects.length === 0 ? (
          <div className={`${portalTaskCard} mt-5 text-center`}>
            <p className={portalBody}>No projects in planning right now.</p>
            <div className="mt-5 flex flex-col items-center gap-3 min-[480px]:flex-row min-[480px]:justify-center">
              <Link href={`/clients/${slug}/new`} className={portalBtnPrimary}>
                New request
              </Link>
            </div>
          </div>
        ) : (
          <>
            {pendingProjects.length > 0 ? (
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
            ) : null}
            {approvedProjects.length > 0 ? (
              <TaskList
                tasks={approvedProjects}
                emptyMessage="No approved projects right now."
                approvedSection
                showApprovedStatus
              />
            ) : null}
          </>
        )}
      </motion.section>

      <motion.section
        className="mt-8 min-[480px]:mt-10 md:mt-12"
        variants={portalVariants(!!reduceMotion, portalFadeUp)}
      >
        <h2 className={portalSectionTitle}>Active</h2>
        <p className={`${portalBody} mt-2`}>
          Work currently in our production or design pipeline.
        </p>
        <TaskList
          tasks={activeProjects}
          emptyMessage="No active projects right now."
          showPipeline
        />
      </motion.section>

      <motion.section
        className="mt-8 min-[480px]:mt-10 md:mt-12"
        variants={portalVariants(!!reduceMotion, portalFadeUp)}
      >
        <div className="flex flex-wrap items-end justify-between gap-2">
          <h2 className={portalSectionTitle}>Archives</h2>
          {pastProjects.length > 0 ? (
            <p className="font-mono text-[11px] uppercase tracking-wider text-[#8b95a8]">
              {pastProjects.length} project{pastProjects.length === 1 ? '' : 's'}
            </p>
          ) : null}
        </div>
        <p className={`${portalBody} mt-2`}>
          Completed work, grouped by year. Open a project for hours and cost.
        </p>
        <ArchiveSection tasks={pastProjects} />
      </motion.section>
      </motion.div>

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
