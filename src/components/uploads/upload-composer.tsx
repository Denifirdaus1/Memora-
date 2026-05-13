"use client";

import * as Sentry from "@sentry/nextjs";
import { Loader2, UploadCloud } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, type DragEvent, type FormEvent } from "react";

import { Button } from "@/components/ui/button";
import {
  ALLOWED_UPLOAD_MIME_TYPES,
  MAX_FILES_PER_REQUEST,
  MAX_UPLOAD_BYTES,
} from "@/features/uploads/constants";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

interface PreparedUpload {
  uploadId: string;
  fileName: string;
  bucket: string;
  storagePath: string;
}

export function UploadComposer({
  threadId,
  variant = "full",
}: {
  threadId?: string;
  variant?: "full" | "compact";
}) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const isCompact = variant === "compact";

  useEffect(() => {
    function handleWindowDragOver(event: globalThis.DragEvent) {
      if (hasFiles(event)) {
        event.preventDefault();
        setIsDragging(true);
      }
    }

    function handleWindowDrop(event: globalThis.DragEvent) {
      if (!hasFiles(event)) {
        return;
      }

      event.preventDefault();
      setIsDragging(false);
      applyFiles(event.dataTransfer?.files);
    }

    function handleWindowDragLeave(event: globalThis.DragEvent) {
      if (event.clientX <= 0 || event.clientY <= 0) {
        setIsDragging(false);
      }
    }

    window.addEventListener("dragover", handleWindowDragOver);
    window.addEventListener("drop", handleWindowDrop);
    window.addEventListener("dragleave", handleWindowDragLeave);

    return () => {
      window.removeEventListener("dragover", handleWindowDragOver);
      window.removeEventListener("drop", handleWindowDrop);
      window.removeEventListener("dragleave", handleWindowDragLeave);
    };
  }, []);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    if (!selectedFiles.length) {
      setError("Attach at least one PDF or image.");
      return;
    }

    const clientValidationError = validateClientFiles(selectedFiles);

    if (clientValidationError) {
      setError(clientValidationError);
      return;
    }

    setIsUploading(true);

    const form = event.currentTarget;
    const formData = new FormData(form);
    const supabase = createSupabaseBrowserClient();
    let preparedUploads: PreparedUpload[] = [];
    let preparedThreadId = threadId;

    try {
      const prepareResponse = await fetch("/api/uploads/prepare", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          threadId,
          title: readFormValue(formData, "title"),
          firstMessage: readFormValue(formData, "firstMessage"),
          files: selectedFiles.map((file) => ({
            name: file.name,
            size: file.size,
            type: file.type,
          })),
        }),
      });

      const preparePayload = await readJsonResponse<{
        threadId?: string;
        uploads?: PreparedUpload[];
        error?: string;
      }>(prepareResponse);

      if (
        !prepareResponse.ok ||
        !preparePayload.threadId ||
        !preparePayload.uploads?.length
      ) {
        const message = preparePayload.error ?? "Upload preparation failed.";
        captureUploadIssue(message, { stage: "prepare", status: prepareResponse.status });
        setError(message);
        return;
      }

      preparedThreadId = preparePayload.threadId;
      preparedUploads = preparePayload.uploads;

      const failedUploads: Array<{ uploadId: string; message: string }> = [];
      const completedUploadIds: string[] = [];

      for (const [index, upload] of preparedUploads.entries()) {
        const file = selectedFiles[index];

        if (!file) {
          failedUploads.push({
            uploadId: upload.uploadId,
            message: "Prepared file was not found in the browser.",
          });
          continue;
        }

        const { error: storageError } = await supabase.storage
          .from(upload.bucket)
          .upload(upload.storagePath, file, {
            contentType: file.type,
            upsert: false,
          });

        if (storageError) {
          failedUploads.push({
            uploadId: upload.uploadId,
            message: storageError.message,
          });
          continue;
        }

        completedUploadIds.push(upload.uploadId);
      }

      const completeResponse = await fetch("/api/uploads/complete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          threadId: preparedThreadId,
          completedUploadIds,
          failedUploads,
        }),
      });
      const completePayload = await readJsonResponse<{
        threadId?: string;
        error?: string;
      }>(completeResponse);

      if (!completeResponse.ok || !completePayload.threadId) {
        const message = completePayload.error ?? "Upload completion failed.";
        captureUploadIssue(message, {
          stage: "complete",
          status: completeResponse.status,
        });
        setError(message);
        return;
      }

      form.reset();
      setSelectedFiles([]);
      router.push(`/threads/${completePayload.threadId}`);
      router.refresh();
    } catch (uploadError) {
      Sentry.captureException(uploadError, {
        tags: { feature: "upload", stage: "client" },
        extra: {
          threadId: preparedThreadId,
          preparedUploadIds: preparedUploads.map((upload) => upload.uploadId),
        },
      });
      setError("Upload failed. Check your connection and try again.");
    } finally {
      setIsUploading(false);
    }
  }

  function applyFiles(fileList?: FileList | null) {
    const files = Array.from(fileList ?? []);

    if (!files.length) {
      return;
    }

    setError(null);
    setSelectedFiles(files);
  }

  function handleDrop(event: DragEvent<HTMLLabelElement>) {
    event.preventDefault();
    setIsDragging(false);
    applyFiles(event.dataTransfer.files);
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
        onDragOver={(event) => {
          event.preventDefault();
          setIsDragging(true);
        }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={handleDrop}
        className={
          isCompact
            ? `flex cursor-pointer items-center gap-3 rounded-xl border border-dashed p-3 ${isDragging ? "border-[var(--accent-blue)] bg-[#EAF2FF]" : "border-[var(--border-strong)] bg-white"}`
            : `flex min-h-44 cursor-pointer flex-col items-center justify-center rounded-xl border border-dashed p-6 text-center ${isDragging ? "border-[var(--accent-blue)] bg-[#EAF2FF]" : "border-[var(--border-strong)] bg-[var(--surface-raised)]"}`
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
          ref={inputRef}
          className="sr-only"
          type="file"
          name="files"
          accept="application/pdf,image/jpeg,image/png,image/webp"
          multiple
          onChange={(event) => applyFiles(event.currentTarget.files)}
        />
      </label>

      {selectedFiles.length ? (
        <div className="rounded-lg border border-[var(--border)] bg-white p-3 text-sm">
          <p className="font-semibold">
            {selectedFiles.length} file{selectedFiles.length > 1 ? "s" : ""} ready
          </p>
          <ul className="mt-2 space-y-1 text-[var(--muted)]">
            {selectedFiles.map((file) => (
              <li key={`${file.name}-${file.size}`} className="truncate">
                {file.name} · {formatBytes(file.size)}
              </li>
            ))}
          </ul>
        </div>
      ) : null}

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

async function readJsonResponse<T>(response: Response): Promise<T> {
  const text = await response.text();

  if (!text) {
    return {} as T;
  }

  try {
    return JSON.parse(text) as T;
  } catch {
    return { error: text.slice(0, 240) } as T;
  }
}

function readFormValue(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function validateClientFiles(files: File[]) {
  if (files.length > MAX_FILES_PER_REQUEST) {
    return `Upload up to ${MAX_FILES_PER_REQUEST} files at a time.`;
  }

  for (const file of files) {
    if (!ALLOWED_UPLOAD_MIME_TYPES.includes(file.type as never)) {
      return `${file.name} is not a supported PDF or image.`;
    }

    if (file.size > MAX_UPLOAD_BYTES) {
      return `${file.name} is larger than ${MAX_UPLOAD_BYTES / 1024 / 1024} MB.`;
    }
  }

  return null;
}

function hasFiles(event: globalThis.DragEvent) {
  return Array.from(event.dataTransfer?.types ?? []).includes("Files");
}

function captureUploadIssue(message: string, extra: Record<string, unknown>) {
  Sentry.captureMessage(message, {
    level: "warning",
    tags: { feature: "upload" },
    extra,
  });
}

function formatBytes(bytes: number) {
  if (bytes < 1024 * 1024) {
    return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  }

  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}
