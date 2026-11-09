import { SlcScoopBar } from './SlcScoopBar';

/** Shown until a client-portal record exists at the slug this page expects. */
export function SlcScoopRequestSetup() {
  return (
    <div className="flex min-h-dvh flex-col bg-[#0e0e0f] text-[#f4f5f0]">
      <SlcScoopBar active="request" />
      <main className="mx-auto flex w-full max-w-xl flex-1 flex-col justify-center px-5 py-12">
        <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-[#ED2224]">Request</p>
        <h1 className="mt-2 text-2xl font-black tracking-tight">AI requests are not linked yet</h1>
        <p className="mt-3 text-sm leading-relaxed text-white/70">
          Post building is ready on the Posts tab. Sending a request uses the same conversational
          brief as the client portal, and that portal does not have an active record at{' '}
          <span className="font-semibold text-white">slcscoop</span> yet. Once it does, this tab
          opens the brief, saves the draft, and files the approved request in Asana.
        </p>
      </main>
    </div>
  );
}
