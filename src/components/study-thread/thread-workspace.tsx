import * as Sentry from "@sentry/nextjs";
import { Bot, FileText, UserRound } from "lucide-react";
import Link from "next/link";

import { ThreadClientRecovery } from "@/components/study-thread/thread-client-recovery";
import { Button } from "@/components/ui/button";
import { StatusPill } from "@/components/ui/status-pill";
import { UploadComposer } from "@/components/uploads/upload-composer";
import { startReviewSessionAction } from "@/server/actions/review";
import { createThreadMessageAction } from "@/server/actions/thread-messages";
import {
  getStudyThread,
  getThreadKnowledgeItems,
  getThreadMessages,
  getThreadUploads,
} from "@/server/queries/study-threads";

export async function ThreadWorkspace({ threadId }: { threadId: string }) {
  const thread = await getStudyThread(threadId);

  if (!thread) {
    Sentry.captureMessage("Study thread was not visible during server render", {
      level: "warning",
      tags: { feature: "study-thread", reason: "thread_not_visible" },
      extra: { threadId },
    });

    return <ThreadClientRecovery threadId={threadId} />;
  }

  const [uploads, messages, knowledgeItems] = await Promise.all([
    getThreadUploads(thread.id),
    getThreadMessages(thread.id),
    getThreadKnowledgeItems(thread.id),
  ]);
  const canStartReview = knowledgeItems.length > 0;

  return (
    <div className="flex min-h-screen flex-col">
      <header className="border-b border-[var(--border)] bg-white px-5 py-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="mb-2 flex items-center gap-2">
              <StatusPill status={thread.status} />
              <span className="text-xs font-semibold uppercase text-[var(--muted)]">
                {thread.detected_language ?? "unknown language"}
              </span>
            </div>
            <h1 className="text-2xl font-bold">{thread.title}</h1>
            <p className="mt-1 text-sm text-[var(--muted)]">{thread.detected_topic}</p>
          </div>
          <div className="flex gap-2">
            <form action={startReviewSessionAction}>
              <input type="hidden" name="threadId" value={thread.id} />
              <Button type="submit" disabled={!canStartReview}>
                Start Review
              </Button>
            </form>
            <Button variant="secondary" asChild>
              <Link href="/flashcards">Study Flashcards</Link>
            </Button>
          </div>
        </div>
      </header>

      <section className="flex-1 space-y-4 overflow-y-auto px-5 py-6">
        {uploads.map((upload) => (
          <div
            key={upload.id}
            className="rounded-xl border border-[var(--border)] bg-white p-4"
          >
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
                <Summary
                  label="Vocabulary"
                  value={upload.extraction_summary.vocabulary}
                />
                <Summary
                  label="Grammar"
                  value={upload.extraction_summary.grammar_patterns}
                />
                <Summary
                  label="Exercises"
                  value={upload.extraction_summary.exercise_types}
                />
                <Summary
                  label="Topic"
                  value={upload.extraction_summary.detected_topic ?? "-"}
                />
              </div>
            ) : (
              <>
                <div className="mt-4 h-2 overflow-hidden rounded-full bg-slate-100">
                  <div className="h-full w-2/3 rounded-full bg-[var(--accent-sky)]" />
                </div>
                {upload.error_message ? (
                  <p className="mt-2 text-sm font-semibold text-[var(--danger)]">
                    {upload.error_message}
                  </p>
                ) : null}
              </>
            )}
          </div>
        ))}

        {uploads.length === 0 ? (
          <div className="rounded-xl border border-dashed border-[var(--border)] bg-white p-5">
            <div className="flex items-center gap-3">
              <FileText className="text-[var(--accent-blue)]" size={18} />
              <div>
                <p className="font-semibold">No material uploaded yet</p>
                <p className="text-sm text-[var(--muted)]">
                  Upload a PDF or image first. Memora will extract study knowledge before
                  review can start.
                </p>
              </div>
            </div>
          </div>
        ) : null}

        {messages.map((message) => (
          <article
            key={message.id}
            className="rounded-xl border border-[var(--border)] bg-white p-4"
          >
            <div className="mb-3 flex items-center gap-2 text-sm font-bold">
              {message.role === "user" ? <UserRound size={16} /> : <Bot size={16} />}
              {message.role === "user" ? "You" : "Memora"}
            </div>
            <p className="text-sm leading-6 text-[var(--foreground)]">
              {message.content.text}
            </p>
          </article>
        ))}

        {messages.length === 0 ? (
          <article className="rounded-xl border border-[var(--border)] bg-white p-4">
            <div className="mb-3 flex items-center gap-2 text-sm font-bold">
              <Bot size={16} />
              Memora
            </div>
            <p className="text-sm leading-6 text-[var(--foreground)]">
              This thread is ready. Add a note now, or upload study material when the
              extraction pipeline is implemented.
            </p>
          </article>
        ) : null}
      </section>

      <footer className="border-t border-[var(--border)] bg-white p-4">
        <div className="mx-auto max-w-3xl space-y-3">
          <div className="rounded-xl border border-[var(--border)] bg-[var(--surface-raised)] p-3">
            <UploadComposer threadId={thread.id} variant="compact" />
          </div>
          <form
            action={createThreadMessageAction}
            className="flex items-end gap-3 rounded-xl border border-[var(--border)] bg-[var(--surface-raised)] p-3"
          >
            <input type="hidden" name="threadId" value={thread.id} />
            <textarea
              name="message"
              className="min-h-10 flex-1 resize-none bg-transparent text-sm outline-none"
              placeholder="Ask or study from this thread..."
            />
            <Button type="submit">Send</Button>
          </form>
        </div>
      </footer>
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
