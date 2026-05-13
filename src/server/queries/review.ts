import { calculateReviewStats } from "@/features/review/review-scoring";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { isUuid } from "@/lib/utils";
import { requireCompletedOnboarding } from "@/server/queries/auth";
import type { ReviewSession, SessionQuestion, StudyThread } from "@/types/database";

export async function getReviewSessionDetail(sessionId: string) {
  if (!isUuid(sessionId)) {
    return null;
  }

  const profile = await requireCompletedOnboarding(`/review/${sessionId}`);
  const supabase = await createSupabaseServerClient();
  const { data: session, error: sessionError } = await supabase
    .from("review_sessions")
    .select("*")
    .eq("id", sessionId)
    .eq("user_id", profile.id)
    .maybeSingle();

  if (sessionError) {
    throw new Error(sessionError.message);
  }

  if (!session) {
    return null;
  }

  const [threadResult, questionsResult] = await Promise.all([
    supabase
      .from("study_threads")
      .select("*")
      .eq("id", session.thread_id)
      .eq("user_id", profile.id)
      .maybeSingle(),
    supabase
      .from("session_questions")
      .select("*")
      .eq("session_id", session.id)
      .eq("user_id", profile.id)
      .order("question_order", { ascending: true }),
  ]);

  if (threadResult.error) {
    throw new Error(threadResult.error.message);
  }

  if (questionsResult.error) {
    throw new Error(questionsResult.error.message);
  }

  const questions = (questionsResult.data ?? []).map((question) =>
    normalizeSessionQuestion(question as SessionQuestion),
  );
  const normalizedSession = session as ReviewSession;
  const currentIndex = Math.min(
    normalizedSession.current_index,
    Math.max(questions.length - 1, 0),
  );

  return {
    session: normalizedSession,
    thread: threadResult.data as StudyThread | null,
    questions,
    currentQuestion: questions[currentIndex] ?? null,
    stats: calculateReviewStats(questions),
  };
}

export async function getReviewSessionSummary(sessionId: string) {
  const detail = await getReviewSessionDetail(sessionId);

  if (!detail) {
    return null;
  }

  return {
    ...detail,
    missedQuestions: detail.questions.filter((question) => question.is_correct === false),
  };
}

function normalizeSessionQuestion(question: SessionQuestion) {
  return {
    ...question,
    options: Array.isArray(question.options) ? question.options : [],
    acceptable_answers: Array.isArray(question.acceptable_answers)
      ? question.acceptable_answers
      : [],
  };
}
