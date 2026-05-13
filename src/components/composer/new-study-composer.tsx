import { FileUp, ShieldCheck } from "lucide-react";

import { Button } from "@/components/ui/button";
import { createStudyThreadAction } from "@/server/actions/create-study-thread";

export function NewStudyComposer() {
  return (
    <form
      action={createStudyThreadAction}
      className="mx-auto flex w-full max-w-3xl flex-col rounded-2xl border border-[var(--border-strong)] bg-white p-5 shadow-sm sm:p-6"
    >
      <div className="mb-5">
        <p className="text-sm font-semibold text-[var(--accent-blue)]">New Study</p>
        <h1 className="mt-1 text-2xl font-bold text-[var(--foreground)]">
          What do you want to study?
        </h1>
        <p className="mt-2 text-sm leading-6 text-[var(--muted)]">
          Upload a PDF or image from your learning material. Memora will extract learning
          items and turn them into review practice.
        </p>
      </div>

      <label className="mb-4">
        <span className="text-sm font-semibold">Study title</span>
        <input
          name="title"
          className="mt-2 h-11 w-full rounded-xl border border-[var(--border)] bg-white px-3 text-sm outline-none transition focus:border-[var(--accent-blue)] focus:ring-2 focus:ring-blue-100"
          placeholder="German A1 Kapitel 3"
        />
      </label>

      <div className="flex min-h-44 flex-col items-center justify-center rounded-xl border border-dashed border-[var(--border-strong)] bg-[var(--surface-raised)] p-6 text-center">
        <FileUp className="mb-3 text-[var(--accent-blue)]" size={30} />
        <p className="font-bold">Drop PDF/images here</p>
        <p className="mt-1 text-sm text-[var(--muted)]">
          JPG, PNG, WEBP, PDF. Max 10 MB.
        </p>
      </div>

      <label className="mt-4">
        <span className="text-sm font-semibold">Optional first message</span>
        <textarea
          name="firstMessage"
          className="mt-2 min-h-24 w-full resize-none rounded-xl border border-[var(--border)] bg-white p-3 text-sm outline-none transition focus:border-[var(--accent-blue)] focus:ring-2 focus:ring-blue-100"
          placeholder="I want to study German A1 Kapitel 3 and practice vocabulary in varied question types."
        />
      </label>

      <div className="mt-4 flex items-start gap-2 rounded-lg bg-[#EAF2FF] p-3 text-sm text-[var(--accent-navy)]">
        <ShieldCheck className="mt-0.5 shrink-0" size={16} />
        <span>Files are processed temporarily. Only learning data is saved.</span>
      </div>

      <div className="mt-5 flex flex-col gap-3 sm:flex-row">
        <Button size="lg" type="submit">
          Start study thread
        </Button>
        <Button variant="secondary" size="lg" type="button" disabled>
          Select files
        </Button>
      </div>
    </form>
  );
}
