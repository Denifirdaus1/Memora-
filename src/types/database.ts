export type StudyThreadStatus =
  | "empty"
  | "processing"
  | "ready"
  | "needs_review"
  | "archived";

export type MessageRole = "system" | "user" | "assistant" | "tool";

export type UploadStatus = "queued" | "processing" | "done" | "failed" | "deleted";

export type KnowledgeItemType =
  | "vocabulary"
  | "grammar_pattern"
  | "exercise_type"
  | "topic_context";

export interface UserProfile {
  id: string;
  email: string;
  display_name: string | null;
  avatar_url: string | null;
  native_language: string | null;
  preferred_session_duration_min: number;
  streak_current: number;
  streak_longest: number;
  streak_last_date: string | null;
  onboarding_completed_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface StudyThread {
  id: string;
  user_id: string;
  title: string;
  status: StudyThreadStatus;
  detected_language: string | null;
  detected_topic: string | null;
  settings: ThreadSettings;
  last_activity_at: string;
  created_at: string;
  updated_at: string;
}

export interface ThreadSettings {
  question_types: {
    multiple_choice: boolean;
    fill_in_blank: boolean;
    translation_l1_to_tl: boolean;
    translation_tl_to_l1: boolean;
    sentence_construction: boolean;
  };
  difficulty: "relaxed" | "challenging";
  auto_update_memory: boolean;
}

export interface ThreadMessage {
  id: string;
  thread_id: string;
  user_id: string;
  role: MessageRole;
  content: {
    text?: string;
    parts?: Array<Record<string, unknown>>;
    toolName?: string;
  };
  provider: string | null;
  provider_response_id: string | null;
  token_count: number | null;
  created_at: string;
}

export interface ThreadUpload {
  id: string;
  thread_id: string;
  user_id: string;
  file_name: string;
  file_size_bytes: number | null;
  mime_type: string;
  page_count: number | null;
  status: UploadStatus;
  extraction_summary: {
    vocabulary: number;
    grammar_patterns: number;
    exercise_types: number;
    detected_language: string | null;
    detected_topic: string | null;
  } | null;
  created_at: string;
  completed_at: string | null;
}

export interface ThreadMemory {
  thread_id: string;
  user_id: string;
  summary: string;
  key_terms: string[];
  last_compacted_message_id: string | null;
  token_budget: number;
  updated_at: string;
}

export interface KnowledgeItem {
  id: string;
  thread_id: string;
  upload_id: string | null;
  user_id: string;
  item_type: KnowledgeItemType;
  target_language: string;
  content: Record<string, unknown>;
  source_page_hint: string | null;
  times_seen: number;
  times_correct: number;
  created_at: string;
}
