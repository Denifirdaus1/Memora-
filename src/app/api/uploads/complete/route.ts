import * as Sentry from "@sentry/nextjs";
import { NextResponse } from "next/server";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import { completeDirectUploads } from "@/server/uploads/direct-upload-pipeline";

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

    const result = await completeDirectUploads({
      input: (await request.json()) as Parameters<
        typeof completeDirectUploads
      >[0]["input"],
      supabase,
      user,
    });

    if ("status" in result) {
      Sentry.captureMessage("Upload completion failed", {
        level: "warning",
        extra: { status: result.status, message: result.message },
      });
      return NextResponse.json({ error: result.message }, { status: result.status });
    }

    return NextResponse.json(result);
  } catch (error) {
    Sentry.captureException(error);
    return NextResponse.json({ error: "Upload completion failed." }, { status: 500 });
  }
}
