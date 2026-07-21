import { NewPtoRequestForm } from '@/components/crew/NewPtoRequestForm';

export default function NewPtoRequestPage() {
  return (
    <div className="mx-auto max-w-lg space-y-6">
      <div>
        <h1 className="text-2xl font-black uppercase tracking-tight text-white">New PTO / WFH request</h1>
        <p className="mt-1 text-sm text-[#8b95a8]">
          Submit a request — an admin will approve or reject it, and it&apos;ll sync to the team calendar.
        </p>
      </div>
      <NewPtoRequestForm />
    </div>
  );
}
