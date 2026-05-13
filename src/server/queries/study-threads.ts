import { isUuid } from "@/lib/utils";
import { requireAuthenticatedSupabase } from "@/server/queries/auth";
import type {
  KnowledgeItem,
  StudyThread,
  ThreadMemory,
  ThreadMessage,
  ThreadUpload,
} from "@/types/database";

export async function listStudyThreads() {
  const { supabase, user } = await requireAuthenticatedSupabase();
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

  const { supabase, user } = await requireAuthenticatedSupabase(`/threads/${threadId}`);
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

  const { supabase, user } = await requireAuthenticatedSupabase(`/threads/${threadId}`);
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
  if (!isUuid(threadId)) {
    return [];
  }

  const { supabase, user } = await requireAuthenticatedSupabase(`/threads/${threadId}`);
  const { data, error } = await supabase
    .from("thread_uploads")
    .select("*")
    .eq("thread_id", threadId)
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  if (error) {
    throw new Error(error.message);
  }

  return (data ?? []) as ThreadUpload[];
}

export async function getThreadMemory(threadId: string) {
  if (!isUuid(threadId)) {
    return null;
  }

  const { supabase, user } = await requireAuthenticatedSupabase(`/threads/${threadId}`);
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

export async function getThreadKnowledgeItems(threadId: string) {
  if (!isUuid(threadId)) {
    return [];
  }

  const { supabase, user } = await requireAuthenticatedSupabase(`/threads/${threadId}`);
  const { data, error } = await supabase
    .from("knowledge_items")
    .select("*")
    .eq("thread_id", threadId)
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  if (error) {
    throw new Error(error.message);
  }

  return (data ?? []) as KnowledgeItem[];
}
