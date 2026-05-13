import { Button } from "@/components/ui/button";

export function FlashcardsBoard() {
  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-5 p-5 lg:flex-row">
      <aside className="rounded-xl border border-[var(--border)] bg-white p-4 lg:w-64">
        <h1 className="text-xl font-bold">Flashcards</h1>
        <p className="mt-2 text-sm text-[var(--muted)]">
          12 cards due today across threads.
        </p>
        <div className="mt-4 space-y-2">
          <Button className="w-full justify-start">All due</Button>
          <Button className="w-full justify-start" variant="secondary">
            Active thread
          </Button>
          <Button className="w-full justify-start" variant="secondary">
            Choose thread
          </Button>
        </div>
      </aside>

      <section className="flex min-h-[420px] flex-1 flex-col items-center justify-center rounded-2xl border border-[var(--border)] bg-white p-6 text-center">
        <p className="text-sm font-semibold text-[var(--accent-blue)]">German A1</p>
        <h2 className="mt-4 text-4xl font-bold">die Arbeit</h2>
        <p className="mt-3 text-[var(--muted)]">Flip to see translation and example.</p>
        <div className="mt-8 grid w-full max-w-lg grid-cols-2 gap-3 sm:grid-cols-4">
          {["Again", "Hard", "Good", "Easy"].map((rating) => (
            <Button key={rating} variant="secondary">
              {rating}
            </Button>
          ))}
        </div>
      </section>
    </div>
  );
}
