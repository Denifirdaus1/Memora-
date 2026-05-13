import { ShieldCheck } from "lucide-react";

import { UploadComposer } from "@/components/uploads/upload-composer";

export function NewStudyComposer() {
  return (
    <section className="mx-auto flex w-full max-w-3xl flex-col rounded-2xl border border-[var(--border-strong)] bg-white p-5 shadow-sm sm:p-6">
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

      <UploadComposer />

      <div className="mt-4 flex items-start gap-2 rounded-lg bg-[#EAF2FF] p-3 text-sm text-[var(--accent-navy)]">
        <ShieldCheck className="mt-0.5 shrink-0" size={16} />
        <span>Files are processed temporarily. Only learning data is saved.</span>
      </div>
    </section>
  );
}
