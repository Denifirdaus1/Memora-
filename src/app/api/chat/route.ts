import { openai } from "@ai-sdk/openai";
import { convertToModelMessages, streamText, type UIMessage } from "ai";
import { NextResponse } from "next/server";

import { aiModels } from "@/lib/ai/models";
import { env, isSupabaseConfigured } from "@/lib/env";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const maxDuration = 30;

export async function POST(request: Request) {
  const body = (await request.json()) as {
    messages?: UIMessage[];
    threadId?: string;
  };

  const session = await getChatSession(body.threadId);

  if ("errorResponse" in session) {
    return session.errorResponse;
  }

  const latestUserText = extractLatestUserText(body.messages ?? []);

  if (latestUserText) {
    const errorResponse = await persistMessage(
      session.threadId,
      session.userId,
      "user",
      latestUserText,
    );

    if (errorResponse) {
      return errorResponse;
    }
  }

  if (!env.OPENAI_API_KEY) {
    const text =
      "Live AI is disabled until OPENAI_API_KEY is configured. Your message was saved to this study thread.";
    const errorResponse = await persistMessage(
      session.threadId,
      session.userId,
      "assistant",
      text,
      "memora_stub",
    );

    if (errorResponse) {
      return errorResponse;
    }

    return NextResponse.json(
      {
        error: "OPENAI_API_KEY is not configured.",
        message: text,
      },
      { status: 503 },
    );
  }

  const result = streamText({
    model: openai(aiModels.chat),
    system:
      "You are Memora, an AI study assistant. Keep answers concise and grounded in the active study thread.",
    messages: await convertToModelMessages(body.messages ?? []),
    onFinish: async ({ text }) => {
      if (text.trim()) {
        await persistMessage(
          session.threadId,
          session.userId,
          "assistant",
          text.trim(),
          aiModels.chat,
        );
      }
    },
  });

  return result.toUIMessageStreamResponse();
}

async function getChatSession(threadId?: string) {
  if (!isSupabaseConfigured()) {
    return {
      errorResponse: NextResponse.json(
        { error: "Supabase is not configured." },
        { status: 503 },
      ),
    };
  }

  if (!threadId || !isUuid(threadId)) {
    return {
      errorResponse: NextResponse.json(
        { error: "threadId must be a valid study thread id." },
        { status: 400 },
      ),
    };
  }

  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return {
      errorResponse: NextResponse.json(
        { error: "Authentication required." },
        { status: 401 },
      ),
    };
  }

  const { data: thread, error } = await supabase
    .from("study_threads")
    .select("id")
    .eq("id", threadId)
    .eq("user_id", user.id)
    .maybeSingle();

  if (error) {
    return {
      errorResponse: NextResponse.json({ error: error.message }, { status: 500 }),
    };
  }

  if (!thread) {
    return {
      errorResponse: NextResponse.json(
        { error: "Study thread not found." },
        { status: 404 },
      ),
    };
  }

  return { threadId: thread.id as string, userId: user.id };
}

async function persistMessage(
  threadId: string,
  userId: string,
  role: "user" | "assistant",
  text: string,
  provider?: string,
) {
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.from("thread_messages").insert({
    thread_id: threadId,
    user_id: userId,
    role,
    content: { text },
    provider,
  });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return null;
}

function extractLatestUserText(messages: UIMessage[]) {
  const latest = [...messages].reverse().find((message) => message.role === "user");

  if (!latest) {
    return null;
  }

  const content = (latest as { content?: unknown }).content;
  if (typeof content === "string" && content.trim()) {
    return content.trim();
  }

  const parts = (latest as { parts?: Array<{ text?: unknown; type?: unknown }> }).parts;
  if (!Array.isArray(parts)) {
    return null;
  }

  const text = parts
    .map((part) =>
      part.type === "text" && typeof part.text === "string" ? part.text : "",
    )
    .join("\n")
    .trim();

  return text || null;
}

function isUuid(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    value,
  );
}
