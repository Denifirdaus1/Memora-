export function buildTempUploadPath({
  userId,
  threadId,
  uploadId,
  fileName,
}: {
  userId: string;
  threadId: string;
  uploadId: string;
  fileName: string;
}) {
  return `${userId}/${threadId}/${uploadId}/${sanitizeFileName(fileName)}`;
}

export function sanitizeFileName(fileName: string) {
  const cleanName = fileName
    .normalize("NFKD")
    .replace(/[^\w.\-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .toLowerCase();

  return cleanName || "upload";
}
