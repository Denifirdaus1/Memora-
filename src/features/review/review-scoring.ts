import type { ReviewQuestionType, SessionQuestion } from "@/types/database";

export interface GradeReviewAnswerInput {
  questionType: ReviewQuestionType;
  correctAnswer: string;
  acceptableAnswers: string[];
  userAnswer: string;
}

export function gradeReviewAnswer({
  questionType,
  correctAnswer,
  acceptableAnswers,
  userAnswer,
}: GradeReviewAnswerInput) {
  const normalizedAnswer = normalizeAnswer(userAnswer);
  const accepted = uniqueAnswers([correctAnswer, ...acceptableAnswers]);
  const isCorrect =
    questionType === "sentence_construction"
      ? accepted.some((answer) => normalizedAnswer.includes(answer))
      : accepted.some((answer) => answersMatch(normalizedAnswer, answer));

  return {
    isCorrect,
    feedback: isCorrect ? "Benar." : "Belum tepat.",
  };
}

export function calculateReviewStats(questions: SessionQuestion[]) {
  const answered = questions.filter((question) => question.answered_at);
  const correct = answered.filter((question) => question.is_correct).length;
  const missed = answered.filter((question) => question.is_correct === false);
  const accuracy = answered.length ? Math.round((correct / answered.length) * 100) : 0;

  return {
    answeredCount: answered.length,
    correctCount: correct,
    missedCount: missed.length,
    accuracy,
    score: correct * 10,
    missed,
    isComplete: answered.length === questions.length && questions.length > 0,
  };
}

function answersMatch(answer: string, accepted: string) {
  if (!answer || !accepted) {
    return false;
  }

  if (answer === accepted) {
    return true;
  }

  return accepted.length > 18 && (answer.includes(accepted) || accepted.includes(answer));
}

function uniqueAnswers(values: string[]) {
  return [...new Set(values.map(normalizeAnswer).filter(Boolean))];
}

function normalizeAnswer(value: string) {
  return value
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^\p{L}\p{N}\s]/gu, "")
    .replace(/\s+/g, " ")
    .trim();
}
