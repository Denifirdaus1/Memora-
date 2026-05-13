"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import { requireUser } from "@/server/queries/auth";

export async function signInWithGoogleAction(formData: FormData) {
  const supabase = await createSupabaseServerClient();
  const origin = (await headers()).get("origin") ?? "http://localhost:3000";
  const next = readFormString(formData, "next") ?? "/dashboard";

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: {
      redirectTo: `${origin}/auth/callback?next=${encodeURIComponent(next)}`,
      queryParams: {
        access_type: "offline",
        prompt: "consent",
      },
    },
  });

  if (error || !data.url) {
    redirect("/?auth_error=google_oauth_failed");
  }

  redirect(data.url);
}

export async function signOutAction() {
  const supabase = await createSupabaseServerClient();
  await supabase.auth.signOut();
  redirect("/");
}

export async function completeOnboardingAction(formData: FormData) {
  const user = await requireUser();
  const supabase = await createSupabaseServerClient();
  const nativeLanguage = readFormString(formData, "nativeLanguage") ?? "Indonesian";
  const duration = Number(readFormString(formData, "reviewDuration") ?? 30);

  const { error } = await supabase
    .from("users")
    .update({
      native_language: nativeLanguage,
      preferred_session_duration_min: Number.isFinite(duration) ? duration : 30,
      onboarding_completed_at: new Date().toISOString(),
    })
    .eq("id", user.id);

  if (error) {
    throw new Error(error.message);
  }

  redirect("/dashboard");
}

function readFormString(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" && value.trim() ? value.trim() : null;
}
