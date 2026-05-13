import type { KnowledgeItemType } from "@/types/database";

export interface ExtractionStubInput {
  fileName: string;
  mimeType: string;
}

export interface ExtractionStubResult {
  summary: {
    vocabulary: number;
    grammar_patterns: number;
    exercise_types: number;
    detected_language: string | null;
    detected_topic: string | null;
  };
  items: Array<{
    item_type: KnowledgeItemType;
    target_language: string;
    content: Record<string, unknown>;
    source_page_hint: string | null;
  }>;
}

export function buildExtractionStub({
  fileName,
  mimeType,
}: ExtractionStubInput): ExtractionStubResult {
  const topic = deriveTopic(fileName);
  const targetLanguage = "unknown";

  return {
    summary: {
      vocabulary: 1,
      grammar_patterns: 1,
      exercise_types: 1,
      detected_language: null,
      detected_topic: topic,
    },
    items: [
      {
        item_type: "topic_context",
        target_language: targetLanguage,
        content: {
          schema_version: "stub.v1",
          title: topic,
          source_file_name: fileName,
          source_mime_type: mimeType,
          note: "Placeholder extraction created before real AI extraction is enabled.",
        },
        source_page_hint: null,
      },
      {
        item_type: "exercise_type",
        target_language: targetLanguage,
        content: {
          schema_version: "stub.v1",
          exercise_type: "mixed_review",
          supported_questions: [
            "multiple_choice",
            "fill_in_blank",
            "sentence_construction",
          ],
        },
        source_page_hint: null,
      },
      {
        item_type: "vocabulary",
        target_language: targetLanguage,
        content: {
          schema_version: "stub.v1",
          term: topic,
          meaning: "Auto-generated placeholder until extraction model is connected.",
        },
        source_page_hint: null,
      },
    ],
  };
}

function deriveTopic(fileName: string) {
  const baseName = fileName
    .replace(/\.[^.]+$/, "")
    .replace(/[-_]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  return baseName || "Uploaded material";
}
