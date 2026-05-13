export type StudyThreadStatus =
  | "empty"
  | "processing"
  | "ready"
  | "needs_review"
  | "archived";

export type MessageRole = "system" | "user" | "assistant" | "tool";

export type UploadStatus = "queued" | "processing" | "done" | "failed" | "deleted";

export type UploadJobStatus = "queued" | "processing" | "done" | "failed";

export type ReviewSessionStatus = "active" | "completed" | "abandoned";

export type ReviewQuestionType =
  | "multiple_choice"
  | "fill_in_blank"
  | "translation_l1_to_tl"
  | "translation_tl_to_l1"
  | "sentence_construction";

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
  storage_bucket: string;
  storage_path: string;
  storage_deleted_at: string | null;
  error_message: string | null;
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

export interface UploadJob {
  id: string;
  upload_id: string;
  thread_id: string;
  user_id: string;
  status: UploadJobStatus;
  attempts: number;
  last_error: string | null;
  started_at: string | null;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
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

export interface ReviewSession {
  id: string;
  thread_id: string;
  user_id: string;
  status: ReviewSessionStatus;
  question_count: number;
  current_index: number;
  correct_count: number;
  score: number;
  settings: Record<string, unknown>;
  started_at: string;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface SessionQuestion {
  id: string;
  session_id: string;
  thread_id: string;
  user_id: string;
  knowledge_item_id: string | null;
  question_order: number;
  question_type: ReviewQuestionType;
  prompt: string;
  options: string[];
  correct_answer: string;
  acceptable_answers: string[];
  user_answer: string | null;
  is_correct: boolean | null;
  feedback: string | null;
  explanation: string;
  answered_at: string | null;
  created_at: string;
}
