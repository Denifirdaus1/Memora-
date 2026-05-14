import { openai } from "@ai-sdk/openai";
import { generateObject } from "ai";
import { z } from "zod";

import { aiModels } from "@/lib/ai/models";
import { requireEnv } from "@/lib/env";
import type {
  ExternalContext,
  KnowledgeItem,
  ReviewQuestionType,
  ThreadSettings,
} from "@/types/database";

export const AI_REVIEW_QUESTION_COUNT = 10;

const reviewQuestionTypeSchema = z.enum([
  "multiple_choice",
  "fill_in_blank",
  "translation_l1_to_tl",
  "translation_tl_to_l1",
  "sentence_construction",
  "cloze",
  "matching",
  "ordering",
  "short_answer",
  "explain_why",
  "error_correction",
]);

const generatedReviewQuestionSchema = z.object({
  source_knowledge_item_id: z.string().uuid().nullable(),
  question_type: reviewQuestionTypeSchema,
  prompt: z.string().min(1).max(2000),
  options: z.array(z.string().min(1).max(400)).max(6),
  correct_answer: z.string().min(1).max(1200),
  acceptable_answers: z.array(z.string().min(1).max(1200)).max(8),
  explanation: z.string().min(1).max(2000),
});

const generatedReviewQuestionsSchema = z.object({
  questions: z.array(generatedReviewQuestionSchema).length(AI_REVIEW_QUESTION_COUNT),
});

export type AiGeneratedReviewQuestion = z.infer<typeof generatedReviewQuestionSchema>;

export async function generateReviewQuestionsWithAi({
  knowledgeItems,
  externalContexts,
  settings,
  threadTitle,
}: {
  knowledgeItems: KnowledgeItem[];
  externalContexts: ExternalContext[];
  settings?: ThreadSettings;
  threadTitle: string;
}) {
  requireEnv("OPENAI_API_KEY");

  const enabledTypes = resolveEnabledQuestionTypes(settings);
  const knowledgePayload = knowledgeItems.slice(0, 80).map((item) => ({
    id: item.id,
    type: item.item_type,
    target_language: item.target_language,
    source_page_hint: item.source_page_hint,
    difficulty: item.difficulty ?? "medium",
    times_seen: item.times_seen,
    times_correct: item.times_correct,
    content: item.content,
  }));
  const contextPayload = externalContexts.slice(0, 10).map((context) => ({
    url: context.source_url,
    title: context.source_title,
    summary: context.summary,
    linked_topic: context.linked_topic,
  }));

  const { object } = await generateObject({
    model: openai.responses(aiModels.review),
    schema: generatedReviewQuestionsSchema,
    schemaName: "study_review_questions",
    system: [
      "You are Memora's production review-question engine.",
      "Generate retrieval-practice questions that test real understanding from the user's study thread.",
      "Use interleaving: mix knowledge items and question types.",
      "Use corrective feedback: each explanation must teach why the answer is correct.",
      "For language study, include vocabulary, grammar, translation, sentence construction, and error correction when relevant.",
      "Do not make flashcards. These are review questions, not flashcards.",
    ].join(" "),
    prompt: JSON.stringify({
      threadTitle,
      enabledQuestionTypes: enabledTypes,
      requiredQuestionCount: AI_REVIEW_QUESTION_COUNT,
      primaryKnowledge: knowledgePayload,
      boundedExternalContexts: contextPayload,
      constraints: [
        "Every question must be answerable from primaryKnowledge, optionally clarified by boundedExternalContexts.",
        "Use source_knowledge_item_id when one item is the main source.",
        "multiple_choice and matching should include options.",
        "short_answer and explain_why should have no options.",
        "Do not repeat prompts.",
      ],
    }),
  });

  return object.questions;
}

function resolveEnabledQuestionTypes(settings?: ThreadSettings): ReviewQuestionType[] {
  const defaults: ReviewQuestionType[] = [
    "multiple_choice",
    "fill_in_blank",
    "cloze",
    "matching",
    "ordering",
    "translation_l1_to_tl",
    "translation_tl_to_l1",
    "sentence_construction",
    "error_correction",
    "short_answer",
    "explain_why",
  ];

  if (!settings?.question_types) {
    return defaults;
  }

  return defaults.filter((type) => settings.question_types[type] !== false);
}
