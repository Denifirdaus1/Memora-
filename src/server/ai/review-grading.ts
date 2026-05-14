import { openai } from "@ai-sdk/openai";
import { generateObject } from "ai";
import { z } from "zod";

import { aiModels } from "@/lib/ai/models";
import { requireEnv } from "@/lib/env";
import type { SessionQuestion } from "@/types/database";

const reviewGradeSchema = z.object({
  is_correct: z.boolean(),
  feedback: z.string().min(1).max(1200),
});

export async function gradeReviewAnswerWithAi({
  question,
  userAnswer,
}: {
  question: SessionQuestion;
  userAnswer: string;
}) {
  requireEnv("OPENAI_API_KEY");

  const { object } = await generateObject({
    model: openai.responses(aiModels.review),
    schema: reviewGradeSchema,
    schemaName: "review_answer_grade",
    system: [
      "You grade a study review answer.",
      "Be fair: accept semantically equivalent answers, minor typos, and different wording.",
      "For language learning, correct grammar/vocabulary mistakes clearly.",
      "Return concise feedback that helps the user understand the material more deeply.",
    ].join(" "),
    prompt: JSON.stringify({
      question_type: question.question_type,
      prompt: question.prompt,
      options: question.options,
      correct_answer: question.correct_answer,
      acceptable_answers: question.acceptable_answers,
      explanation: question.explanation,
      user_answer: userAnswer,
    }),
  });

  return {
    isCorrect: object.is_correct,
    feedback: object.feedback,
  };
}
