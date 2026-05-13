export const TEMP_UPLOAD_BUCKET = "temp-uploads";

export const MAX_UPLOAD_BYTES = 10 * 1024 * 1024;

export const MAX_FILES_PER_REQUEST = 3;

export const ALLOWED_UPLOAD_MIME_TYPES = [
  "application/pdf",
  "image/jpeg",
  "image/png",
  "image/webp",
] as const;

export type AllowedUploadMimeType = (typeof ALLOWED_UPLOAD_MIME_TYPES)[number];
