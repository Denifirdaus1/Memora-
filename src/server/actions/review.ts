"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import {
  advanceReviewSession,
  answerReviewQuestion,
  startReviewSession,
} from "@/server/review/review-engine";
import { requireCompletedOnboarding } from "@/server/queries/auth";

export async function startReviewSessionAction(formData: FormData) {
  const profile = await requireCompletedOnboarding();
  const threadId = readFormString(formData, "threadId");

  if (!threadId) {
    return;
  }

  const { session } = await startReviewSession({
    threadId,
    userId: profile.id,
  });

  redirect(`/review/${session.id}`);
}

export async function answerReviewQuestionAction(formData: FormData) {
  const profile = await requireCompletedOnboarding();
  const sessionId = readFormString(formData, "sessionId");
  const questionId = readFormString(formData, "questionId");
  const answer = readFormString(formData, "answer");

  if (!sessionId || !questionId || !answer) {
    return;
  }

  await answerReviewQuestion({
    sessionId,
    questionId,
    userId: profile.id,
    userAnswer: answer,
  });

  revalidatePath(`/review/${sessionId}`);
  redirect(`/review/${sessionId}`);
}

export async function advanceReviewSessionAction(formData: FormData) {
  const profile = await requireCompletedOnboarding();
  const sessionId = readFormString(formData, "sessionId");

  if (!sessionId) {
    return;
  }

  const { nextPath } = await advanceReviewSession({
    sessionId,
    userId: profile.id,
  });

  revalidatePath(`/review/${sessionId}`);
  redirect(nextPath);
}

function readFormString(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" && value.trim() ? value.trim() : null;
}
