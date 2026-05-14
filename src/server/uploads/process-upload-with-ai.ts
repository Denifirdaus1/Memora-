import type { SupabaseClient } from "@supabase/supabase-js";

import {
  countKnowledgeItems,
  extractStudyMaterial,
  STUDY_EXTRACTION_VERSION,
  toKnowledgeRowContent,
} from "@/server/ai/study-extraction";
import type { StudyThread } from "@/types/database";

export interface ProcessUploadWithAiInput {
  supabase: SupabaseClient;
  userId: string;
  thread: Pick<StudyThread, "id" | "title">;
  upload: {
    id: string;
    file_name: string;
    mime_type: string;
  };
  fileBuffer: Buffer;
}

export async function processUploadWithAi({
  supabase,
  userId,
  thread,
  upload,
  fileBuffer,
}: ProcessUploadWithAiInput) {
  const extraction = await extractStudyMaterial({
    fileBuffer,
    fileName: upload.file_name,
    mimeType: upload.mime_type,
    threadTitle: thread.title,
  });
  const completedAt = new Date().toISOString();

  await supabase
    .from("external_contexts")
    .delete()
    .eq("upload_id", upload.id)
    .eq("user_id", userId);
  await supabase
    .from("source_chunks")
    .delete()
    .eq("upload_id", upload.id)
    .eq("user_id", userId);
  await supabase
    .from("knowledge_items")
    .delete()
    .eq("upload_id", upload.id)
    .eq("user_id", userId);

  const { error: chunksError } = await supabase.from("source_chunks").insert(
    extraction.source_chunks.map((chunk) => ({
      thread_id: thread.id,
      upload_id: upload.id,
      user_id: userId,
      chunk_index: chunk.chunk_index,
      source_page_hint: chunk.source_page_hint,
      content_text: chunk.content_text,
      visual_description: chunk.visual_description,
      confidence: chunk.confidence,
      metadata: {
        extraction_version: STUDY_EXTRACTION_VERSION,
        file_name: upload.file_name,
      },
    })),
  );

  if (chunksError) {
    throw new Error(chunksError.message);
  }

  const knowledgeRows = extraction.knowledge_items.map((item) => ({
    thread_id: thread.id,
    upload_id: upload.id,
    user_id: userId,
    item_type: item.item_type,
    target_language: item.target_language,
    content: toKnowledgeRowContent(item.content),
    source_page_hint: item.source_page_hint,
    difficulty: item.difficulty,
    confidence: item.confidence,
  }));

  const { error: knowledgeError } = await supabase
    .from("knowledge_items")
    .insert(knowledgeRows);

  if (knowledgeError) {
    throw new Error(knowledgeError.message);
  }

  if (extraction.external_contexts.length) {
    const { error: externalContextError } = await supabase
      .from("external_contexts")
      .insert(
        extraction.external_contexts.map((context) => ({
          thread_id: thread.id,
          upload_id: upload.id,
          knowledge_item_id: null,
          user_id: userId,
          source_url: context.source_url,
          source_title: context.source_title,
          summary: context.summary,
          linked_topic: context.linked_topic,
          confidence: context.confidence,
        })),
      );

    if (externalContextError) {
      throw new Error(externalContextError.message);
    }
  }

  const { error: uploadError } = await supabase
    .from("thread_uploads")
    .update({
      status: "extracted",
      extraction_summary: {
        vocabulary: countKnowledgeItems(extraction.knowledge_items, "vocabulary"),
        grammar_patterns: countKnowledgeItems(
          extraction.knowledge_items,
          "grammar_pattern",
        ),
        exercise_types: countKnowledgeItems(extraction.knowledge_items, "exercise_type"),
        detected_language: extraction.summary.detected_language,
        detected_topic: extraction.summary.detected_topic,
      },
      source_chunk_count: extraction.source_chunks.length,
      ai_model: "gpt-5.4",
      extraction_version: STUDY_EXTRACTION_VERSION,
      completed_at: completedAt,
      error_message: null,
    })
    .eq("id", upload.id)
    .eq("user_id", userId);

  if (uploadError) {
    throw new Error(uploadError.message);
  }

  await supabase
    .from("study_threads")
    .update({
      status: "ready",
      detected_language: extraction.summary.detected_language,
      detected_topic: extraction.summary.detected_topic,
      last_activity_at: completedAt,
    })
    .eq("id", thread.id)
    .eq("user_id", userId);

  await supabase.from("thread_memories").upsert({
    thread_id: thread.id,
    user_id: userId,
    summary: extraction.thread_memory.summary,
    key_terms: extraction.thread_memory.key_terms,
    updated_at: completedAt,
  });

  return extraction;
}
