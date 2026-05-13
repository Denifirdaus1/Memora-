"use client";

import { Loader2, UploadCloud } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";

import { Button } from "@/components/ui/button";
import { MAX_FILES_PER_REQUEST, MAX_UPLOAD_BYTES } from "@/features/uploads/constants";

export function UploadComposer({
  threadId,
  variant = "full",
}: {
  threadId?: string;
  variant?: "full" | "compact";
}) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const isCompact = variant === "compact";

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setIsUploading(true);

    const form = event.currentTarget;
    const formData = new FormData(form);

    try {
      const response = await fetch("/api/uploads", {
        method: "POST",
        body: formData,
      });
      const payload = (await response.json()) as {
        threadId?: string;
        error?: string;
      };

      if (!response.ok || !payload.threadId) {
        setError(payload.error ?? "Upload failed.");
        return;
      }

      form.reset();
      router.push(`/threads/${payload.threadId}`);
      router.refresh();
    } catch {
      setError("Upload failed. Check your connection and try again.");
    } finally {
      setIsUploading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className={isCompact ? "space-y-3" : "space-y-4"}>
      {threadId ? <input type="hidden" name="threadId" value={threadId} /> : null}

      {!threadId ? (
        <label className="block">
          <span className="text-sm font-semibold">Study title</span>
          <input
            name="title"
            className="mt-2 h-11 w-full rounded-xl border border-[var(--border)] bg-white px-3 text-sm outline-none transition focus:border-[var(--accent-blue)] focus:ring-2 focus:ring-blue-100"
            placeholder="German A1 Kapitel 3"
          />
        </label>
      ) : null}

      <label
        className={
          isCompact
            ? "flex cursor-pointer items-center gap-3 rounded-xl border border-dashed border-[var(--border-strong)] bg-white p-3"
            : "flex min-h-44 cursor-pointer flex-col items-center justify-center rounded-xl border border-dashed border-[var(--border-strong)] bg-[var(--surface-raised)] p-6 text-center"
        }
      >
        <UploadCloud
          className={
            isCompact ? "text-[var(--accent-blue)]" : "mb-3 text-[var(--accent-blue)]"
          }
          size={isCompact ? 20 : 30}
        />
        <span>
          <span className="block font-bold">
            {isCompact ? "Attach PDF/images" : "Drop PDF/images here"}
          </span>
          <span className="mt-1 block text-sm text-[var(--muted)]">
            PDF, JPG, PNG, WEBP. Max {MAX_UPLOAD_BYTES / 1024 / 1024} MB each.
          </span>
        </span>
        <input
          className="sr-only"
          type="file"
          name="files"
          accept="application/pdf,image/jpeg,image/png,image/webp"
          multiple
          required
        />
      </label>

      {!threadId ? (
        <label className="block">
          <span className="text-sm font-semibold">Optional first message</span>
          <textarea
            name="firstMessage"
            className="mt-2 min-h-24 w-full resize-none rounded-xl border border-[var(--border)] bg-white p-3 text-sm outline-none transition focus:border-[var(--accent-blue)] focus:ring-2 focus:ring-blue-100"
            placeholder="I want to study German A1 Kapitel 3 and practice vocabulary in varied question types."
          />
        </label>
      ) : null}

      {error ? (
        <p className="rounded-lg bg-red-50 px-3 py-2 text-sm font-semibold text-[var(--danger)]">
          {error}
        </p>
      ) : null}

      <div
        className={isCompact ? "flex items-center justify-between gap-3" : "flex gap-3"}
      >
        <p className="text-xs text-[var(--muted)]">
          Up to {MAX_FILES_PER_REQUEST} files per upload. Raw files are deleted after
          processing.
        </p>
        <Button type="submit" disabled={isUploading} size={isCompact ? "md" : "lg"}>
          {isUploading ? (
            <Loader2 className="animate-spin" size={16} />
          ) : (
            <UploadCloud size={16} />
          )}
          {isUploading ? "Processing" : threadId ? "Upload" : "Start study"}
        </Button>
      </div>
    </form>
  );
}
