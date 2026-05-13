import { z } from "zod";

export const reviewQuestionTypeSchema = z.enum([
  "multiple_choice",
  "fill_in_blank",
  "translation_l1_to_tl",
  "translation_tl_to_l1",
  "sentence_construction",
]);

export const generatedReviewQuestionSchema = z.object({
  knowledge_item_id: z.string().uuid().nullable(),
  question_type: reviewQuestionTypeSchema,
  prompt: z.string().min(1).max(2000),
  options: z.array(z.string().min(1)).max(6),
  correct_answer: z.string().min(1),
  acceptable_answers: z.array(z.string().min(1)),
  explanation: z.string().min(1),
});

export const generatedReviewQuestionsSchema = z
  .array(generatedReviewQuestionSchema)
  .min(1)
  .superRefine((questions, context) => {
    const prompts = new Set<string>();

    questions.forEach((question, index) => {
      const normalized = question.prompt.trim().toLowerCase();

      if (prompts.has(normalized)) {
        context.addIssue({
          code: "custom",
          message: "Question prompts must not repeat in one review session.",
          path: [index, "prompt"],
        });
      }

      prompts.add(normalized);
    });
  });
