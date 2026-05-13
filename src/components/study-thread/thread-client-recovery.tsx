"use client";

import * as Sentry from "@sentry/nextjs";
import { Bot, FileText, Loader2, RefreshCw } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

import { Button } from "@/components/ui/button";
import { StatusPill } from "@/components/ui/status-pill";
import { UploadComposer } from "@/components/uploads/upload-composer";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import type {
  KnowledgeItem,
  StudyThread,
  ThreadMessage,
  ThreadUpload,
} from "@/types/database";

interface ClientThreadState {
  thread: StudyThread;
  uploads: ThreadUpload[];
  messages: ThreadMessage[];
  knowledgeItems: KnowledgeItem[];
}

export function ThreadClientRecovery({ threadId }: { threadId: string }) {
  const router = useRouter();
  const supabase = useMemo(() => createSupabaseBrowserClient(), []);
  const [state, setState] = useState<ClientThreadState | null>(null);
  const [status, setStatus] = useState<"loading" | "ready" | "missing">("loading");
  const [reviewError, setReviewError] = useState<string | null>(null);
  const [isStartingReview, setIsStartingReview] = useState(false);

  useEffect(() => {
    let isMounted = true;
    let attempts = 0;

    async function loadThread() {
      attempts += 1;

      const { data: thread, error: threadError } = await supabase
        .from("study_threads")
        .select("*")
        .eq("id", threadId)
        .maybeSingle();

      if (!isMounted) {
        return;
      }

      if (threadError) {
        Sentry.captureException(threadError, {
          tags: { feature: "study-thread", stage: "client-recovery" },
          extra: { threadId },
        });
      }

      if (!thread) {
        if (attempts >= 24) {
          setStatus("missing");
          window.clearInterval(intervalId);
        }
        return;
      }

      const [uploadsResult, messagesResult, knowledgeResult] = await Promise.all([
        supabase
          .from("thread_uploads")
          .select("*")
          .eq("thread_id", threadId)
          .order("created_at", { ascending: false }),
        supabase
          .from("thread_messages")
          .select("*")
          .eq("thread_id", threadId)
          .order("created_at", { ascending: true }),
        supabase
          .from("knowledge_items")
          .select("*")
          .eq("thread_id", threadId)
          .order("created_at", { ascending: false }),
      ]);

      if (!isMounted) {
        return;
      }

      setState({
        thread: thread as StudyThread,
        uploads: (uploadsResult.data ?? []) as ThreadUpload[],
        messages: (messagesResult.data ?? []) as ThreadMessage[],
        knowledgeItems: (knowledgeResult.data ?? []) as KnowledgeItem[],
      });
      setStatus("ready");
      window.clearInterval(intervalId);
    }

    const intervalId = window.setInterval(loadThread, 1500);
    void loadThread();

    return () => {
      isMounted = false;
      window.clearInterval(intervalId);
    };
  }, [supabase, threadId]);

  async function startReview() {
    if (!state?.knowledgeItems.length) {
      return;
    }

    setReviewError(null);
    setIsStartingReview(true);

    try {
      const response = await fetch("/api/review", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ threadId }),
      });
      const payload = (await response.json()) as {
        redirectTo?: string;
        error?: string;
      };

      if (!response.ok || !payload.redirectTo) {
        setReviewError(payload.error ?? "Review belum bisa dimulai.");
        return;
      }

      router.push(payload.redirectTo);
    } catch (error) {
      Sentry.captureException(error, {
        tags: { feature: "review", stage: "client-start" },
        extra: { threadId },
      });
      setReviewError("Review belum bisa dimulai. Coba lagi sebentar.");
    } finally {
      setIsStartingReview(false);
    }
  }

  if (status === "ready" && state) {
    return (
      <ClientThreadWorkspace
        state={state}
        isStartingReview={isStartingReview}
        reviewError={reviewError}
        onStartReview={startReview}
      />
    );
  }

  if (status === "missing") {
    return <ThreadMissing threadId={threadId} onRetry={() => router.refresh()} />;
  }

  return <ThreadPreparing />;
}

function ClientThreadWorkspace({
  state,
  isStartingReview,
  reviewError,
  onStartReview,
}: {
  state: ClientThreadState;
  isStartingReview: boolean;
  reviewError: string | null;
  onStartReview: () => void;
}) {
  const canStartReview = state.knowledgeItems.length > 0;

  return (
    <div className="flex min-h-screen flex-col">
      <header className="border-b border-[var(--border)] bg-white px-5 py-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="mb-2 flex items-center gap-2">
              <StatusPill status={state.thread.status} />
              <span className="text-xs font-semibold uppercase text-[var(--muted)]">
                {state.thread.detected_language ?? "unknown language"}
              </span>
            </div>
            <h1 className="text-2xl font-bold">{state.thread.title}</h1>
            <p className="mt-1 text-sm text-[var(--muted)]">
              {state.thread.detected_topic}
            </p>
          </div>
          <div className="flex flex-col items-start gap-2 sm:items-end">
            <div className="flex gap-2">
              <Button
                type="button"
                disabled={!canStartReview || isStartingReview}
                onClick={onStartReview}
              >
                {isStartingReview ? <Loader2 className="animate-spin" size={16} /> : null}
                Start Review
              </Button>
              <Button variant="secondary" asChild>
                <Link href="/flashcards">Study Flashcards</Link>
              </Button>
            </div>
            {reviewError ? (
              <p className="text-sm font-semibold text-[var(--danger)]">{reviewError}</p>
            ) : null}
          </div>
        </div>
      </header>

      <section className="flex-1 space-y-4 overflow-y-auto px-5 py-6">
        {state.uploads.map((upload) => (
          <UploadCard key={upload.id} upload={upload} />
        ))}

        {state.messages.length ? (
          state.messages.map((message) => (
            <article
              key={message.id}
              className="rounded-xl border border-[var(--border)] bg-white p-4"
            >
              <div className="mb-3 flex items-center gap-2 text-sm font-bold">
                {message.role === "user" ? "You" : "Memora"}
              </div>
              <p className="text-sm leading-6 text-[var(--foreground)]">
                {message.content.text}
              </p>
            </article>
          ))
        ) : (
          <article className="rounded-xl border border-[var(--border)] bg-white p-4">
            <div className="mb-3 flex items-center gap-2 text-sm font-bold">
              <Bot size={16} />
              Memora
            </div>
            <p className="text-sm leading-6 text-[var(--foreground)]">
              Materi sudah masuk. Kamu bisa mulai review atau upload materi tambahan.
            </p>
          </article>
        )}
      </section>

      <footer className="border-t border-[var(--border)] bg-white p-4">
        <div className="mx-auto max-w-3xl rounded-xl border border-[var(--border)] bg-[var(--surface-raised)] p-3">
          <UploadComposer threadId={state.thread.id} variant="compact" />
        </div>
      </footer>
    </div>
  );
}

function UploadCard({ upload }: { upload: ThreadUpload }) {
  return (
    <div className="rounded-xl border border-[var(--border)] bg-white p-4">
      <div className="flex items-center gap-3">
        <FileText className="text-[var(--accent-blue)]" size={18} />
        <div>
          <p className="font-semibold">{upload.file_name}</p>
          <p className="text-sm capitalize text-[var(--muted)]">
            {upload.status}
            {upload.storage_deleted_at ? " - raw file deleted" : ""}
          </p>
        </div>
      </div>
      {upload.extraction_summary ? (
        <div className="mt-4 grid gap-3 text-sm sm:grid-cols-4">
          <Summary label="Vocabulary" value={upload.extraction_summary.vocabulary} />
          <Summary label="Grammar" value={upload.extraction_summary.grammar_patterns} />
          <Summary label="Exercises" value={upload.extraction_summary.exercise_types} />
          <Summary
            label="Topic"
            value={upload.extraction_summary.detected_topic ?? "-"}
          />
        </div>
      ) : (
        <div className="mt-4 h-2 overflow-hidden rounded-full bg-slate-100">
          <div className="h-full w-2/3 animate-pulse rounded-full bg-[var(--accent-sky)]" />
        </div>
      )}
    </div>
  );
}

function ThreadPreparing() {
  return (
    <div className="flex min-h-screen flex-col bg-[var(--subtle)]">
      <div className="border-b border-[var(--border)] bg-white px-5 py-4">
        <div className="h-5 w-28 animate-pulse rounded bg-[#EAF2FF]" />
        <div className="mt-3 h-8 w-72 max-w-full animate-pulse rounded bg-[#DCEBFF]" />
      </div>
      <main className="flex-1 space-y-4 px-5 py-6">
        <section className="rounded-xl border border-[var(--border)] bg-white p-5">
          <div className="flex items-center gap-3">
            <Loader2 className="animate-spin text-[var(--accent-blue)]" size={20} />
            <div>
              <p className="font-bold">Mempersiapkan workspace belajar...</p>
              <p className="mt-1 text-sm text-[var(--muted)]">
                Memora sedang menyinkronkan thread, upload, dan hasil ekstraksi.
              </p>
            </div>
          </div>
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

function ThreadMissing({ threadId, onRetry }: { threadId: string; onRetry: () => void }) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-[var(--subtle)] px-5 py-10">
      <section className="w-full max-w-xl rounded-xl border border-[var(--border)] bg-white p-6 shadow-sm">
        <p className="text-sm font-semibold text-[var(--accent-blue)]">
          Workspace belum ditemukan
        </p>
        <h1 className="mt-2 text-2xl font-bold">Kami belum bisa membuka thread ini.</h1>
        <p className="mt-3 text-sm leading-6 text-[var(--muted)]">
          Thread mungkin dibuat dari akun lain atau sesi login sudah berubah. Buka
          dashboard untuk melihat thread yang tersedia di akun aktif.
        </p>
        <p className="mt-3 break-all rounded-lg bg-[var(--surface-raised)] p-3 text-xs text-[var(--muted)]">
          {threadId}
        </p>
        <div className="mt-5 flex gap-3">
          <Button asChild>
            <a href="/dashboard">Dashboard</a>
          </Button>
          <Button variant="secondary" type="button" onClick={onRetry}>
            <RefreshCw size={16} />
            Coba lagi
          </Button>
        </div>
      </section>
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

function Summary({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-lg bg-[var(--subtle)] p-3">
      <p className="text-xs text-[var(--muted)]">{label}</p>
      <p className="mt-1 font-bold">{value}</p>
    </div>
  );
}
