import type { User } from "@supabase/supabase-js";
import { redirect } from "next/navigation";

import { isSupabaseConfigured } from "@/lib/env";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { UserProfile } from "@/types/database";

export async function getCurrentUser() {
  if (!isSupabaseConfigured()) {
    return null;
  }

  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return user;
}

export async function requireUser(next = "/dashboard") {
  const user = await getCurrentUser();

  if (!user) {
    redirect(`/?${new URLSearchParams({ next }).toString()}`);
  }

  return user;
}

export async function getCurrentUserProfile() {
  const user = await getCurrentUser();

  if (!user) {
    return null;
  }

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("users")
    .select("*")
    .eq("id", user.id)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  return data ? (data as UserProfile) : ensureUserProfile(user);
}

export async function requireUserProfile(next = "/dashboard") {
  const profile = await getCurrentUserProfile();

  if (!profile) {
    redirect(`/?${new URLSearchParams({ next }).toString()}`);
  }

  return profile;
}

export async function requireCompletedOnboarding(next = "/dashboard") {
  const profile = await requireUserProfile(next);

  if (!isProfileComplete(profile)) {
    redirect("/onboarding");
  }

  return profile;
}

export async function ensureUserProfile(user: User) {
  const supabase = await createSupabaseServerClient();
  const metadata = user.user_metadata as Record<string, unknown>;
  const displayName =
    readString(metadata.full_name) ?? readString(metadata.name) ?? user.email ?? null;
  const avatarUrl = readString(metadata.avatar_url) ?? readString(metadata.picture);

  const { data, error } = await supabase
    .from("users")
    .upsert(
      {
        id: user.id,
        email: user.email ?? "",
        display_name: displayName,
        avatar_url: avatarUrl,
      },
      { onConflict: "id" },
    )
    .select("*")
    .single();

  if (error) {
    throw new Error(error.message);
  }

  return data as UserProfile;
}

export function isProfileComplete(
  profile: Pick<UserProfile, "native_language" | "onboarding_completed_at">,
) {
  return Boolean(profile.native_language && profile.onboarding_completed_at);
}

function readString(value: unknown) {
  return typeof value === "string" && value.trim() ? value : null;
}
