import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

import { getSupabasePublishableKey, requireEnv } from "@/lib/env";
import { isProfileComplete } from "@/server/queries/auth";
import type { UserProfile } from "@/types/database";

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get("code");
  const next = requestUrl.searchParams.get("next") ?? "/dashboard";
  const cookiesToSet: Array<{
    name: string;
    value: string;
    options: Parameters<NextResponse["cookies"]["set"]>[2];
  }> = [];

  if (!code) {
    return NextResponse.redirect(new URL("/?auth_error=missing_code", request.url));
  }

  const supabase = createServerClient(
    requireEnv("NEXT_PUBLIC_SUPABASE_URL"),
    getSupabasePublishableKey(),
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(nextCookies) {
          nextCookies.forEach(({ name, value, options }) => {
            cookiesToSet.push({ name, value, options });
          });
        },
      },
    },
  );

  const { error } = await supabase.auth.exchangeCodeForSession(code);

  if (error) {
    return withAuthCookies(
      NextResponse.redirect(new URL("/?auth_error=callback_failed", request.url)),
      cookiesToSet,
    );
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return withAuthCookies(
      NextResponse.redirect(new URL("/", request.url)),
      cookiesToSet,
    );
  }

  const metadata = user.user_metadata as Record<string, unknown>;
  const { data: profile, error: profileError } = await supabase
    .from("users")
    .upsert(
      {
        id: user.id,
        email: user.email ?? "",
        display_name:
          readString(metadata.full_name) ??
          readString(metadata.name) ??
          user.email ??
          null,
        avatar_url: readString(metadata.avatar_url) ?? readString(metadata.picture),
      },
      { onConflict: "id" },
    )
    .select("*")
    .single();

  if (profileError) {
    return withAuthCookies(
      NextResponse.redirect(new URL("/?auth_error=profile_failed", request.url)),
      cookiesToSet,
    );
  }

  const target = isProfileComplete(profile as UserProfile) ? next : "/onboarding";

  return withAuthCookies(
    NextResponse.redirect(new URL(target, request.url)),
    cookiesToSet,
  );
}

function withAuthCookies(
  response: NextResponse,
  cookiesToSet: Array<{
    name: string;
    value: string;
    options: Parameters<NextResponse["cookies"]["set"]>[2];
  }>,
) {
  cookiesToSet.forEach(({ name, value, options }) => {
    response.cookies.set(name, value, options);
  });

  return response;
}

function readString(value: unknown) {
  return typeof value === "string" && value.trim() ? value : null;
}
