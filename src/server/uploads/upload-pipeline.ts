import type { SupabaseClient, User } from "@supabase/supabase-js";

import { TEMP_UPLOAD_BUCKET } from "@/features/uploads/constants";
import { buildTempUploadPath } from "@/features/uploads/storage-path";
import { validateUploadBatch } from "@/features/uploads/validation";
import { processUploadWithAi } from "@/server/uploads/process-upload-with-ai";
import type { UserProfile } from "@/types/database";

export interface UploadPipelineResult {
  threadId: string;
  uploadIds: string[];
}

export interface UploadPipelineError {
  status: number;
  message: string;
}

interface ResolvedThread {
  threadId: string;
  title: string;
}

interface ProcessedUpload {
  uploadId: string;
}

export async function runUploadPipeline({
  formData,
  supabase,
  user,
  profile,
}: {
  formData: FormData;
  supabase: SupabaseClient;
  user: User;
  profile: UserProfile;
}): Promise<UploadPipelineResult | UploadPipelineError> {
  if (!profile.native_language || !profile.onboarding_completed_at) {
    return { status: 403, message: "Complete onboarding before uploading material." };
  }

  const files = formData.getAll("files").filter(isFileWithContent);
  const validation = validateUploadBatch(files);

  if (!validation.ok) {
    return { status: 400, message: validation.error ?? "Invalid upload." };
  }

  const threadResult = await resolveThread({ formData, supabase, user });
  if ("status" in threadResult) {
    return threadResult;
  }

  const uploadIds: string[] = [];

  for (const file of files) {
    const uploadResult = await processSingleFile({
      file,
      supabase,
      thread: threadResult,
      userId: user.id,
    });

    if ("status" in uploadResult) {
      return uploadResult;
    }

    uploadIds.push(uploadResult.uploadId);
  }

  return { threadId: threadResult.threadId, uploadIds };
}

async function resolveThread({
  formData,
  supabase,
  user,
}: {
  formData: FormData;
  supabase: SupabaseClient;
  user: User;
}): Promise<ResolvedThread | UploadPipelineError> {
  const threadId = readFormString(formData, "threadId");

  if (threadId) {
    const { data, error } = await supabase
      .from("study_threads")
      .select("id,title")
      .eq("id", threadId)
      .eq("user_id", user.id)
      .maybeSingle();

    if (error) {
      return { status: 500, message: error.message };
    }

    if (!data) {
      return { status: 404, message: "Study thread not found." };
    }

    return { threadId: data.id as string, title: data.title as string };
  }

  const firstMessage = readFormString(formData, "firstMessage");
  const title = readFormString(formData, "title") ?? deriveTitle(firstMessage);

  const { data: thread, error: threadError } = await supabase
    .from("study_threads")
    .insert({
      user_id: user.id,
      title,
      status: "processing",
    })
    .select("id,title")
    .single();

  if (threadError) {
    return { status: 500, message: threadError.message };
  }

  const { error: memoryError } = await supabase.from("thread_memories").insert({
    thread_id: thread.id,
    user_id: user.id,
    summary: "Upload processing started. Extraction summary will appear here.",
    key_terms: [],
  });

  if (memoryError) {
    return { status: 500, message: memoryError.message };
  }

  if (firstMessage) {
    const { error: messageError } = await supabase.from("thread_messages").insert({
      thread_id: thread.id,
      user_id: user.id,
      role: "user",
      content: { text: firstMessage },
    });

    if (messageError) {
      return { status: 500, message: messageError.message };
    }
  }

  return { threadId: thread.id as string, title: thread.title as string };
}

async function processSingleFile({
  file,
  supabase,
  thread,
  userId,
}: {
  file: File;
  supabase: SupabaseClient;
  thread: ResolvedThread;
  userId: string;
}): Promise<ProcessedUpload | UploadPipelineError> {
  const uploadId = crypto.randomUUID();
  const storagePath = buildTempUploadPath({
    userId,
    threadId: thread.threadId,
    uploadId,
    fileName: file.name,
  });

  const { error: uploadRowError } = await supabase.from("thread_uploads").insert({
    id: uploadId,
    thread_id: thread.threadId,
    user_id: userId,
    file_name: file.name,
    file_size_bytes: file.size,
    mime_type: file.type,
    status: "queued",
    storage_bucket: TEMP_UPLOAD_BUCKET,
    storage_path: storagePath,
  });

  if (uploadRowError) {
    return { status: 500, message: uploadRowError.message };
  }

  const { data: job, error: jobError } = await supabase
    .from("upload_jobs")
    .insert({
      upload_id: uploadId,
      thread_id: thread.threadId,
      user_id: userId,
      status: "queued",
    })
    .select("id")
    .single();

  if (jobError) {
    await markUploadFailed({ supabase, uploadId, message: jobError.message });
    return { status: 500, message: jobError.message };
  }

  const startedAt = new Date().toISOString();
  await supabase
    .from("thread_uploads")
    .update({ status: "processing" })
    .eq("id", uploadId)
    .eq("user_id", userId);
  await supabase
    .from("upload_jobs")
    .update({ status: "processing", attempts: 1, started_at: startedAt })
    .eq("id", job.id)
    .eq("user_id", userId);

  const { error: storageError } = await supabase.storage
    .from(TEMP_UPLOAD_BUCKET)
    .upload(storagePath, file, {
      contentType: file.type,
      upsert: false,
    });

  if (storageError) {
    await markJobFailed({
      supabase,
      jobId: job.id,
      userId,
      message: storageError.message,
    });
    await markUploadFailed({ supabase, uploadId, message: storageError.message });
    return { status: 500, message: storageError.message };
  }

  try {
    await processUploadWithAi({
      supabase,
      userId,
      thread: {
        id: thread.threadId,
        title: thread.title,
      },
      upload: {
        id: uploadId,
        file_name: file.name,
        mime_type: file.type,
      },
      fileBuffer: Buffer.from(await file.arrayBuffer()),
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "AI extraction failed for this upload.";
    await markJobFailed({
      supabase,
      jobId: job.id,
      userId,
      message,
    });
    await markUploadFailed({ supabase, uploadId, message });
    return { status: 500, message };
  }

  const completedAt = new Date().toISOString();
  const { error: removeError } = await supabase.storage
    .from(TEMP_UPLOAD_BUCKET)
    .remove([storagePath]);

  await supabase
    .from("thread_uploads")
    .update({
      storage_deleted_at: removeError ? null : completedAt,
      error_message: removeError ? removeError.message : null,
    })
    .eq("id", uploadId)
    .eq("user_id", userId);

  await supabase
    .from("upload_jobs")
    .update({ status: "done", completed_at: completedAt })
    .eq("id", job.id)
    .eq("user_id", userId);

  await supabase
    .from("study_threads")
    .update({
      status: "ready",
      last_activity_at: completedAt,
    })
    .eq("id", thread.threadId)
    .eq("user_id", userId);

  return { uploadId };
}

async function markUploadFailed({
  supabase,
  uploadId,
  message,
}: {
  supabase: SupabaseClient;
  uploadId: string;
  message: string;
}) {
  await supabase
    .from("thread_uploads")
    .update({
      status: "failed",
      error_message: message,
      completed_at: new Date().toISOString(),
    })
    .eq("id", uploadId);
}

async function markJobFailed({
  supabase,
  jobId,
  userId,
  message,
}: {
  supabase: SupabaseClient;
  jobId: string;
  userId: string;
  message: string;
}) {
  await supabase
    .from("upload_jobs")
    .update({
      status: "failed",
      last_error: message,
      completed_at: new Date().toISOString(),
    })
    .eq("id", jobId)
    .eq("user_id", userId);
}

function isFileWithContent(value: FormDataEntryValue): value is File {
  return value instanceof File && value.size > 0;
}

function readFormString(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function deriveTitle(firstMessage: string | null) {
  if (!firstMessage) {
    return "Uploaded study material";
  }

  return firstMessage.length > 72 ? `${firstMessage.slice(0, 69)}...` : firstMessage;
}
