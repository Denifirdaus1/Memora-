import Link from "next/link";

import { Button } from "@/components/ui/button";

export function ReviewSessionShell() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-[var(--subtle)] p-4">
      <section className="w-full max-w-3xl rounded-2xl border border-[var(--border)] bg-white p-6 shadow-sm">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <p className="text-sm font-semibold text-[var(--accent-blue)]">
              Kapitel 3 - Berufe
            </p>
            <h1 className="text-2xl font-bold">Question 7 of 20</h1>
          </div>
          <span className="rounded-full bg-slate-100 px-3 py-2 text-sm font-bold">
            28:41 left
          </span>
        </div>

        <div className="rounded-xl border border-[var(--border)] bg-[var(--surface-raised)] p-5">
          <p className="text-sm font-semibold text-[var(--muted)]">Fill in the blank</p>
          <p className="mt-4 text-2xl font-bold">Ich suche ___ Arbeit.</p>
          <div className="mt-6 grid gap-3 sm:grid-cols-2">
            {["einen", "eine", "ein", "die"].map((option) => (
              <button
                key={option}
                className="rounded-xl border border-[var(--border)] bg-white p-4 text-left font-semibold hover:border-[var(--accent-blue)]"
              >
                {option}
              </button>
            ))}
          </div>
        </div>

        <div className="mt-6 flex justify-between">
          <Button variant="secondary" asChild>
            <Link href="/threads/kapitel-3">Exit</Link>
          </Button>
          <Button asChild>
            <Link href="/review/demo-session/summary">Submit answer</Link>
          </Button>
        </div>
      </section>
    </main>
  );
}
