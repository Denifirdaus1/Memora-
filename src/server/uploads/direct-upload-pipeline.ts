import type { SupabaseClient, User } from "@supabase/supabase-js";

import { TEMP_UPLOAD_BUCKET } from "@/features/uploads/constants";
import { buildExtractionStub } from "@/features/uploads/extraction-stub";
import { buildTempUploadPath } from "@/features/uploads/storage-path";
import {
  validateUploadBatch,
  type UploadFileCandidate,
} from "@/features/uploads/validation";
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

  for (const upload of uploads) {
    const completedAt = new Date().toISOString();

    await supabase
      .from("thread_uploads")
      .update({ status: "processing" })
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

    const { error: removeError } = await supabase.storage
      .from(TEMP_UPLOAD_BUCKET)
      .remove([upload.storage_path]);

    if (removeError) {
      await markUploadFailed({
        supabase,
        uploadId: upload.id,
        userId: user.id,
        message: removeError.message,
      });
      return { status: 500, message: removeError.message };
    }

    const extraction = buildExtractionStub({
      fileName: upload.file_name,
      mimeType: upload.mime_type,
    });

    const { error: knowledgeError } = await supabase.from("knowledge_items").insert(
      extraction.items.map((item) => ({
        ...item,
        thread_id: input.threadId,
        upload_id: upload.id,
        user_id: user.id,
      })),
    );

    if (knowledgeError) {
      await markUploadFailed({
        supabase,
        uploadId: upload.id,
        userId: user.id,
        message: knowledgeError.message,
      });
      return { status: 500, message: knowledgeError.message };
    }

    const { error: doneError } = await supabase
      .from("thread_uploads")
      .update({
        status: "done",
        extraction_summary: extraction.summary,
        storage_deleted_at: completedAt,
        completed_at: completedAt,
      })
      .eq("id", upload.id)
      .eq("user_id", user.id);

    if (doneError) {
      return { status: 500, message: doneError.message };
    }

    if (job?.id) {
      await supabase
        .from("upload_jobs")
        .update({ status: "done", completed_at: completedAt })
        .eq("id", job.id)
        .eq("user_id", user.id);
    }

    await supabase
      .from("study_threads")
      .update({
        status: "ready",
        detected_language: extraction.summary.detected_language,
        detected_topic: extraction.summary.detected_topic,
        last_activity_at: completedAt,
      })
      .eq("id", input.threadId)
      .eq("user_id", user.id);

    await supabase.from("thread_memories").upsert({
      thread_id: input.threadId,
      user_id: user.id,
      summary: `Ready to review ${extraction.summary.detected_topic ?? "uploaded material"}.`,
      key_terms: [extraction.summary.detected_topic ?? "uploaded material"],
      updated_at: completedAt,
    });
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
}): Promise<{ threadId: string } | UploadPipelineError> {
  if (input.threadId) {
    const { data, error } = await supabase
      .from("study_threads")
      .select("id")
      .eq("id", input.threadId)
      .eq("user_id", userId)
      .maybeSingle();

    if (error) {
      return { status: 500, message: error.message };
    }

    if (!data) {
      return { status: 404, message: "Study thread not found." };
    }

    return { threadId: data.id as string };
  }

  const title = input.title?.trim() || deriveTitle(input.firstMessage);
  const { data: thread, error: threadError } = await supabase
    .from("study_threads")
    .insert({
      user_id: userId,
      title,
      status: "processing",
    })
    .select("id")
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

  return { threadId: thread.id as string };
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
