import { NextResponse } from "next/server";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import { ReviewEngineError, startReviewSession } from "@/server/review/review-engine";

export const maxDuration = 300;

export async function POST(request: Request) {
  const body = (await request.json()) as { threadId?: unknown };

  if (typeof body.threadId !== "string") {
    return NextResponse.json(
      { error: "threadId must be a valid study thread id." },
      { status: 400 },
    );
  }

  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Authentication required." }, { status: 401 });
  }

  try {
    const { session, questionCount } = await startReviewSession({
      threadId: body.threadId,
      userId: user.id,
    });

    return NextResponse.json({
      sessionId: session.id,
      questionCount,
      redirectTo: `/review/${session.id}`,
    });
  } catch (error) {
    if (error instanceof ReviewEngineError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }

    throw error;
  }
}
