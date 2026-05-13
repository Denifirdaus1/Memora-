import Link from "next/link";

import { Button } from "@/components/ui/button";

export default function ReviewSummaryPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-[var(--subtle)] p-4">
      <section className="w-full max-w-xl rounded-2xl border border-[var(--border)] bg-white p-6 shadow-sm">
        <p className="text-sm font-semibold text-[var(--accent-blue)]">Review complete</p>
        <h1 className="mt-2 text-3xl font-bold">Score 245</h1>
        <dl className="mt-6 grid grid-cols-3 gap-3">
          <Metric label="Accuracy" value="82%" />
          <Metric label="Correct" value="18/20" />
          <Metric label="Time" value="30m" />
        </dl>
        <div className="mt-6 rounded-xl bg-[var(--surface-raised)] p-4">
          <h2 className="font-bold">Missed items</h2>
          <ul className="mt-3 space-y-2 text-sm text-[var(--muted)]">
            <li>einen Arzt</li>
            <li>die Arbeit</li>
            <li>im Buero</li>
          </ul>
        </div>
        <div className="mt-6 flex gap-3">
          <Button asChild>
            <Link href="/flashcards">Study flashcards</Link>
          </Button>
          <Button variant="secondary" asChild>
            <Link href="/threads/kapitel-3">Back to thread</Link>
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
