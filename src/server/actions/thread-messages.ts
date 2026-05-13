"use server";

import { revalidatePath } from "next/cache";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import { requireCompletedOnboarding } from "@/server/queries/auth";

export async function createThreadMessageAction(formData: FormData) {
  const profile = await requireCompletedOnboarding();
  const supabase = await createSupabaseServerClient();
  const threadId = readFormString(formData, "threadId");
  const message = readFormString(formData, "message");

  if (!threadId || !message) {
    return;
  }

  const { data: thread, error: threadError } = await supabase
    .from("study_threads")
    .select("id")
    .eq("id", threadId)
    .eq("user_id", profile.id)
    .maybeSingle();

  if (threadError) {
    throw new Error(threadError.message);
  }

  if (!thread) {
    throw new Error("Study thread not found.");
  }

  const { error: userMessageError } = await supabase.from("thread_messages").insert({
    thread_id: threadId,
    user_id: profile.id,
    role: "user",
    content: { text: message },
  });

  if (userMessageError) {
    throw new Error(userMessageError.message);
  }

  const { error: assistantMessageError } = await supabase.from("thread_messages").insert({
    thread_id: threadId,
    user_id: profile.id,
    role: "assistant",
    content: {
      text: "I saved this note in the study thread. Upload extraction and live AI responses are scheduled for the next sprint.",
    },
    provider: "memora_stub",
  });

  if (assistantMessageError) {
    throw new Error(assistantMessageError.message);
  }

  const { error: updateError } = await supabase
    .from("study_threads")
    .update({ last_activity_at: new Date().toISOString() })
    .eq("id", threadId)
    .eq("user_id", profile.id);

  if (updateError) {
    throw new Error(updateError.message);
  }

  revalidatePath(`/threads/${threadId}`);
}

function readFormString(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" && value.trim() ? value.trim() : null;
}
