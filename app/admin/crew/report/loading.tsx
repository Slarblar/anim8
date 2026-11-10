import { AsanaLoadingStatus } from '@/components/admin/AsanaLoadingStatus';

export default function StaffReportLoading() {
  return (
    <AsanaLoadingStatus
      layout="page"
      title="Gathering information from Asana"
      detail="Pulling scored KPI tasks from Asana, then building PTO and attendance for the staff report. This can take a moment."
    />
  );
}
