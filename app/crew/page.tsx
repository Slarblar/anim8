import { CrewStatusChart } from '@/components/crew/CrewStatusChart';

export default function CrewStatusPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-black uppercase tracking-tight text-white">Today</h1>
        <p className="mt-1 text-sm text-[#8b95a8]">Who&apos;s in, out, or working from home today.</p>
      </div>
      <CrewStatusChart />
    </div>
  );
}
