import type { SupabaseClient, User } from "@supabase/supabase-js";

import { TEMP_UPLOAD_BUCKET } from "@/features/uploads/constants";
import { buildTempUploadPath } from "@/features/uploads/storage-path";
import {
  validateUploadBatch,
  type UploadFileCandidate,
} from "@/features/uploads/validation";
import { processUploadWithAi } from "@/server/uploads/process-upload-with-ai";
import type { UserProfile } from "@/types/database";

export interface DirectUploadPrepareInput {
  files: UploadFileCandidate[];
  threadId?: string | null;
  title?: string | null;
  firstMessage?: string | null;
}

export interface DirectUploadPrepareResult {
  threadId: string;
  uploads: Array<{
    uploadId: string;
    fileName: string;
    bucket: string;
    storagePath: string;
  }>;
}

export interface DirectUploadCompleteInput {
  threadId: string;
  completedUploadIds: string[];
  failedUploads?: Array<{ uploadId: string; message: string }>;
}

export interface UploadPipelineError {
  status: number;
  message: string;
}

export async function prepareDirectUploads({
  input,
  supabase,
  user,
  profile,
}: {
  input: DirectUploadPrepareInput;
  supabase: SupabaseClient;
  user: User;
  profile: UserProfile;
}): Promise<DirectUploadPrepareResult | UploadPipelineError> {
  if (!profile.onboarding_completed_at) {
    return { status: 403, message: "Complete onboarding before uploading material." };
  }

  const validation = validateUploadBatch(input.files);

  if (!validation.ok) {
    return { status: 400, message: validation.error ?? "Invalid upload." };
  }

  const threadResult = await resolveThread({
    input,
    supabase,
    userId: user.id,
  });

  if ("status" in threadResult) {
    return threadResult;
  }

  const uploads: DirectUploadPrepareResult["uploads"] = [];

  for (const file of input.files) {
    const uploadId = crypto.randomUUID();
    const storagePath = buildTempUploadPath({
      userId: user.id,
      threadId: threadResult.threadId,
      uploadId,
      fileName: file.name,
    });

    const { error: uploadRowError } = await supabase.from("thread_uploads").insert({
      id: uploadId,
      thread_id: threadResult.threadId,
      user_id: user.id,
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

    const { error: jobError } = await supabase.from("upload_jobs").insert({
      upload_id: uploadId,
      thread_id: threadResult.threadId,
      user_id: user.id,
      status: "queued",
    });

    if (jobError) {
      await markUploadFailed({
        supabase,
        uploadId,
        userId: user.id,
        message: jobError.message,
      });
      return { status: 500, message: jobError.message };
    }

    uploads.push({
      uploadId,
      fileName: file.name,
      bucket: TEMP_UPLOAD_BUCKET,
      storagePath,
    });
  }

  return { threadId: threadResult.threadId, uploads };
}

export async function completeDirectUploads({
  input,
  supabase,
  user,
}: {
  input: DirectUploadCompleteInput;
  supabase: SupabaseClient;
  user: User;
}): Promise<{ threadId: string; uploadIds: string[] } | UploadPipelineError> {
  if (input.failedUploads?.length) {
    for (const failed of input.failedUploads) {
      await markUploadFailed({
        supabase,
        uploadId: failed.uploadId,
        userId: user.id,
        message: failed.message,
      });
    }
  }

  if (!input.completedUploadIds.length) {
    return {
      status: 400,
      message: input.failedUploads?.[0]?.message ?? "Upload failed.",
    };
  }

  const { data: uploads, error: uploadsError } = await supabase
    .from("thread_uploads")
    .select("*")
    .eq("thread_id", input.threadId)
    .eq("user_id", user.id)
    .in("id", input.completedUploadIds);

  if (uploadsError) {
    return { status: 500, message: uploadsError.message };
  }

  if (!uploads?.length) {
    return { status: 404, message: "Prepared upload was not found." };
  }

  const { data: thread, error: threadError } = await supabase
    .from("study_threads")
    .select("id,title")
    .eq("id", input.threadId)
    .eq("user_id", user.id)
    .maybeSingle();

  if (threadError) {
    return { status: 500, message: threadError.message };
  }

  if (!thread) {
    return { status: 404, message: "Study thread not found." };
  }

  for (const upload of uploads) {
    const completedAt = new Date().toISOString();

    await supabase
      .from("thread_uploads")
      .update({ status: "uploaded" })
      .eq("id", upload.id)
      .eq("user_id", user.id);

    const { data: job } = await supabase
      .from("upload_jobs")
      .update({
        status: "processing",
        attempts: 1,
        started_at: completedAt,
      })
      .eq("upload_id", upload.id)
      .eq("user_id", user.id)
      .select("id")
      .maybeSingle();

    const { data: fileBlob, error: downloadError } = await supabase.storage
      .from(TEMP_UPLOAD_BUCKET)
      .download(upload.storage_path);

    if (downloadError || !fileBlob) {
      const message = downloadError?.message ?? "Uploaded file was not found in storage.";
      await markUploadFailed({
        supabase,
        uploadId: upload.id,
        userId: user.id,
        message,
      });
      return { status: 500, message };
    }

    await supabase
      .from("thread_uploads")
      .update({ status: "processing" })
      .eq("id", upload.id)
      .eq("user_id", user.id);

    try {
      await processUploadWithAi({
        supabase,
        userId: user.id,
        thread: {
          id: thread.id as string,
          title: thread.title as string,
        },
        upload: {
          id: upload.id as string,
          file_name: upload.file_name as string,
          mime_type: upload.mime_type as string,
        },
        fileBuffer: Buffer.from(await fileBlob.arrayBuffer()),
      });
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "AI extraction failed for this upload.";
      await markUploadFailed({
        supabase,
        uploadId: upload.id,
        userId: user.id,
        message,
      });
      return { status: 500, message };
    }

    const { error: removeError } = await supabase.storage
      .from(TEMP_UPLOAD_BUCKET)
      .remove([upload.storage_path]);

    await supabase
      .from("thread_uploads")
      .update({
        storage_deleted_at: removeError ? null : new Date().toISOString(),
        error_message: removeError ? removeError.message : null,
      })
      .eq("id", upload.id)
      .eq("user_id", user.id);

    if (job?.id) {
      await supabase
        .from("upload_jobs")
        .update({ status: "done", completed_at: completedAt })
        .eq("id", job.id)
        .eq("user_id", user.id);
    }
  }

  return {
    threadId: input.threadId,
    uploadIds: uploads.map((upload) => upload.id as string),
  };
}

async function resolveThread({
  input,
  supabase,
  userId,
}: {
  input: DirectUploadPrepareInput;
  supabase: SupabaseClient;
  userId: string;
}): Promise<{ threadId: string; title: string } | UploadPipelineError> {
  if (input.threadId) {
    const { data, error } = await supabase
      .from("study_threads")
      .select("id,title")
      .eq("id", input.threadId)
      .eq("user_id", userId)
      .maybeSingle();

    if (error) {
      return { status: 500, message: error.message };
    }

    if (!data) {
      return { status: 404, message: "Study thread not found." };
    }

    return { threadId: data.id as string, title: data.title as string };
  }

  const title = input.title?.trim() || deriveTitle(input.firstMessage);
  const { data: thread, error: threadError } = await supabase
    .from("study_threads")
    .insert({
      user_id: userId,
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
    user_id: userId,
    summary: "Upload processing started. Extraction summary will appear here.",
    key_terms: [],
  });

  if (memoryError) {
    return { status: 500, message: memoryError.message };
  }

  if (input.firstMessage?.trim()) {
    const { error: messageError } = await supabase.from("thread_messages").insert({
      thread_id: thread.id,
      user_id: userId,
      role: "user",
      content: { text: input.firstMessage.trim() },
    });

    if (messageError) {
      return { status: 500, message: messageError.message };
    }
  }

  return { threadId: thread.id as string, title: thread.title as string };
}

async function markUploadFailed({
  supabase,
  uploadId,
  userId,
  message,
}: {
  supabase: SupabaseClient;
  uploadId: string;
  userId: string;
  message: string;
}) {
  const completedAt = new Date().toISOString();

  await supabase
    .from("thread_uploads")
    .update({
      status: "failed",
      error_message: message,
      completed_at: completedAt,
    })
    .eq("id", uploadId)
    .eq("user_id", userId);

  await supabase
    .from("upload_jobs")
    .update({
      status: "failed",
      last_error: message,
      completed_at: completedAt,
    })
    .eq("upload_id", uploadId)
    .eq("user_id", userId);
}

function deriveTitle(firstMessage?: string | null) {
  if (!firstMessage?.trim()) {
    return "Uploaded study material";
  }

  return firstMessage.length > 72 ? `${firstMessage.slice(0, 69)}...` : firstMessage;
}
