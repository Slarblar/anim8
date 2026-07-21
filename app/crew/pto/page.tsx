import Link from 'next/link';
import { CrewPtoHistory } from '@/components/crew/CrewPtoHistory';
import { CrewPtoBalance } from '@/components/crew/CrewPtoBalance';
import { adminBody, adminBtnPrimary } from '@/components/admin/admin-ui';

export default function CrewPtoPage() {
  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black uppercase tracking-tight text-white">PTO / WFH</h1>
          <p className={`${adminBody} mt-1`}>
            Requests need admin approval before they show on the calendar and status chart.
          </p>
        </div>
        <Link href="/crew/pto/new" className={adminBtnPrimary}>
          New request
        </Link>
      </div>

      <CrewPtoBalance />
      <CrewPtoHistory />
    </div>
  );
}
