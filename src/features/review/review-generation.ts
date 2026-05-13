import { generatedReviewQuestionsSchema } from "@/features/review/question-schema";
import type { KnowledgeItem, ReviewQuestionType, ThreadSettings } from "@/types/database";

export const DEFAULT_REVIEW_QUESTION_COUNT = 10;

export interface GeneratedReviewQuestion {
  knowledge_item_id: string | null;
  question_type: ReviewQuestionType;
  prompt: string;
  options: string[];
  correct_answer: string;
  acceptable_answers: string[];
  explanation: string;
}

interface ReviewSource {
  knowledgeItemId: string | null;
  itemType: KnowledgeItem["item_type"];
  term: string;
  meaning: string;
  topic: string;
  targetLanguage: string;
}

export function generateReviewQuestions({
  knowledgeItems,
  questionCount = DEFAULT_REVIEW_QUESTION_COUNT,
  settings,
}: {
  knowledgeItems: KnowledgeItem[];
  questionCount?: number;
  settings?: ThreadSettings;
}) {
  const sources = knowledgeItemsToSources(knowledgeItems);

  if (!sources.length) {
    return [];
  }

  const enabledTypes = resolveEnabledQuestionTypes(settings);
  const questions: GeneratedReviewQuestion[] = [];
  const seenPrompts = new Set<string>();
  let cursor = 0;

  while (questions.length < questionCount && cursor < questionCount * 8) {
    const type = enabledTypes[cursor % enabledTypes.length];
    const source = sources[cursor % sources.length];
    const question = buildQuestion(type, source, sources, cursor);
    const normalizedPrompt = normalize(question.prompt);

    if (!seenPrompts.has(normalizedPrompt)) {
      questions.push(question);
      seenPrompts.add(normalizedPrompt);
    }

    cursor += 1;
  }

  while (questions.length < questionCount) {
    const source = sources[questions.length % sources.length];
    const question = buildFallbackQuestion(source, questions.length);
    const normalizedPrompt = normalize(question.prompt);

    if (!seenPrompts.has(normalizedPrompt)) {
      questions.push(question);
      seenPrompts.add(normalizedPrompt);
    }
  }

  return generatedReviewQuestionsSchema.parse(questions);
}

function buildQuestion(
  questionType: ReviewQuestionType,
  source: ReviewSource,
  sources: ReviewSource[],
  seed: number,
): GeneratedReviewQuestion {
  switch (questionType) {
    case "multiple_choice":
      return {
        knowledge_item_id: source.knowledgeItemId,
        question_type: questionType,
        prompt: `Pilih penjelasan yang paling sesuai untuk "${source.term}".`,
        options: buildOptions(
          source.meaning,
          sources.map((item) => item.meaning),
          seed,
        ),
        correct_answer: source.meaning,
        acceptable_answers: [source.meaning],
        explanation: `"${source.term}" dikaitkan dengan konteks: ${source.meaning}`,
      };
    case "fill_in_blank":
      return {
        knowledge_item_id: source.knowledgeItemId,
        question_type: questionType,
        prompt: `Lengkapi bagian kosong: Materi ini membahas "__" dalam konteks ${source.topic}.`,
        options: buildOptions(
          source.term,
          sources.map((item) => item.term),
          seed,
        ),
        correct_answer: source.term,
        acceptable_answers: [source.term],
        explanation: `Istilah yang cocok dengan konteks tersebut adalah "${source.term}".`,
      };
    case "translation_l1_to_tl":
      return {
        knowledge_item_id: source.knowledgeItemId,
        question_type: questionType,
        prompt: `Ubah penjelasan ini menjadi istilah target: "${source.meaning}"`,
        options: [],
        correct_answer: source.term,
        acceptable_answers: [source.term],
        explanation: `Istilah target untuk penjelasan tersebut adalah "${source.term}".`,
      };
    case "translation_tl_to_l1":
      return {
        knowledge_item_id: source.knowledgeItemId,
        question_type: questionType,
        prompt: `Jelaskan arti "${source.term}" dalam bahasa belajarmu.`,
        options: [],
        correct_answer: source.meaning,
        acceptable_answers: [source.meaning, source.topic],
        explanation: `"${source.term}" berarti: ${source.meaning}`,
      };
    case "sentence_construction":
      return {
        knowledge_item_id: source.knowledgeItemId,
        question_type: questionType,
        prompt: `Buat satu kalimat pendek yang memakai "${source.term}" sesuai konteks materi.`,
        options: [],
        correct_answer: source.term,
        acceptable_answers: [source.term],
        explanation: `Jawaban dianggap benar jika memakai "${source.term}" dengan konteks yang masuk akal.`,
      };
  }
}

function buildFallbackQuestion(
  source: ReviewSource,
  index: number,
): GeneratedReviewQuestion {
  return {
    knowledge_item_id: source.knowledgeItemId,
    question_type: "multiple_choice",
    prompt: `Review cepat ${index + 1}: topik mana yang paling terkait dengan "${source.term}"?`,
    options: buildOptions(
      source.topic,
      [source.topic, source.meaning, source.term],
      index,
    ),
    correct_answer: source.topic,
    acceptable_answers: [source.topic],
    explanation: `Item ini berasal dari topik "${source.topic}".`,
  };
}

function knowledgeItemsToSources(items: KnowledgeItem[]): ReviewSource[] {
  return items
    .map((item) => {
      const content = item.content ?? {};
      const term =
        readText(content, ["term", "title", "pattern", "exercise_type", "name"]) ??
        labelForItemType(item.item_type);
      const topic =
        readText(content, ["topic", "title", "source_file_name", "unit"]) ?? term;
      const meaning =
        readText(content, ["meaning", "definition", "description", "note", "summary"]) ??
        `Konsep terkait ${term}`;

      return {
        knowledgeItemId: item.id,
        itemType: item.item_type,
        term: compactText(term),
        meaning: compactText(meaning),
        topic: compactText(topic),
        targetLanguage: item.target_language || "unknown",
      };
    })
    .filter((source) => source.term && source.meaning && source.topic);
}

function resolveEnabledQuestionTypes(settings?: ThreadSettings): ReviewQuestionType[] {
  const defaults: ReviewQuestionType[] = [
    "multiple_choice",
    "fill_in_blank",
    "translation_l1_to_tl",
    "translation_tl_to_l1",
    "sentence_construction",
  ];

  if (!settings?.question_types) {
    return defaults;
  }

  const enabled = defaults.filter((type) => settings.question_types[type]);
  return enabled.length ? enabled : defaults;
}

function buildOptions(correctAnswer: string, candidates: string[], seed: number) {
  const unique = uniqueCompact([correctAnswer, ...candidates]).filter(
    (candidate) => normalize(candidate) !== normalize(correctAnswer),
  );
  const fallback = ["Konsep lain", "Belum disebutkan", "Contoh terpisah"];
  const distractors = uniqueCompact([...unique, ...fallback]).slice(0, 3);
  const options = uniqueCompact([correctAnswer, ...distractors]).slice(0, 4);
  const rotation = options.length ? seed % options.length : 0;
  return [...options.slice(rotation), ...options.slice(0, rotation)];
}

function readText(content: Record<string, unknown>, keys: string[]) {
  for (const key of keys) {
    const value = content[key];

    if (typeof value === "string" && value.trim()) {
      return value.trim();
    }
  }

  return null;
}

function labelForItemType(itemType: KnowledgeItem["item_type"]) {
  return itemType.replace(/_/g, " ");
}

function uniqueCompact(values: string[]) {
  const seen = new Set<string>();
  const result: string[] = [];

  for (const value of values) {
    const compacted = compactText(value);
    const key = normalize(compacted);

    if (!key || seen.has(key)) {
      continue;
    }

    seen.add(key);
    result.push(compacted);
  }

  return result;
}

function compactText(value: string) {
  return value.replace(/\s+/g, " ").trim();
}

function normalize(value: string) {
  return value.toLowerCase().replace(/\s+/g, " ").trim();
}
