import * as Sentry from "@sentry/nextjs";
import { NextResponse } from "next/server";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import { runUploadPipeline } from "@/server/uploads/upload-pipeline";
import type { UserProfile } from "@/types/database";

export const maxDuration = 300;

export async function POST(request: Request) {
  try {
    const supabase = await createSupabaseServerClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Authentication required." }, { status: 401 });
    }

    const { data: profile, error: profileError } = await supabase
      .from("users")
      .select("*")
      .eq("id", user.id)
      .maybeSingle();

    if (profileError) {
      return NextResponse.json({ error: profileError.message }, { status: 500 });
    }

    if (!profile) {
      return NextResponse.json({ error: "User profile not found." }, { status: 404 });
    }

    const result = await runUploadPipeline({
      formData: await request.formData(),
      supabase,
      user,
      profile: profile as UserProfile,
    });

    if ("status" in result) {
      Sentry.captureMessage("Legacy upload pipeline failed", {
        level: "warning",
        extra: { status: result.status, message: result.message },
      });
      return NextResponse.json({ error: result.message }, { status: result.status });
    }

    return NextResponse.json(result);
  } catch (error) {
    Sentry.captureException(error);
    return NextResponse.json({ error: "Upload failed." }, { status: 500 });
  }
}
