import Link from 'next/link';

type Tool = 'posts' | 'request';

export function SlcScoopBar({ active }: { active: Tool }) {
  return (
    <header className="flex h-12 shrink-0 items-center justify-between gap-3 border-b border-white/10 bg-[#0e0e0f] px-3 text-[#f4f5f0] sm:px-4">
      <div className="flex min-w-0 items-center gap-2">
        <img src="/scoop/slcscoop-logo.png" alt="SLC Scoop" width="300" height="67" className="h-7 w-auto" />
        <p className="hidden text-[11px] font-semibold uppercase tracking-[0.16em] text-white/40 sm:block">
          Partner studio
        </p>
      </div>
      <nav className="flex items-center gap-1 text-xs font-bold" aria-label="SLC Scoop tools">
        <Link
          href="/slcscoop"
          aria-current={active === 'posts' ? 'page' : undefined}
          className={
            active === 'posts'
              ? 'rounded-full bg-[#f4f5f0] px-3 py-1.5 text-[#151616]'
              : 'rounded-full px-3 py-1.5 text-white/75 hover:bg-white/10'
          }
        >
          Posts
        </Link>
        <Link
          href="/slcscoop?tool=request"
          aria-current={active === 'request' ? 'page' : undefined}
          className={
            active === 'request'
              ? 'rounded-full bg-[#f4f5f0] px-3 py-1.5 text-[#151616]'
              : 'rounded-full px-3 py-1.5 text-white/75 hover:bg-white/10'
          }
        >
          Request
        </Link>
      </nav>
    </header>
  );
}
