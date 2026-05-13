import {
  Archive,
  BookOpen,
  CreditCard,
  LogOut,
  Plus,
  Search,
  Settings,
} from "lucide-react";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import { StatusPill } from "@/components/ui/status-pill";
import { cn } from "@/lib/utils";
import { signOutAction } from "@/server/actions/auth";
import { getCurrentUserProfile } from "@/server/queries/auth";
import { listStudyThreads } from "@/server/queries/study-threads";
import type { StudyThread } from "@/types/database";

export async function AppSidebar({ activeThreadId }: { activeThreadId?: string }) {
  const [threads, profile] = await Promise.all([
    listStudyThreads(),
    getCurrentUserProfile(),
  ]);
  const todayThreads = threads.slice(0, 4);
  const previousThreads = threads.slice(4);

  return (
    <aside className="hidden min-h-screen w-[280px] shrink-0 flex-col border-r border-[var(--border)] bg-[var(--subtle)] p-4 lg:flex">
      <Link href="/threads/new" className="mb-4">
        <Button className="w-full justify-start" size="lg">
          <Plus size={18} />
          New Study
        </Button>
      </Link>

      <label className="mb-5 flex h-10 items-center gap-2 rounded-lg border border-[var(--border)] bg-white px-3 text-sm text-[var(--muted)]">
        <Search size={16} />
        <span>Search study history</span>
      </label>

      <nav className="flex-1 space-y-6 overflow-y-auto">
        <ThreadGroup
          title="Recent"
          threads={todayThreads}
          activeThreadId={activeThreadId}
        />
        {previousThreads.length ? (
          <ThreadGroup
            title="Previous"
            threads={previousThreads}
            activeThreadId={activeThreadId}
          />
        ) : null}
      </nav>

      <div className="space-y-2 border-t border-[var(--border)] pt-4">
        <Link
          href="/flashcards"
          className="flex items-center justify-between rounded-lg px-3 py-2 text-sm font-semibold text-[var(--foreground)] hover:bg-white"
        >
          <span className="flex items-center gap-2">
            <CreditCard size={16} />
            Flashcards
          </span>
          <span className="rounded-full bg-[#EAF2FF] px-2 py-1 text-xs text-[var(--accent-blue)]">
            12 due
          </span>
        </Link>
        <Link
          href="/settings"
          className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-semibold text-[var(--foreground)] hover:bg-white"
        >
          <Settings size={16} />
          Settings
        </Link>
        <form action={signOutAction}>
          <button
            type="submit"
            className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm font-semibold text-[var(--foreground)] hover:bg-white"
          >
            <LogOut size={16} />
            Sign out
          </button>
        </form>
        <div className="flex items-center gap-3 rounded-lg bg-white px-3 py-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[var(--accent-blue)] text-xs font-bold text-white">
            {getInitial(profile?.display_name ?? profile?.email)}
          </div>
          <div>
            <p className="text-sm font-semibold">
              {profile?.display_name ?? profile?.email ?? "Memora user"}
            </p>
            <p className="text-xs text-[var(--muted)]">
              {profile?.native_language ?? "No language set"}
            </p>
          </div>
        </div>
      </div>
    </aside>
  );
}

function ThreadGroup({
  title,
  threads,
  activeThreadId,
}: {
  title: string;
  threads: StudyThread[];
  activeThreadId?: string;
}) {
  return (
    <section>
      <h2 className="mb-2 px-2 text-xs font-bold uppercase tracking-wide text-[var(--muted)]">
        {title}
      </h2>
      <div className="space-y-1">
        {threads.length ? (
          threads.map((thread) => (
            <Link
              key={`${title}-${thread.id}`}
              href={`/threads/${thread.id}`}
              className={cn(
                "block rounded-lg border border-transparent px-3 py-3 text-sm transition-colors hover:border-[var(--border)] hover:bg-white",
                activeThreadId === thread.id && "border-blue-200 bg-[#EAF2FF] shadow-sm",
              )}
            >
              <div className="flex items-start justify-between gap-2">
                <span className="line-clamp-2 font-semibold text-[var(--foreground)]">
                  {thread.title}
                </span>
                {thread.status === "archived" ? (
                  <Archive size={14} />
                ) : (
                  <BookOpen size={14} />
                )}
              </div>
              <div className="mt-2 flex items-center justify-between">
                <StatusPill status={thread.status} />
                <span className="text-xs text-[var(--muted)]">42 items</span>
              </div>
            </Link>
          ))
        ) : (
          <p className="rounded-lg border border-dashed border-[var(--border)] bg-white p-3 text-sm text-[var(--muted)]">
            No study threads yet.
          </p>
        )}
      </div>
    </section>
  );
}

function getInitial(value?: string | null) {
  return value?.trim().charAt(0).toUpperCase() || "M";
}
