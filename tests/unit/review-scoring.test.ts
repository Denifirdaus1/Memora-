import { describe, expect, it } from "vitest";

import {
  calculateReviewStats,
  gradeReviewAnswer,
} from "@/features/review/review-scoring";
import type { SessionQuestion } from "@/types/database";

describe("review scoring", () => {
  it("grades sentence construction by requiring the target term", () => {
    const result = gradeReviewAnswer({
      questionType: "sentence_construction",
      correctAnswer: "Arbeit",
      acceptableAnswers: ["Arbeit"],
      userAnswer: "Ich suche Arbeit.",
    });

    expect(result.isCorrect).toBe(true);
  });

  it("calculates session accuracy and missed items", () => {
    const stats = calculateReviewStats([
      questionFixture({ id: "q1", is_correct: true }),
      questionFixture({ id: "q2", is_correct: false }),
    ]);

    expect(stats.correctCount).toBe(1);
    expect(stats.missedCount).toBe(1);
    expect(stats.accuracy).toBe(50);
    expect(stats.score).toBe(10);
    expect(stats.isComplete).toBe(true);
  });
});

function questionFixture(
  overrides: Pick<SessionQuestion, "id" | "is_correct">,
): SessionQuestion {
  return {
    id: overrides.id,
    session_id: "11111111-1111-4111-8111-111111111111",
    thread_id: "22222222-2222-4222-8222-222222222222",
    user_id: "33333333-3333-4333-8333-333333333333",
    knowledge_item_id: null,
    question_order: 1,
    question_type: "multiple_choice",
    prompt: "Prompt",
    options: ["A", "B"],
    correct_answer: "A",
    acceptable_answers: ["A"],
    user_answer: "A",
    is_correct: overrides.is_correct,
    feedback: null,
    explanation: "Explanation",
    answered_at: "2026-05-13T00:00:00.000Z",
    created_at: "2026-05-13T00:00:00.000Z",
  };
}
