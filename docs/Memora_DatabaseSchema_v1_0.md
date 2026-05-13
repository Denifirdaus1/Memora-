# Memora - Database Schema Documentation v1.0 - May 2026

| **Memora** Database Schema Documentation v1.0 - Supabase PostgreSQL - May 2026 |
| --- |

| **Field** | **Detail** |
| --- | --- |
| **Database** | Supabase (PostgreSQL 15) |
| **Version** | v1.0 - Initial thread-first schema |
| **Total Tables** | 11 core tables |
| **Auth Provider** | Supabase Auth + Google OAuth 2.0 |
| **Security** | Row Level Security (RLS) enabled on all user-scoped tables |
| **Storage** | Supabase Storage - private temp-uploads bucket, TTL 15 min |
| **Related Docs** | Memora PRD v1.0, AI_Memory_Architecture_Research.md |

# **1. Schema Overview**

Memora's database is organized around chat-style study threads. A study thread is the primary user-visible history item, similar to a ChatGPT conversation, but backed by structured learning data. A thread can contain many messages, many uploads, many extracted knowledge items, review sessions, flashcards, and one compact memory record.

The core principle remains unchanged: no raw textbook image, PDF, or extracted page text is stored permanently. The database stores safe metadata, structured AI extraction results, review state, and compact AI memory summaries.

| **Table** | **Primary Responsibility** | **Key Relationships** |
| --- | --- | --- |
| **users** | User profiles and global preferences | Root of all user-scoped data |
| **study_threads** | Chat-history study workspaces | Belongs to users; parent of messages, uploads, knowledge, reviews |
| **thread_messages** | Persisted chat UI/model messages | Belongs to study_threads |
| **thread_uploads** | Safe upload metadata for each thread | Belongs to study_threads; parent of upload_jobs |
| **thread_memories** | Compact long-term thread summaries | One-to-one with study_threads |
| **knowledge_items** | AI-extracted learning units | Belongs to study_threads; source for questions and flashcards |
| **upload_jobs** | Background extraction job tracking | Belongs to study_threads and thread_uploads |
| **review_sessions** | Completed or in-progress review sessions | Belongs to study_threads |
| **session_questions** | Individual question records per review session | Belongs to review_sessions; references knowledge_items |
| **flashcards** | Spaced repetition card state (SM-2) | One-to-one with vocabulary knowledge_items per user |
| **flashcard_reviews** | Log of each flashcard review event | Belongs to flashcards |

# **2. Table Definitions**

## **2.1 users**

Mirrors Supabase Auth users and stores preferences used across all study threads.

| **Column** | **Type** | **Nullable** | **Description** |
| --- | --- | --- | --- |
| id | uuid | **NO** | Primary key. Matches auth.users.id. |
| email | text | **NO** | User email from OAuth provider. |
| display_name | text | **YES** | Display name from OAuth provider. |
| avatar_url | text | **YES** | Avatar URL from OAuth provider. |
| native_language | text | **YES** | User L1 language for translation questions. |
| preferred_session_duration_min | integer | **NO** | Default: 30. Allowed range: 10-60. |
| streak_current | integer | **NO** | Current daily review streak. Default: 0. |
| streak_longest | integer | **NO** | Longest historical daily review streak. Default: 0. |
| streak_last_date | date | **YES** | Last date with at least one completed review session. |
| created_at | timestamptz | **NO** | Default: now(). |
| updated_at | timestamptz | **NO** | Updated via trigger on row change. |

| **Index Name** | **On Column(s)** | **Purpose** |
| --- | --- | --- |
| **users_pkey** | id | Primary key lookup |
| **users_email_unique** | email | Prevent duplicate user profiles |

## **2.2 study_threads**

Primary user-visible workspace. A study thread behaves like a chat history item: it can start with one upload, continue with more uploads, preserve AI chat context, and become the parent context for review sessions and flashcards.

| **Column** | **Type** | **Nullable** | **Description** |
| --- | --- | --- | --- |
| id | uuid | **NO** | Primary key. Default: gen_random_uuid(). |
| user_id | uuid | **NO** | Foreign key -> users.id. CASCADE DELETE. |
| title | text | **NO** | User-visible title. Default generated from first upload or first user message. |
| status | text | **NO** | 'empty', 'processing', 'ready', 'needs_review', 'archived'. Default: 'empty'. |
| detected_language | text | **YES** | ISO 639-1 code of target language detected from extracted content. |
| detected_topic | text | **YES** | Short AI-detected topic description. |
| settings | jsonb | **NO** | Per-thread review settings. Default: all core question types enabled. |
| last_activity_at | timestamptz | **NO** | Updated on message, upload, review, or flashcard activity. |
| created_at | timestamptz | **NO** | Default: now(). |
| updated_at | timestamptz | **NO** | Updated via trigger on row change. |

### **settings JSONB Schema**

```json
{
  "question_types": {
    "multiple_choice": true,
    "fill_in_blank": true,
    "translation_l1_to_tl": true,
    "translation_tl_to_l1": true,
    "sentence_construction": false
  },
  "difficulty": "relaxed",
  "auto_update_memory": true
}
```

| **Index Name** | **On Column(s)** | **Purpose** |
| --- | --- | --- |
| **study_threads_pkey** | id | Primary key lookup |
| **study_threads_user_activity_idx** | user_id, last_activity_at DESC | Fetch dashboard history/sidebar |
| **study_threads_user_status_idx** | user_id, status | Fetch processing and ready-to-review states |

## **2.3 thread_messages**

Canonical persisted messages for each study thread. This table supports Vercel AI SDK UI message persistence and optional OpenAI Responses API state chaining.

| **Column** | **Type** | **Nullable** | **Description** |
| --- | --- | --- | --- |
| id | uuid | **NO** | Primary key. Default: gen_random_uuid(). |
| thread_id | uuid | **NO** | Foreign key -> study_threads.id. CASCADE DELETE. |
| user_id | uuid | **NO** | Denormalized for RLS. Must match study_threads.user_id. |
| role | text | **NO** | 'system', 'user', 'assistant', or 'tool'. |
| content | jsonb | **NO** | UIMessage parts or model message payload. Supports text, file refs, tool calls, and tool results. |
| provider | text | **YES** | Optional provider label such as 'openai'. |
| provider_response_id | text | **YES** | Optional OpenAI Responses API response id for short-term continuation. |
| token_count | integer | **YES** | Approximate token count for budgeting and compaction. |
| created_at | timestamptz | **NO** | Default: now(). |

| **Index Name** | **On Column(s)** | **Purpose** |
| --- | --- | --- |
| **thread_messages_pkey** | id | Primary key lookup |
| **thread_messages_thread_created_idx** | thread_id, created_at | Load recent messages in order |
| **thread_messages_user_id_idx** | user_id | RLS performance |

## **2.4 thread_uploads**

Safe metadata for every source file attached to a study thread. Raw files are stored only in the private temp-uploads bucket and deleted after extraction.

| **Column** | **Type** | **Nullable** | **Description** |
| --- | --- | --- | --- |
| id | uuid | **NO** | Primary key. Default: gen_random_uuid(). |
| thread_id | uuid | **NO** | Foreign key -> study_threads.id. CASCADE DELETE. |
| user_id | uuid | **NO** | Denormalized for RLS. |
| file_name | text | **NO** | Original filename for display purposes only. |
| file_size_bytes | integer | **YES** | File size for UI display. |
| mime_type | text | **NO** | image/jpeg, image/png, image/webp, or application/pdf. |
| page_count | integer | **YES** | Number of rendered pages if PDF; 1 for image uploads. |
| status | text | **NO** | 'queued', 'processing', 'done', 'failed', 'deleted'. |
| extraction_summary | jsonb | **YES** | Safe summary: item counts, detected language, detected topic. No raw content. |
| created_at | timestamptz | **NO** | Default: now(). |
| completed_at | timestamptz | **YES** | Null until extraction finishes or fails. |

| **Index Name** | **On Column(s)** | **Purpose** |
| --- | --- | --- |
| **thread_uploads_pkey** | id | Primary key lookup |
| **thread_uploads_thread_created_idx** | thread_id, created_at DESC | Upload history inside a thread |
| **thread_uploads_user_status_idx** | user_id, status | Dashboard processing states |

## **2.5 thread_memories**

Compact memory state for long-running study threads. This table keeps model context efficient without treating raw chat history as the only memory source.

| **Column** | **Type** | **Nullable** | **Description** |
| --- | --- | --- | --- |
| thread_id | uuid | **NO** | Primary key and foreign key -> study_threads.id. CASCADE DELETE. |
| user_id | uuid | **NO** | Denormalized for RLS. |
| summary | text | **NO** | Compact AI-generated summary of learning goals, material, weak areas, and recent progress. |
| key_terms | jsonb | **NO** | Important terms/topics for retrieval and dashboard hints. Default: []. |
| last_compacted_message_id | uuid | **YES** | Last thread_messages.id included in the summary. |
| token_budget | integer | **NO** | Target max context budget for this thread. Default: 12000. |
| updated_at | timestamptz | **NO** | Updated when memory is refreshed or compacted. |

| **Index Name** | **On Column(s)** | **Purpose** |
| --- | --- | --- |
| **thread_memories_pkey** | thread_id | One memory row per thread |
| **thread_memories_user_id_idx** | user_id | RLS performance |

## **2.6 knowledge_items**

The core learning-content table. Each row represents one discrete learning unit extracted by AI from an uploaded page. No raw file content is stored here - only structured, classified learning data.

| **Column** | **Type** | **Nullable** | **Description** |
| --- | --- | --- | --- |
| id | uuid | **NO** | Primary key. Default: gen_random_uuid(). |
| thread_id | uuid | **NO** | Foreign key -> study_threads.id. CASCADE DELETE. |
| upload_id | uuid | **YES** | Foreign key -> thread_uploads.id. SET NULL on delete. |
| user_id | uuid | **NO** | Denormalized for RLS. Must match study_threads.user_id. |
| item_type | text | **NO** | 'vocabulary', 'grammar_pattern', 'exercise_type', or 'topic_context'. |
| target_language | text | **NO** | ISO 639-1 code of target language. Inherited from thread detection. |
| content | jsonb | **NO** | Structured content. Schema varies by item_type. |
| source_page_hint | text | **YES** | Optional non-identifying source hint such as 'Page 33 - vocab table'. |
| times_seen | integer | **NO** | Count of times used in a review question. Default: 0. |
| times_correct | integer | **NO** | Count of correct answers when this item was tested. Default: 0. |
| created_at | timestamptz | **NO** | Default: now(). |

### **content JSONB Schema - by item_type**

**Type: vocabulary**

```json
{
  "term": "die Arbeit",
  "article": "die",
  "plural": "die Arbeiten",
  "translation": "pekerjaan",
  "context": "Berufe",
  "example_sentence": "Ich suche Arbeit.",
  "example_translation": "I am looking for work."
}
```

**Type: grammar_pattern**

```json
{
  "pattern_name": "Akkusativ - Indefinite Article",
  "rule": "Masculine: ein -> einen; Feminine: eine; Neuter: ein",
  "examples": [
    { "sentence": "Ich suche einen Arzt.", "translation": "I am looking for a doctor." },
    { "sentence": "Sie hat eine Arbeit.", "translation": "She has a job." }
  ],
  "related_patterns": ["Nominativ", "Dativ"]
}
```

**Type: exercise_type**

```json
{
  "format": "fill_in_blank",
  "description": "Complete sentences with profession vocabulary.",
  "page_hint": "Pages 34, 36, 38"
}
```

**Type: topic_context**

```json
{
  "topic": "Berufe",
  "subtopics": ["Arbeitsplatz", "Berufsbezeichnungen"],
  "level_hint": "A1"
}
```

| **Index Name** | **On Column(s)** | **Purpose** |
| --- | --- | --- |
| **knowledge_items_pkey** | id | Primary key lookup |
| **knowledge_items_thread_id_idx** | thread_id | Fetch all items in a thread for chat/review context |
| **knowledge_items_user_id_idx** | user_id | RLS performance |
| **knowledge_items_thread_type_idx** | thread_id, item_type | Fetch vocabulary-only or grammar-only from a thread |
| **knowledge_items_content_gin** | content (GIN) | Search across JSONB content fields |

## **2.7 upload_jobs**

Tracks background extraction jobs. Each uploaded file creates at least one job. Rows are retained for 7 days after completion for audit/debugging, then deleted by a scheduled cleanup job.

| **Column** | **Type** | **Nullable** | **Description** |
| --- | --- | --- | --- |
| id | uuid | **NO** | Primary key. Default: gen_random_uuid(). |
| thread_id | uuid | **NO** | Foreign key -> study_threads.id. CASCADE DELETE. |
| upload_id | uuid | **NO** | Foreign key -> thread_uploads.id. CASCADE DELETE. |
| user_id | uuid | **NO** | Denormalized for RLS. |
| file_name | text | **NO** | Original filename for display purposes only. |
| file_size_bytes | integer | **YES** | File size for UI display. |
| status | text | **NO** | 'pending', 'processing', 'done', or 'failed'. Default: 'pending'. |
| items_extracted | integer | **YES** | Count of knowledge_items created on success. Null until done. |
| error_message | text | **YES** | Human-readable error if status = 'failed'. |
| storage_path | text | **YES** | Supabase Storage path of temp file. Null after deletion. |
| started_at | timestamptz | **YES** | When the Edge Function picked up the job. |
| completed_at | timestamptz | **YES** | When extraction finished or failed. |
| created_at | timestamptz | **NO** | Default: now(). |

| **Index Name** | **On Column(s)** | **Purpose** |
| --- | --- | --- |
| **upload_jobs_pkey** | id | Primary key lookup |
| **upload_jobs_thread_id_idx** | thread_id | Fetch jobs for a thread UI |
| **upload_jobs_upload_id_idx** | upload_id | Fetch jobs for one upload |
| **upload_jobs_status_idx** | status | Cron cleanup and retry queues |
| **upload_jobs_user_id_idx** | user_id | RLS performance |

## **2.8 review_sessions**

Records each timed review session a user completes or abandons. Sessions are generated from a study thread's knowledge, memory summary, recent context, and thread-level question settings.

| **Column** | **Type** | **Nullable** | **Description** |
| --- | --- | --- | --- |
| id | uuid | **NO** | Primary key. Default: gen_random_uuid(). |
| thread_id | uuid | **NO** | Foreign key -> study_threads.id. CASCADE DELETE. |
| user_id | uuid | **NO** | Foreign key -> users.id. CASCADE DELETE. |
| status | text | **NO** | 'in_progress', 'completed', or 'abandoned'. Default: 'in_progress'. |
| score | integer | **NO** | Total points earned. Default: 0. |
| questions_total | integer | **NO** | Total questions presented. Default: 0. |
| questions_correct | integer | **NO** | Correct answers count. Default: 0. |
| duration_seconds | integer | **YES** | Actual session duration. Null if abandoned without completion. |
| scheduled_duration_min | integer | **NO** | Target session length in minutes. Default: 30. |
| started_at | timestamptz | **NO** | Default: now(). |
| ended_at | timestamptz | **YES** | Null until session completes or is abandoned. |

| **Index Name** | **On Column(s)** | **Purpose** |
| --- | --- | --- |
| **review_sessions_pkey** | id | Primary key lookup |
| **review_sessions_thread_started_idx** | thread_id, started_at DESC | Thread review history |
| **review_sessions_user_started_idx** | user_id, started_at DESC | Dashboard recent sessions |
| **review_sessions_status_idx** | status | Find in-progress sessions on app reload |

## **2.9 session_questions**

Stores every question presented in a review session: prompt, correct answer, user answer, result, timing, and explanation. This table powers most-missed-items and per-item accuracy.

| **Column** | **Type** | **Nullable** | **Description** |
| --- | --- | --- | --- |
| id | uuid | **NO** | Primary key. Default: gen_random_uuid(). |
| session_id | uuid | **NO** | Foreign key -> review_sessions.id. CASCADE DELETE. |
| thread_id | uuid | **NO** | Denormalized from review_sessions for thread analytics. |
| user_id | uuid | **NO** | Denormalized for RLS. |
| knowledge_item_id | uuid | **YES** | Foreign key -> knowledge_items.id. SET NULL on delete. |
| question_type | text | **NO** | 'multiple_choice', 'fill_in_blank', 'translation_l1_to_tl', 'translation_tl_to_l1', or 'sentence_construction'. |
| question_prompt | text | **NO** | The question text shown to the user. |
| correct_answer | text | **NO** | The correct answer string. |
| user_answer | text | **YES** | The submitted answer. Null if unanswered. |
| is_correct | boolean | **YES** | True/false result. Null if unanswered. |
| time_taken_ms | integer | **YES** | Milliseconds from question display to answer. |
| ai_explanation | text | **YES** | One-sentence AI-generated explanation shown after answer. |
| created_at | timestamptz | **NO** | Default: now(). |

| **Index Name** | **On Column(s)** | **Purpose** |
| --- | --- | --- |
| **session_questions_pkey** | id | Primary key lookup |
| **session_questions_session_id_idx** | session_id | Fetch all questions for summary screen |
| **session_questions_thread_id_idx** | thread_id | Thread analytics and no-repeat checks |
| **session_questions_user_id_idx** | user_id | RLS performance |
| **session_questions_item_id_idx** | knowledge_item_id | Aggregate accuracy per knowledge item |
| **session_questions_wrong_idx** | user_id, is_correct WHERE is_correct = false | Fast most-missed dashboard query |

## **2.10 flashcards**

One row per vocabulary knowledge_item per user. Stores SM-2 spaced repetition state. Cards are auto-created from vocabulary items in a study thread and can also be manually bookmarked from chat or review.

| **Column** | **Type** | **Nullable** | **Description** |
| --- | --- | --- | --- |
| id | uuid | **NO** | Primary key. Default: gen_random_uuid(). |
| thread_id | uuid | **NO** | Foreign key -> study_threads.id. CASCADE DELETE. |
| user_id | uuid | **NO** | Foreign key -> users.id. CASCADE DELETE. |
| knowledge_item_id | uuid | **NO** | Foreign key -> knowledge_items.id. CASCADE DELETE. Unique per user. |
| ef | numeric(4,2) | **NO** | SM-2 Easiness Factor. Starting value: 2.50. Minimum: 1.30. |
| interval_days | integer | **NO** | Current interval in days until next review. Default: 1. |
| repetitions | integer | **NO** | Consecutive successful reviews. Resets to 0 on Again. Default: 0. |
| due_date | date | **NO** | Next scheduled review date. Default: today. |
| is_manually_added | boolean | **NO** | True if bookmarked by user; false if auto-created. Default: false. |
| created_at | timestamptz | **NO** | Default: now(). |
| last_reviewed_at | timestamptz | **YES** | Timestamp of most recent review. Null if never reviewed. |

### **SM-2 Algorithm Reference**

| **UI Label** | **SM-2 Quality** | **Next Interval** | **Effect on EF** |
| --- | --- | --- | --- |
| **Again** | **0** | 1 day | EF decreases sharply. repetitions = 0. |
| **Hard** | **3** | interval x 1.2 | EF decreases slightly. |
| **Good** | **4** | interval x EF | EF unchanged. |
| **Easy** | **5** | interval x EF x 1.3 | EF increases. Next review further out. |

EF update formula: `EF_new = EF + (0.1 - (5 - q) * (0.08 + (5 - q) * 0.02))`

| **Index Name** | **On Column(s)** | **Purpose** |
| --- | --- | --- |
| **flashcards_pkey** | id | Primary key lookup |
| **flashcards_user_due_idx** | user_id, due_date | Fetch cards due today |
| **flashcards_thread_due_idx** | thread_id, due_date | Study due cards by thread |
| **flashcards_knowledge_item_user_unique** | knowledge_item_id, user_id | One card per item per user |

## **2.11 flashcard_reviews**

Append-only log of individual flashcard review events. Used for analytics and future learning-performance modeling.

| **Column** | **Type** | **Nullable** | **Description** |
| --- | --- | --- | --- |
| id | uuid | **NO** | Primary key. Default: gen_random_uuid(). |
| flashcard_id | uuid | **NO** | Foreign key -> flashcards.id. CASCADE DELETE. |
| thread_id | uuid | **NO** | Denormalized from flashcards for thread analytics. |
| user_id | uuid | **NO** | Denormalized for RLS. |
| rating | integer | **NO** | SM-2 quality score: 0, 3, 4, or 5. |
| ef_before | numeric(4,2) | **NO** | EF value before this review. |
| interval_before | integer | **NO** | interval_days before this review. |
| ef_after | numeric(4,2) | **NO** | EF value after this review. |
| interval_after | integer | **NO** | interval_days after this review. |
| reviewed_at | timestamptz | **NO** | Default: now(). |

| **Index Name** | **On Column(s)** | **Purpose** |
| --- | --- | --- |
| **flashcard_reviews_pkey** | id | Primary key lookup |
| **flashcard_reviews_flashcard_id_idx** | flashcard_id | History for a specific card |
| **flashcard_reviews_thread_reviewed_idx** | thread_id, reviewed_at DESC | Thread card-review history |
| **flashcard_reviews_user_id_idx** | user_id | RLS performance |

# **3. Table Relationships**

| **From Table** | **To Table** | **Type** | **Foreign Key** |
| --- | --- | --- | --- |
| **study_threads** | **users** | Many -> One | study_threads.user_id -> users.id (CASCADE DELETE) |
| **thread_messages** | **study_threads** | Many -> One | thread_messages.thread_id -> study_threads.id (CASCADE DELETE) |
| **thread_uploads** | **study_threads** | Many -> One | thread_uploads.thread_id -> study_threads.id (CASCADE DELETE) |
| **thread_memories** | **study_threads** | One -> One | thread_memories.thread_id -> study_threads.id (CASCADE DELETE) |
| **knowledge_items** | **study_threads** | Many -> One | knowledge_items.thread_id -> study_threads.id (CASCADE DELETE) |
| **knowledge_items** | **thread_uploads** | Many -> One | knowledge_items.upload_id -> thread_uploads.id (SET NULL) |
| **upload_jobs** | **study_threads** | Many -> One | upload_jobs.thread_id -> study_threads.id (CASCADE DELETE) |
| **upload_jobs** | **thread_uploads** | Many -> One | upload_jobs.upload_id -> thread_uploads.id (CASCADE DELETE) |
| **review_sessions** | **study_threads** | Many -> One | review_sessions.thread_id -> study_threads.id (CASCADE DELETE) |
| **session_questions** | **review_sessions** | Many -> One | session_questions.session_id -> review_sessions.id (CASCADE DELETE) |
| **session_questions** | **knowledge_items** | Many -> One | session_questions.knowledge_item_id -> knowledge_items.id (SET NULL) |
| **flashcards** | **study_threads** | Many -> One | flashcards.thread_id -> study_threads.id (CASCADE DELETE) |
| **flashcards** | **knowledge_items** | One -> One | flashcards.knowledge_item_id -> knowledge_items.id (CASCADE DELETE), unique per user |
| **flashcard_reviews** | **flashcards** | Many -> One | flashcard_reviews.flashcard_id -> flashcards.id (CASCADE DELETE) |

# **4. Row Level Security Policies**

| **CRITICAL: RLS must be enabled from migration zero. Every table listed below has `ALTER TABLE <name> ENABLE ROW LEVEL SECURITY` applied. Integration tests must verify cross-user isolation before deployment.** |
| --- |

All policies follow the same pattern: `auth.uid() = user_id`. The user_id column is denormalized onto user-scoped child tables specifically to make RLS policies simple, fast, and reliable.

| **Table** | **Operation** | **Policy Expression** |
| --- | --- | --- |
| **users** | **SELECT** | auth.uid() = id |
| **users** | **UPDATE** | auth.uid() = id |
| **study_threads** | **ALL** | auth.uid() = user_id |
| **thread_messages** | **ALL** | auth.uid() = user_id |
| **thread_uploads** | **ALL** | auth.uid() = user_id |
| **thread_memories** | **ALL** | auth.uid() = user_id |
| **knowledge_items** | **ALL** | auth.uid() = user_id |
| **upload_jobs** | **ALL** | auth.uid() = user_id |
| **review_sessions** | **ALL** | auth.uid() = user_id |
| **session_questions** | **ALL** | auth.uid() = user_id |
| **flashcards** | **ALL** | auth.uid() = user_id |
| **flashcard_reviews** | **ALL** | auth.uid() = user_id |

## **4.1 Service Role Exception**

Supabase Edge Functions use the service_role key, which bypasses RLS. This is intentional and required for the extraction pipeline to write thread_uploads, upload_jobs, knowledge_items, and memory updates on behalf of a user. Edge Functions must validate ownership before writing any data.

# **5. Supabase Storage Configuration**

## **5.1 temp-uploads Bucket**

A single private bucket named `temp-uploads` is used for all file uploads. Files are never made publicly accessible. The bucket is configured with a maximum file size of 10 MB and allowed MIME types of image/jpeg, image/png, image/webp, and application/pdf.

| **Setting** | **Value** |
| --- | --- |
| **Bucket Name** | temp-uploads |
| **Visibility** | Private - no public URL access |
| **File Path Pattern** | {user_id}/{thread_id}/{upload_id}/{filename} |
| **Max File Size** | 10 MB |
| **Allowed MIME Types** | image/jpeg, image/png, image/webp, application/pdf |
| **TTL (App-level)** | 15 minutes - Edge Function deletes on completion |
| **TTL (Cron fallback)** | Any file older than 15 min is deleted by a cron job every 5 min |

# **6. Migration Reference**

Migrations are managed with Supabase CLI. Run in order. Each file should be idempotent.

| **Migration File** | **Purpose** |
| --- | --- |
| 001_create_users.sql | users table + trigger to auto-create on auth.users insert |
| 002_create_study_threads.sql | study_threads table + settings JSONB + updated_at trigger |
| 003_create_thread_messages.sql | thread_messages table + message history indexes |
| 004_create_thread_uploads.sql | thread_uploads table + processing status indexes |
| 005_create_thread_memories.sql | thread_memories table for compact long-term context |
| 006_create_knowledge_items.sql | knowledge_items table + GIN index on content JSONB |
| 007_create_upload_jobs.sql | upload_jobs table + status and thread indexes |
| 008_create_review_sessions.sql | review_sessions table + indexes |
| 009_create_session_questions.sql | session_questions table + partial index on wrong answers |
| 010_create_flashcards.sql | flashcards table + unique constraint + SM-2 defaults |
| 011_create_flashcard_reviews.sql | flashcard_reviews append-only log table |
| 012_enable_rls.sql | Enable RLS on all tables + create all policies |
| 013_storage_bucket.sql | Create temp-uploads bucket + storage policies |
| 014_cron_cleanup.sql | pg_cron job: delete stale upload_jobs + orphaned storage files every 5 min |

## **6.1 Key Migration Snippets**

### **Auto-create user on OAuth login (001_create_users.sql)**

```sql
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.users (id, email, display_name, avatar_url)
  VALUES (
    NEW.id,
    NEW.email,
    NEW.raw_user_meta_data->>'full_name',
    NEW.raw_user_meta_data->>'avatar_url'
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
```

### **Streak update function (called after session completion)**

```sql
CREATE OR REPLACE FUNCTION public.update_streak(p_user_id uuid)
RETURNS void AS $$
DECLARE
  last_date date;
BEGIN
  SELECT streak_last_date INTO last_date FROM public.users WHERE id = p_user_id;

  IF last_date = CURRENT_DATE THEN
    RETURN;
  ELSIF last_date = CURRENT_DATE - INTERVAL '1 day' THEN
    UPDATE public.users
      SET streak_current = streak_current + 1,
          streak_last_date = CURRENT_DATE,
          streak_longest = GREATEST(streak_longest, streak_current + 1)
      WHERE id = p_user_id;
  ELSE
    UPDATE public.users
      SET streak_current = 1,
          streak_last_date = CURRENT_DATE,
          streak_longest = GREATEST(streak_longest, 1)
      WHERE id = p_user_id;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

### **Most missed items query (dashboard)**

```sql
SELECT
  ki.id,
  ki.thread_id,
  st.title AS thread_title,
  ki.content->>'term' AS term,
  ki.content->>'translation' AS translation,
  COUNT(*) AS times_missed
FROM session_questions sq
JOIN knowledge_items ki ON ki.id = sq.knowledge_item_id
JOIN study_threads st ON st.id = ki.thread_id
WHERE sq.user_id = auth.uid()
  AND sq.is_correct = false
  AND ki.item_type = 'vocabulary'
GROUP BY ki.id, ki.thread_id, st.title, ki.content->>'term', ki.content->>'translation'
ORDER BY times_missed DESC
LIMIT 10;
```

### **Flashcards due today query**

```sql
SELECT
  f.id,
  f.thread_id,
  st.title AS thread_title,
  f.ef,
  f.interval_days,
  ki.content
FROM flashcards f
JOIN knowledge_items ki ON ki.id = f.knowledge_item_id
JOIN study_threads st ON st.id = f.thread_id
WHERE f.user_id = auth.uid()
  AND f.due_date <= CURRENT_DATE
ORDER BY f.due_date ASC;
```

# **7. Naming Conventions & Standards**

| **Convention** | **Pattern** | **Example** |
| --- | --- | --- |
| **Tables** | Plural snake_case | study_threads, thread_messages |
| **Columns** | Singular snake_case | user_id, thread_id, created_at |
| **Primary Keys** | id (uuid), except one-to-one memory | id uuid DEFAULT gen_random_uuid() |
| **Foreign Keys** | {table_singular}_id | thread_id, upload_id, session_id |
| **Timestamps** | created_at, updated_at, _at suffix | started_at, completed_at, reviewed_at |
| **Booleans** | is_ or has_ prefix | is_correct, is_manually_added |
| **JSONB columns** | Singular noun or settings object | content, settings, key_terms |
| **Indexes** | {table}_{column(s)}_idx | knowledge_items_thread_id_idx |
| **Unique indexes** | {table}_{column(s)}_unique | flashcards_knowledge_item_user_unique |
| **Functions** | snake_case verbs | handle_new_user, update_streak |
| **Triggers** | on_{event}_{table} | on_auth_user_created |

# **8. Open Questions & Future Considerations**

## **8.1 Schema-level Open Questions**

- Should `thread_messages.content` store the exact Vercel AI SDK UIMessage object, a normalized internal message shape, or both?

- Should `thread_memories.summary` be user-editable, or only AI/system maintained?

- Should `thread_uploads.extraction_summary` include per-page counts, or only upload-level totals?

- What token budget should be enforced before `thread_memories` compaction is triggered? Current default: 12000 tokens.

- Should `session_questions.ai_explanation` be persisted, or generated only at runtime? Current design persists it for audit and review history.

- `flashcard_reviews` is append-only. At scale, a user reviewing 20 cards/day for 2 years creates about 14,600 rows. This is manageable in PostgreSQL but may need retention policy post-launch.

## **8.2 Future Schema Additions (Post-MVP)**

- `usage_events` table - append-only log of AI API calls per user/thread for billing, rate limiting, and model cost analysis.

- `thread_collections` table - optional organization layer if users later need folders/projects above study threads.

- `shared_threads` table - supports sharing a study thread with another user.

- `subscription_plans` table - tracks free/pro plan, billing cycle, and usage limits.

- `anki_exports` table - tracks Anki export jobs if export functionality is added post-MVP.

| **This document is the authoritative reference for Memora's database schema. Any schema changes must be reflected here before migration files are written.** |
| --- |

v1.0 - May 2026
