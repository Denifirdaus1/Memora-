"use server";

import { redirect } from "next/navigation";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import { requireCompletedOnboarding } from "@/server/queries/auth";

export async function createStudyThreadAction(formData: FormData) {
  const profile = await requireCompletedOnboarding();
  const supabase = await createSupabaseServerClient();
  const firstMessage = readFormString(formData, "firstMessage");
  const title = readFormString(formData, "title") ?? deriveTitle(firstMessage);

  const { data: thread, error: threadError } = await supabase
    .from("study_threads")
    .insert({
      user_id: profile.id,
      title,
      status: "empty",
    })
    .select("id")
    .single();

  if (threadError) {
    throw new Error(threadError.message);
  }

  const { error: memoryError } = await supabase.from("thread_memories").insert({
    thread_id: thread.id,
    user_id: profile.id,
    summary: "No extracted study material yet.",
    key_terms: [],
  });

  if (memoryError) {
    throw new Error(memoryError.message);
  }

  if (firstMessage) {
    const { error: messageError } = await supabase.from("thread_messages").insert({
      thread_id: thread.id,
      user_id: profile.id,
      role: "user",
      content: { text: firstMessage },
    });

    if (messageError) {
      throw new Error(messageError.message);
    }
  }

  redirect(`/threads/${thread.id}`);
}

function readFormString(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function deriveTitle(firstMessage: string | null) {
  if (!firstMessage) {
    return "New study thread";
  }

  return firstMessage.length > 72 ? `${firstMessage.slice(0, 69)}...` : firstMessage;
}
