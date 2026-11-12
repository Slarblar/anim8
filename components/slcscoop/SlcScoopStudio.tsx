import { SlcScoopBar } from './SlcScoopBar';

export function SlcScoopStudio() {
  return (
    <div className="flex h-dvh flex-col bg-[#0e0e0f]">
      <SlcScoopBar active="posts" />
      <iframe
        title="SLCSCOOP Post Studio"
        allow="web-share"
        src="/scoop/index.html"
        className="min-h-0 w-full flex-1 border-0 bg-[#0e0e0f]"
      />
    </div>
  );
}
