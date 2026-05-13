import { describe, expect, it } from "vitest";

import { generateReviewQuestions } from "@/features/review/review-generation";
import { generatedReviewQuestionsSchema } from "@/features/review/question-schema";
import type { KnowledgeItem } from "@/types/database";

describe("review generation", () => {
  it("generates ten varied questions without repeated prompts", () => {
    const questions = generateReviewQuestions({
      knowledgeItems: knowledgeItemsFixture,
      questionCount: 10,
    });

    const prompts = questions.map((question) => question.prompt);
    const types = new Set(questions.map((question) => question.question_type));

    expect(questions).toHaveLength(10);
    expect(new Set(prompts).size).toBe(10);
    expect(types.size).toBeGreaterThanOrEqual(5);
    expect(generatedReviewQuestionsSchema.safeParse(questions).success).toBe(true);
  });
});

const knowledgeItemsFixture: KnowledgeItem[] = [
  {
    id: "11111111-1111-4111-8111-111111111111",
    thread_id: "22222222-2222-4222-8222-222222222222",
    upload_id: null,
    user_id: "33333333-3333-4333-8333-333333333333",
    item_type: "vocabulary",
    target_language: "de",
    content: {
      term: "Arbeit",
      meaning: "work or job",
      topic: "Berufe",
    },
    source_page_hint: null,
    times_seen: 0,
    times_correct: 0,
    created_at: "2026-05-13T00:00:00.000Z",
  },
  {
    id: "44444444-4444-4444-8444-444444444444",
    thread_id: "22222222-2222-4222-8222-222222222222",
    upload_id: null,
    user_id: "33333333-3333-4333-8333-333333333333",
    item_type: "grammar_pattern",
    target_language: "de",
    content: {
      pattern: "Ich suche",
      meaning: "I am looking for",
      topic: "Job search sentence",
    },
    source_page_hint: null,
    times_seen: 0,
    times_correct: 0,
    created_at: "2026-05-13T00:00:00.000Z",
  },
  {
    id: "55555555-5555-4555-8555-555555555555",
    thread_id: "22222222-2222-4222-8222-222222222222",
    upload_id: null,
    user_id: "33333333-3333-4333-8333-333333333333",
    item_type: "topic_context",
    target_language: "de",
    content: {
      title: "Berufe",
      summary: "German vocabulary about jobs and professions",
    },
    source_page_hint: null,
    times_seen: 0,
    times_correct: 0,
    created_at: "2026-05-13T00:00:00.000Z",
  },
];
