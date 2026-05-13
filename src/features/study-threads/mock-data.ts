import type {
  StudyThread,
  ThreadMemory,
  ThreadMessage,
  ThreadUpload,
} from "@/types/database";

const defaultSettings: StudyThread["settings"] = {
  question_types: {
    multiple_choice: true,
    fill_in_blank: true,
    translation_l1_to_tl: true,
    translation_tl_to_l1: true,
    sentence_construction: false,
  },
  difficulty: "relaxed",
  auto_update_memory: true,
};

export const mockThreads: StudyThread[] = [
  {
    id: "kapitel-3",
    user_id: "demo-user",
    title: "Kapitel 3 - Berufe",
    status: "ready",
    detected_language: "de",
    detected_topic: "Professions and workplace",
    settings: defaultSettings,
    last_activity_at: "2026-05-12T10:40:00.000Z",
    created_at: "2026-05-12T09:10:00.000Z",
    updated_at: "2026-05-12T10:40:00.000Z",
  },
  {
    id: "a1-verbs",
    user_id: "demo-user",
    title: "A1 modal verbs worksheet",
    status: "processing",
    detected_language: "de",
    detected_topic: "Modal verbs",
    settings: defaultSettings,
    last_activity_at: "2026-05-12T10:28:00.000Z",
    created_at: "2026-05-12T10:02:00.000Z",
    updated_at: "2026-05-12T10:28:00.000Z",
  },
  {
    id: "network-notes",
    user_id: "demo-user",
    title: "Netzwerk notes - introductions",
    status: "needs_review",
    detected_language: "de",
    detected_topic: "Introductions",
    settings: defaultSettings,
    last_activity_at: "2026-05-10T15:18:00.000Z",
    created_at: "2026-05-09T07:30:00.000Z",
    updated_at: "2026-05-10T15:18:00.000Z",
  },
];

export const mockMessages: ThreadMessage[] = [
  {
    id: "msg-1",
    thread_id: "kapitel-3",
    user_id: "demo-user",
    role: "assistant",
    content: {
      text: "I extracted 24 vocabulary terms, 4 grammar patterns, and 3 exercise formats from your upload. Your material is ready to review.",
    },
    provider: "openai",
    provider_response_id: null,
    token_count: 48,
    created_at: "2026-05-12T10:20:00.000Z",
  },
  {
    id: "msg-2",
    thread_id: "kapitel-3",
    user_id: "demo-user",
    role: "user",
    content: { text: "Explain the accusative examples before I start the review." },
    provider: null,
    provider_response_id: null,
    token_count: 12,
    created_at: "2026-05-12T10:24:00.000Z",
  },
  {
    id: "msg-3",
    thread_id: "kapitel-3",
    user_id: "demo-user",
    role: "assistant",
    content: {
      text: "The key pattern is article change for masculine nouns: ein becomes einen in accusative, as in Ich suche einen Arzt.",
    },
    provider: "openai",
    provider_response_id: null,
    token_count: 36,
    created_at: "2026-05-12T10:24:30.000Z",
  },
];

export const mockUploads: ThreadUpload[] = [
  {
    id: "upload-1",
    thread_id: "kapitel-3",
    user_id: "demo-user",
    file_name: "kapitel3-page33.jpg",
    file_size_bytes: 820_000,
    mime_type: "image/jpeg",
    page_count: 1,
    status: "done",
    extraction_summary: {
      vocabulary: 24,
      grammar_patterns: 4,
      exercise_types: 3,
      detected_language: "de",
      detected_topic: "Professions and workplace",
    },
    created_at: "2026-05-12T10:18:00.000Z",
    completed_at: "2026-05-12T10:20:00.000Z",
  },
  {
    id: "upload-2",
    thread_id: "a1-verbs",
    user_id: "demo-user",
    file_name: "modal-verbs.pdf",
    file_size_bytes: 1_900_000,
    mime_type: "application/pdf",
    page_count: 8,
    status: "processing",
    extraction_summary: null,
    created_at: "2026-05-12T10:28:00.000Z",
    completed_at: null,
  },
];

export const mockMemory: ThreadMemory = {
  thread_id: "kapitel-3",
  user_id: "demo-user",
  summary:
    "This thread focuses on German A1 workplace vocabulary, article choice, and accusative examples from Kapitel 3.",
  key_terms: ["Berufe", "Arbeit", "Akkusativ", "Artikel"],
  last_compacted_message_id: "msg-3",
  token_budget: 12000,
  updated_at: "2026-05-12T10:25:00.000Z",
};
