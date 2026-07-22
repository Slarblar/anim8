import { CrewKpiSummary } from '@/components/crew/CrewKpiSummary';

export default function CrewKpiPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-black uppercase tracking-tight text-white">KPI</h1>
        <p className="mt-1 text-sm text-[#8b95a8]">Your performance metrics, pulled straight from Asana.</p>
      </div>
      <CrewKpiSummary />
    </div>
  );
}
