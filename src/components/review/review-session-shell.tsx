import Link from "next/link";

import { Button } from "@/components/ui/button";
import {
  advanceReviewSessionAction,
  answerReviewQuestionAction,
} from "@/server/actions/review";
import type { ReviewSession, SessionQuestion, StudyThread } from "@/types/database";

export function ReviewSessionShell({
  session,
  thread,
  question,
  answeredCount,
}: {
  session: ReviewSession;
  thread: StudyThread | null;
  question: SessionQuestion | null;
  answeredCount: number;
}) {
  const isAnswered = Boolean(question?.answered_at);

  return (
    <main className="flex min-h-screen items-center justify-center bg-[var(--subtle)] p-4">
      <section className="w-full max-w-3xl rounded-2xl border border-[var(--border)] bg-white p-6 shadow-sm">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <p className="text-sm font-semibold text-[var(--accent-blue)]">
              {thread?.title ?? "Study review"}
            </p>
            <h1 className="text-2xl font-bold">
              Question {question?.question_order ?? answeredCount} of{" "}
              {session.question_count}
            </h1>
          </div>
          <span className="rounded-full bg-slate-100 px-3 py-2 text-sm font-bold">
            {answeredCount}/{session.question_count} answered
          </span>
        </div>

        {question ? (
          <div className="rounded-xl border border-[var(--border)] bg-[var(--surface-raised)] p-5">
            <p className="text-sm font-semibold text-[var(--muted)]">
              {formatQuestionType(question.question_type)}
            </p>
            <p className="mt-4 text-2xl font-bold">{question.prompt}</p>

            {isAnswered ? (
              <Feedback question={question} />
            ) : (
              <form action={answerReviewQuestionAction} className="mt-6 space-y-4">
                <input type="hidden" name="sessionId" value={session.id} />
                <input type="hidden" name="questionId" value={question.id} />
                {question.options.length ? (
                  <div className="grid gap-3 sm:grid-cols-2">
                    {question.options.map((option) => (
                      <label
                        key={option}
                        className="flex cursor-pointer items-center gap-3 rounded-xl border border-[var(--border)] bg-white p-4 text-left font-semibold hover:border-[var(--accent-blue)]"
                      >
                        <input required type="radio" name="answer" value={option} />
                        <span>{option}</span>
                      </label>
                    ))}
                  </div>
                ) : (
                  <textarea
                    required
                    name="answer"
                    className="min-h-28 w-full resize-none rounded-xl border border-[var(--border)] bg-white p-4 text-sm outline-none focus:border-[var(--accent-blue)]"
                    placeholder="Tulis jawabanmu..."
                  />
                )}
                <Button type="submit">Submit answer</Button>
              </form>
            )}
          </div>
        ) : (
          <div className="rounded-xl border border-[var(--border)] bg-[var(--surface-raised)] p-5">
            <p className="text-lg font-bold">No question available.</p>
            <p className="mt-2 text-sm text-[var(--muted)]">
              Start a new review from a ready study thread.
            </p>
          </div>
        )}

        <div className="mt-6 flex justify-between">
          <Button variant="secondary" asChild>
            <Link href={`/threads/${session.thread_id}`}>Exit</Link>
          </Button>
          {isAnswered ? (
            <form action={advanceReviewSessionAction}>
              <input type="hidden" name="sessionId" value={session.id} />
              <Button type="submit">
                {session.status === "completed" ? "View summary" : "Next question"}
              </Button>
            </form>
          ) : null}
        </div>
      </section>
    </main>
  );
}

function Feedback({ question }: { question: SessionQuestion }) {
  return (
    <div className="mt-6 rounded-xl border border-[var(--border)] bg-white p-4">
      <p className="font-bold">{question.is_correct ? "Benar" : "Belum tepat"}</p>
      <p className="mt-2 text-sm text-[var(--muted)]">
        Jawabanmu: {question.user_answer}
      </p>
      {!question.is_correct ? (
        <p className="mt-2 text-sm text-[var(--foreground)]">
          Jawaban yang diharapkan: {question.correct_answer}
        </p>
      ) : null}
      <p className="mt-3 text-sm leading-6 text-[var(--muted)]">{question.explanation}</p>
    </div>
  );
}

function formatQuestionType(type: SessionQuestion["question_type"]) {
  return type.replace(/_/g, " ");
}
