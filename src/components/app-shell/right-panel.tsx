import { BarChart3, Clock, CreditCard, Sparkles } from "lucide-react";
import Link from "next/link";

import { dashboardMetrics } from "@/features/dashboard/metrics";
import { getThreadMemory, listStudyThreads } from "@/server/queries/study-threads";

export async function RightPanel({ activeThreadId }: { activeThreadId?: string }) {
  const [memory, threads] = await Promise.all([
    activeThreadId ? getThreadMemory(activeThreadId) : Promise.resolve(null),
    listStudyThreads(),
  ]);

  return (
    <aside className="hidden min-h-screen w-[300px] shrink-0 border-l border-[var(--border)] bg-white p-5 xl:block">
      <div className="space-y-4">
        <PanelCard title="Study memory" icon={<Sparkles size={16} />}>
          <p className="text-sm leading-6 text-[var(--muted)]">
            {memory?.summary || "No extracted study memory yet."}
          </p>
          {memory?.key_terms.length ? (
            <div className="mt-3 flex flex-wrap gap-2">
              {memory.key_terms.map((term) => (
                <span
                  key={term}
                  className="rounded-full bg-[#EAF2FF] px-2 py-1 text-xs font-semibold text-[var(--accent-blue)]"
                >
                  {term}
                </span>
              ))}
            </div>
          ) : null}
        </PanelCard>

        <PanelCard title="Ready to review" icon={<Clock size={16} />}>
          <p className="text-sm text-[var(--muted)]">
            Review starts after upload extraction is available.
          </p>
          <Link
            href="/review/demo-session"
            className="mt-3 inline-flex h-9 items-center justify-center rounded-lg bg-[var(--primary)] px-3 text-sm font-bold text-[var(--primary-text)] opacity-60"
          >
            Start Review
          </Link>
        </PanelCard>

        <PanelCard title="Progress" icon={<BarChart3 size={16} />}>
          <dl className="grid grid-cols-2 gap-3 text-sm">
            <Metric label="Accuracy" value={`${dashboardMetrics.accuracy}%`} />
            <Metric label="Streak" value={`${dashboardMetrics.streak}d`} />
            <Metric label="Recent" value={dashboardMetrics.recentScore} />
            <Metric label="Due cards" value={dashboardMetrics.dueCards.toString()} />
          </dl>
        </PanelCard>

        <PanelCard title="Recent threads" icon={<CreditCard size={16} />}>
          <div className="space-y-2">
            {threads.slice(0, 3).map((thread) => (
              <div
                key={thread.id}
                className="rounded-lg border border-[var(--border)] p-3"
              >
                <p className="truncate text-sm font-semibold">{thread.title}</p>
                <p className="mt-1 text-xs capitalize text-[var(--muted)]">
                  {thread.status.replace("_", " ")}
                </p>
              </div>
            ))}
            {threads.length === 0 ? (
              <p className="text-sm text-[var(--muted)]">No recent threads yet.</p>
            ) : null}
          </div>
        </PanelCard>
      </div>
    </aside>
  );
}

function PanelCard({
  title,
  icon,
  children,
}: {
  title: string;
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-xl border border-[var(--border)] bg-[var(--surface-raised)] p-4">
      <div className="mb-3 flex items-center gap-2 text-sm font-bold">
        {icon}
        {title}
      </div>
      {children}
    </section>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs text-[var(--muted)]">{label}</dt>
      <dd className="text-lg font-bold text-[var(--foreground)]">{value}</dd>
    </div>
  );
}
