import Link from "next/link";
import { notFound } from "next/navigation";

import { Button } from "@/components/ui/button";
import { getReviewSessionSummary } from "@/server/queries/review";

export const dynamic = "force-dynamic";

export default async function ReviewSummaryPage({
  params,
}: {
  params: Promise<{ sessionId: string }>;
}) {
  const { sessionId } = await params;
  const summary = await getReviewSessionSummary(sessionId);

  if (!summary) {
    notFound();
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-[var(--subtle)] p-4">
      <section className="w-full max-w-xl rounded-2xl border border-[var(--border)] bg-white p-6 shadow-sm">
        <p className="text-sm font-semibold text-[var(--accent-blue)]">Review complete</p>
        <h1 className="mt-2 text-3xl font-bold">Score {summary.stats.score}</h1>
        <dl className="mt-6 grid grid-cols-3 gap-3">
          <Metric label="Accuracy" value={`${summary.stats.accuracy}%`} />
          <Metric
            label="Correct"
            value={`${summary.stats.correctCount}/${summary.questions.length}`}
          />
          <Metric label="Missed" value={summary.stats.missedCount.toString()} />
        </dl>
        <div className="mt-6 rounded-xl bg-[var(--surface-raised)] p-4">
          <h2 className="font-bold">Missed items</h2>
          <ul className="mt-3 space-y-2 text-sm text-[var(--muted)]">
            {summary.missedQuestions.map((question) => (
              <li key={question.id}>{question.prompt}</li>
            ))}
            {summary.missedQuestions.length === 0 ? (
              <li>No missed items in this session.</li>
            ) : null}
          </ul>
        </div>
        <div className="mt-6 flex gap-3">
          <Button asChild>
            <Link href="/flashcards">Study flashcards</Link>
          </Button>
          <Button variant="secondary" asChild>
            <Link href={`/threads/${summary.session.thread_id}`}>Back to thread</Link>
          </Button>
        </div>
      </section>
    </main>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-[var(--surface-raised)] p-4">
      <dt className="text-xs text-[var(--muted)]">{label}</dt>
      <dd className="mt-1 text-xl font-bold">{value}</dd>
    </div>
  );
}
