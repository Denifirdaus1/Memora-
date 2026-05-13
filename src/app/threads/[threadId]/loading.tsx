import { Loader2 } from "lucide-react";

export default function ThreadLoading() {
  return (
    <div className="flex min-h-screen flex-col bg-[var(--subtle)]">
      <header className="border-b border-[var(--border)] bg-white px-5 py-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0 flex-1">
            <div className="h-5 w-28 animate-pulse rounded bg-[#EAF2FF]" />
            <div className="mt-3 h-8 w-72 max-w-full animate-pulse rounded bg-[#DCEBFF]" />
            <div className="mt-3 h-4 w-48 animate-pulse rounded bg-[var(--surface-raised)]" />
          </div>
          <div className="flex gap-2">
            <div className="h-10 w-28 animate-pulse rounded-lg bg-[#DCEBFF]" />
            <div className="h-10 w-36 animate-pulse rounded-lg bg-[var(--surface-raised)]" />
          </div>
        </div>
      </header>

      <main className="flex-1 space-y-4 px-5 py-6">
        <section className="rounded-xl border border-[var(--border)] bg-white p-5 shadow-sm">
          <div className="flex items-center gap-3">
            <Loader2 className="animate-spin text-[var(--accent-blue)]" size={20} />
            <div>
              <p className="font-bold">Mempersiapkan workspace belajar...</p>
              <p className="mt-1 text-sm text-[var(--muted)]">
                Memora sedang membuka thread dan menyusun hasil ekstraksi.
              </p>
            </div>
          </div>
          <div className="mt-5 h-2 overflow-hidden rounded-full bg-[#EAF2FF]">
            <div className="h-full w-2/3 animate-pulse rounded-full bg-[var(--accent-blue)]" />
          </div>
        </section>

        <section className="rounded-xl border border-[var(--border)] bg-white p-5">
          <div className="h-4 w-44 animate-pulse rounded bg-[#DCEBFF]" />
          <div className="mt-5 grid gap-3 sm:grid-cols-3">
            <SkeletonBlock />
            <SkeletonBlock />
            <SkeletonBlock />
          </div>
        </section>

        <SkeletonPanel />
        <SkeletonPanel />
      </main>
    </div>
  );
}

function SkeletonBlock() {
  return <div className="h-20 animate-pulse rounded-lg bg-[var(--surface-raised)]" />;
}

function SkeletonPanel() {
  return (
    <div className="rounded-xl border border-[var(--border)] bg-white p-5">
      <div className="h-4 w-40 animate-pulse rounded bg-[#DCEBFF]" />
      <div className="mt-4 h-3 w-full animate-pulse rounded bg-[var(--surface-raised)]" />
      <div className="mt-2 h-3 w-2/3 animate-pulse rounded bg-[var(--surface-raised)]" />
    </div>
  );
}
