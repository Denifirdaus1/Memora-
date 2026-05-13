import type { SupabaseClient } from "@supabase/supabase-js";

import {
  DEFAULT_REVIEW_QUESTION_COUNT,
  generateReviewQuestions,
} from "@/features/review/review-generation";
import {
  calculateReviewStats,
  gradeReviewAnswer,
} from "@/features/review/review-scoring";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { isUuid } from "@/lib/utils";
import type {
  KnowledgeItem,
  ReviewSession,
  SessionQuestion,
  StudyThread,
} from "@/types/database";

interface ReviewEngineSupabase extends SupabaseClient {
  from: SupabaseClient["from"];
}

export class ReviewEngineError extends Error {
  constructor(
    message: string,
    public readonly status = 500,
  ) {
    super(message);
  }
}

export async function startReviewSession({
  threadId,
  userId,
}: {
  threadId: string;
  userId: string;
}) {
  if (!isUuid(threadId)) {
    throw new ReviewEngineError("threadId must be a valid study thread id.", 400);
  }

  const supabase = (await createSupabaseServerClient()) as ReviewEngineSupabase;
  const thread = await getOwnedThread(supabase, threadId, userId);
  const knowledgeItems = await getKnowledgeItems(supabase, threadId, userId);

  if (!knowledgeItems.length) {
    throw new ReviewEngineError(
      "Upload and extraction must finish before starting review.",
      409,
    );
  }

  const generatedQuestions = generateReviewQuestions({
    knowledgeItems,
    questionCount: DEFAULT_REVIEW_QUESTION_COUNT,
    settings: thread.settings,
  });

  const { data: session, error: sessionError } = await supabase
    .from("review_sessions")
    .insert({
      thread_id: thread.id,
      user_id: userId,
      question_count: generatedQuestions.length,
      settings: {
        source: "knowledge_items",
        generator: "deterministic.v1",
      },
    })
    .select("*")
    .single();

  if (sessionError) {
    throw new ReviewEngineError(sessionError.message);
  }

  const questionRows = generatedQuestions.map((question, index) => ({
    session_id: session.id,
    thread_id: thread.id,
    user_id: userId,
    knowledge_item_id: question.knowledge_item_id,
    question_order: index + 1,
    question_type: question.question_type,
    prompt: question.prompt,
    options: question.options,
    correct_answer: question.correct_answer,
    acceptable_answers: question.acceptable_answers,
    explanation: question.explanation,
  }));

  const { error: questionsError } = await supabase
    .from("session_questions")
    .insert(questionRows);

  if (questionsError) {
    await supabase
      .from("review_sessions")
      .delete()
      .eq("id", session.id)
      .eq("user_id", userId);
    throw new ReviewEngineError(questionsError.message);
  }

  await supabase
    .from("study_threads")
    .update({ status: "needs_review", last_activity_at: new Date().toISOString() })
    .eq("id", thread.id)
    .eq("user_id", userId);

  return {
    session: session as ReviewSession,
    questionCount: generatedQuestions.length,
  };
}

export async function answerReviewQuestion({
  sessionId,
  questionId,
  userId,
  userAnswer,
}: {
  sessionId: string;
  questionId: string;
  userId: string;
  userAnswer: string;
}) {
  if (!isUuid(sessionId) || !isUuid(questionId)) {
    throw new ReviewEngineError("Invalid review session or question id.", 400);
  }

  const answer = userAnswer.trim();

  if (!answer) {
    throw new ReviewEngineError("Answer cannot be empty.", 400);
  }

  const supabase = (await createSupabaseServerClient()) as ReviewEngineSupabase;
  const { data: question, error: questionError } = await supabase
    .from("session_questions")
    .select("*")
    .eq("id", questionId)
    .eq("session_id", sessionId)
    .eq("user_id", userId)
    .maybeSingle();

  if (questionError) {
    throw new ReviewEngineError(questionError.message);
  }

  if (!question) {
    throw new ReviewEngineError("Review question not found.", 404);
  }

  const normalizedQuestion = normalizeSessionQuestion(question as SessionQuestion);
  const grade = gradeReviewAnswer({
    questionType: normalizedQuestion.question_type,
    correctAnswer: normalizedQuestion.correct_answer,
    acceptableAnswers: normalizedQuestion.acceptable_answers,
    userAnswer: answer,
  });

  const { error: answerError } = await supabase
    .from("session_questions")
    .update({
      user_answer: answer,
      is_correct: grade.isCorrect,
      feedback: grade.feedback,
      answered_at: new Date().toISOString(),
    })
    .eq("id", questionId)
    .eq("session_id", sessionId)
    .eq("user_id", userId);

  if (answerError) {
    throw new ReviewEngineError(answerError.message);
  }

  const questions = await getSessionQuestions(supabase, sessionId, userId);
  const stats = calculateReviewStats(questions);
  const completedAt = stats.isComplete ? new Date().toISOString() : null;

  const { error: sessionError } = await supabase
    .from("review_sessions")
    .update({
      status: stats.isComplete ? "completed" : "active",
      correct_count: stats.correctCount,
      score: stats.score,
      completed_at: completedAt,
    })
    .eq("id", sessionId)
    .eq("user_id", userId);

  if (sessionError) {
    throw new ReviewEngineError(sessionError.message);
  }

  return {
    isComplete: stats.isComplete,
    isCorrect: grade.isCorrect,
  };
}

export async function advanceReviewSession({
  sessionId,
  userId,
}: {
  sessionId: string;
  userId: string;
}) {
  if (!isUuid(sessionId)) {
    throw new ReviewEngineError("Invalid review session id.", 400);
  }

  const supabase = (await createSupabaseServerClient()) as ReviewEngineSupabase;
  const { data: session, error: sessionError } = await supabase
    .from("review_sessions")
    .select("*")
    .eq("id", sessionId)
    .eq("user_id", userId)
    .maybeSingle();

  if (sessionError) {
    throw new ReviewEngineError(sessionError.message);
  }

  if (!session) {
    throw new ReviewEngineError("Review session not found.", 404);
  }

  const questions = await getSessionQuestions(supabase, sessionId, userId);
  const currentIndex = Math.min(session.current_index as number, questions.length - 1);
  const currentQuestion = questions[currentIndex];

  if (!currentQuestion?.answered_at) {
    return { nextPath: `/review/${sessionId}` };
  }

  const stats = calculateReviewStats(questions);

  if (stats.isComplete) {
    return { nextPath: `/review/${sessionId}/summary` };
  }

  const nextIndex = Math.min(currentIndex + 1, questions.length - 1);
  const { error: updateError } = await supabase
    .from("review_sessions")
    .update({ current_index: nextIndex })
    .eq("id", sessionId)
    .eq("user_id", userId);

  if (updateError) {
    throw new ReviewEngineError(updateError.message);
  }

  return { nextPath: `/review/${sessionId}` };
}

async function getOwnedThread(
  supabase: ReviewEngineSupabase,
  threadId: string,
  userId: string,
) {
  const { data, error } = await supabase
    .from("study_threads")
    .select("*")
    .eq("id", threadId)
    .eq("user_id", userId)
    .maybeSingle();

  if (error) {
    throw new ReviewEngineError(error.message);
  }

  if (!data) {
    throw new ReviewEngineError("Study thread not found.", 404);
  }

  return data as StudyThread;
}

async function getKnowledgeItems(
  supabase: ReviewEngineSupabase,
  threadId: string,
  userId: string,
) {
  const { data, error } = await supabase
    .from("knowledge_items")
    .select("*")
    .eq("thread_id", threadId)
    .eq("user_id", userId)
    .order("created_at", { ascending: true });

  if (error) {
    throw new ReviewEngineError(error.message);
  }

  return (data ?? []) as KnowledgeItem[];
}

async function getSessionQuestions(
  supabase: ReviewEngineSupabase,
  sessionId: string,
  userId: string,
) {
  const { data, error } = await supabase
    .from("session_questions")
    .select("*")
    .eq("session_id", sessionId)
    .eq("user_id", userId)
    .order("question_order", { ascending: true });

  if (error) {
    throw new ReviewEngineError(error.message);
  }

  return (data ?? []).map((question) =>
    normalizeSessionQuestion(question as SessionQuestion),
  );
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
