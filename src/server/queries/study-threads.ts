import { createSupabaseServerClient } from "@/lib/supabase/server";
import { requireUser } from "@/server/queries/auth";
import type {
  StudyThread,
  ThreadMemory,
  ThreadMessage,
  ThreadUpload,
} from "@/types/database";

export async function listStudyThreads() {
  const user = await requireUser();
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("study_threads")
    .select("*")
    .eq("user_id", user.id)
    .order("last_activity_at", { ascending: false });

  if (error) {
    throw new Error(error.message);
  }

  return (data ?? []) as StudyThread[];
}

export async function getStudyThread(threadId: string) {
  if (!isUuid(threadId)) {
    return null;
  }

  const user = await requireUser();
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("study_threads")
    .select("*")
    .eq("id", threadId)
    .eq("user_id", user.id)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  return data as StudyThread | null;
}

export async function getThreadMessages(threadId: string) {
  if (!isUuid(threadId)) {
    return [];
  }

  const user = await requireUser();
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("thread_messages")
    .select("*")
    .eq("thread_id", threadId)
    .eq("user_id", user.id)
    .order("created_at", { ascending: true });

  if (error) {
    throw new Error(error.message);
  }

  return (data ?? []) as ThreadMessage[];
}

export async function getThreadUploads(threadId: string) {
  void threadId;
  return [] as ThreadUpload[];
}

export async function getThreadMemory(threadId: string) {
  if (!isUuid(threadId)) {
    return null;
  }

  const user = await requireUser();
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("thread_memories")
    .select("*")
    .eq("thread_id", threadId)
    .eq("user_id", user.id)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  return data as ThreadMemory | null;
}

function isUuid(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    value,
  );
}
