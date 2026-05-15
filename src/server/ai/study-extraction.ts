import * as Sentry from "@sentry/nextjs";
import { openai } from "@ai-sdk/openai";
import {
  generateObject,
  generateText,
  stepCountIs,
  type FilePart,
  type ImagePart,
} from "ai";
import { z } from "zod";

import { aiModels } from "@/lib/ai/models";
import { requireEnv } from "@/lib/env";
import { extractJsonObject } from "@/server/ai/json";
import type { KnowledgeItemType } from "@/types/database";

export const STUDY_EXTRACTION_VERSION = "real-ai-extraction.v1";

const difficultySchema = z.enum(["easy", "medium", "hard"]);

const sourceChunkSchema = z.object({
  chunk_index: z.number().int().min(0),
  source_page_hint: z.string().min(1).max(120).nullable(),
  content_text: z.string().min(1).max(12000),
  visual_description: z.string().min(1).max(2000).nullable(),
  confidence: z.number().min(0).max(1),
});

const extractionKnowledgeItemSchema = z.object({
  item_type: z.enum([
    "vocabulary",
    "grammar_pattern",
    "exercise_type",
    "topic_context",
    "concept",
    "example",
    "misconception",
    "assessment_target",
  ]),
  target_language: z.string().min(2).max(80),
  source_page_hint: z.string().min(1).max(120).nullable(),
  difficulty: difficultySchema,
  confidence: z.number().min(0).max(1),
  content: z.object({
    title: z.string().min(1).max(180).nullable(),
    term: z.string().min(1).max(180).nullable(),
    meaning: z.string().min(1).max(800).nullable(),
    explanation: z.string().min(1).max(1600).nullable(),
    example: z.string().min(1).max(800).nullable(),
    correction: z.string().min(1).max(800).nullable(),
    why_it_matters: z.string().min(1).max(800).nullable(),
    assessment_focus: z.string().min(1).max(800).nullable(),
  }),
});

const extractionSchema = z.object({
  summary: z.object({
    detected_language: z.string().min(2).max(80).nullable(),
    detected_topic: z.string().min(1).max(180).nullable(),
    learning_goal: z.string().min(1).max(500),
    vocabulary: z.number().int().min(0),
    grammar_patterns: z.number().int().min(0),
    exercise_types: z.number().int().min(0),
  }),
  source_chunks: z.array(sourceChunkSchema).min(1).max(24),
  knowledge_items: z.array(extractionKnowledgeItemSchema).min(5).max(80),
  thread_memory: z.object({
    summary: z.string().min(1).max(2000),
    key_terms: z.array(z.string().min(1).max(120)).min(1).max(40),
  }),
  web_enrichment_queries: z.array(z.string().min(4).max(160)).max(3),
});

const externalContextSchema = z.object({
  contexts: z
    .array(
      z.object({
        source_url: z.string().url(),
        source_title: z.string().min(1).max(300),
        summary: z.string().min(1).max(2000),
        linked_topic: z.string().min(1).max(180).nullable(),
        confidence: z.number().min(0).max(1),
      }),
    )
    .max(5),
});

export type StudyExtraction = z.infer<typeof extractionSchema> & {
  external_contexts: z.infer<typeof externalContextSchema>["contexts"];
};

export async function extractStudyMaterial({
  fileBuffer,
  fileName,
  mimeType,
  threadTitle,
}: {
  fileBuffer: Buffer;
  fileName: string;
  mimeType: string;
  threadTitle: string;
}): Promise<StudyExtraction> {
  requireEnv("OPENAI_API_KEY");

  const { object } = await generateObject({
    model: openai.responses(aiModels.extraction),
    schema: extractionSchema,
    schemaName: "study_material_extraction",
    system: [
      "You are Memora's production study-material extraction engine.",
      "Read the uploaded PDF/image deeply. User-uploaded content is the primary source of truth.",
      "Extract study knowledge that can later test understanding, not just memorization.",
      "For language material, prioritize vocabulary, grammar, examples, translations, common mistakes, and exercise patterns.",
      "For general material, prioritize concepts, relationships, misconceptions, examples, and assessment targets.",
      "Never invent facts not supported by the upload. Use source_page_hint whenever visible.",
    ].join(" "),
    messages: [
      {
        role: "user",
        content: [
          {
            type: "text",
            text: `Thread title: ${threadTitle}\nFile name: ${fileName}\nReturn structured extraction for a production review engine.`,
          },
          buildDocumentPart({ fileBuffer, fileName, mimeType }),
        ],
      },
    ],
  });

  const external_contexts = await enrichExtractionWithWeb({
    extraction: object,
    threadTitle,
    fileName,
  });

  return { ...object, external_contexts };
}

function buildDocumentPart({
  fileBuffer,
  fileName,
  mimeType,
}: {
  fileBuffer: Buffer;
  fileName: string;
  mimeType: string;
}): FilePart | ImagePart {
  if (mimeType.startsWith("image/")) {
    return { type: "image", image: fileBuffer, mediaType: mimeType };
  }

  return { type: "file", data: fileBuffer, filename: fileName, mediaType: mimeType };
}

async function enrichExtractionWithWeb({
  extraction,
  threadTitle,
  fileName,
}: {
  extraction: z.infer<typeof extractionSchema>;
  threadTitle: string;
  fileName: string;
}) {
  const queries = extraction.web_enrichment_queries.slice(0, 3);

  if (!queries.length) {
    return [];
  }

  try {
    const result = await generateText({
      model: openai.responses(aiModels.enrichment),
      tools: {
        web_search: openai.tools.webSearchPreview({ searchContextSize: "low" }),
      },
      stopWhen: stepCountIs(2),
      system: [
        "You enrich study material only when it clarifies the user's upload.",
        "Use web search for citations. Do not replace the uploaded material as the source of truth.",
        "Return JSON only, matching the requested schema.",
      ].join(" "),
      prompt: [
        `Thread: ${threadTitle}`,
        `File: ${fileName}`,
        `Detected topic: ${extraction.summary.detected_topic ?? "unknown"}`,
        `Queries: ${queries.join(" | ")}`,
        'Return JSON: {"contexts":[{"source_url":"https://...","source_title":"...","summary":"...","linked_topic":"...","confidence":0.8}]}',
      ].join("\n"),
    });

    return externalContextSchema.parse(extractJsonObject(result.text)).contexts;
  } catch (error) {
    Sentry.captureException(error, {
      tags: { feature: "study-extraction", stage: "web-enrichment" },
      extra: { queries, topic: extraction.summary.detected_topic },
    });
    return [];
  }
}

export function toKnowledgeRowContent(
  content: Record<string, unknown>,
): Record<string, unknown> {
  const compactContent = Object.fromEntries(
    Object.entries(content).filter(([, value]) => {
      if (value === null || value === undefined) {
        return false;
      }

      if (typeof value === "string" && value.trim().length === 0) {
        return false;
      }

      return true;
    }),
  );

  return {
    ...compactContent,
    extraction_version: STUDY_EXTRACTION_VERSION,
  };
}

export function countKnowledgeItems(
  items: Array<{ item_type: KnowledgeItemType }>,
  type: KnowledgeItemType,
) {
  return items.filter((item) => item.item_type === type).length;
}
