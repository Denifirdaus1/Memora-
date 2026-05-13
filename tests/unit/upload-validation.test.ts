import { describe, expect, it } from "vitest";

import { MAX_FILES_PER_REQUEST, MAX_UPLOAD_BYTES } from "@/features/uploads/constants";
import { validateUploadBatch, validateUploadFile } from "@/features/uploads/validation";

describe("upload validation", () => {
  it("accepts supported PDFs and images under the size limit", () => {
    const file = new File(["study"], "kapitel-3.pdf", { type: "application/pdf" });

    expect(validateUploadFile(file)).toEqual({ ok: true });
  });

  it("rejects unsupported file types", () => {
    const file = new File(["study"], "notes.txt", { type: "text/plain" });

    expect(validateUploadFile(file).ok).toBe(false);
  });

  it("rejects files larger than the upload limit", () => {
    const file = new File([new Uint8Array(MAX_UPLOAD_BYTES + 1)], "large.pdf", {
      type: "application/pdf",
    });

    expect(validateUploadFile(file).ok).toBe(false);
  });

  it("limits the number of files per request", () => {
    const files = Array.from(
      { length: MAX_FILES_PER_REQUEST + 1 },
      (_, index) => new File(["study"], `page-${index}.png`, { type: "image/png" }),
    );

    expect(validateUploadBatch(files).ok).toBe(false);
  });
});
