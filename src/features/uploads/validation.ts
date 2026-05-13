import {
  ALLOWED_UPLOAD_MIME_TYPES,
  MAX_FILES_PER_REQUEST,
  MAX_UPLOAD_BYTES,
  type AllowedUploadMimeType,
} from "./constants";

export interface UploadValidationResult {
  ok: boolean;
  error?: string;
}

export function validateUploadBatch(files: File[]): UploadValidationResult {
  if (files.length === 0) {
    return { ok: false, error: "Attach at least one PDF or image." };
  }

  if (files.length > MAX_FILES_PER_REQUEST) {
    return {
      ok: false,
      error: `Upload up to ${MAX_FILES_PER_REQUEST} files at a time.`,
    };
  }

  for (const file of files) {
    const result = validateUploadFile(file);
    if (!result.ok) {
      return result;
    }
  }

  return { ok: true };
}

export function validateUploadFile(file: File): UploadValidationResult {
  if (!isAllowedUploadMimeType(file.type)) {
    return {
      ok: false,
      error: `${file.name || "File"} is not a supported PDF or image.`,
    };
  }

  if (file.size > MAX_UPLOAD_BYTES) {
    return {
      ok: false,
      error: `${file.name || "File"} is larger than 10 MB.`,
    };
  }

  return { ok: true };
}

export function isAllowedUploadMimeType(value: string): value is AllowedUploadMimeType {
  return ALLOWED_UPLOAD_MIME_TYPES.some((mimeType) => mimeType === value);
}
