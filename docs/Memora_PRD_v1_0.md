# Memora — Product Requirements Document — CONFIDENTIAL

| **Memora** AI-Powered Language Review Platform Product Requirements Document  •  v1.0  •  May 2026 |
| --- |

| **Field** | **Detail** |
| --- | --- |
| Product Name | Memora |
| Document Version | v1.0 — Initial PRD |
| Status | Ready for Development |
| Target Platform | Web App (Browser-first, Mobile-responsive) |
| Primary Language | Language-agnostic engine (MVP tested on German A1) |
| Auth Provider | Google OAuth 2.0 |
| Database | Supabase (PostgreSQL) |
| AI Model | GPT-5.4 (extraction) + GPT-5.4 Mini (question generation) |
| Target User (MVP) | Self-learner studying from physical/digital language books |
| Target User (v2+) | General public — any language, any structured learning material |

# **1. Executive Summary**

Memora solves a fundamental problem that every self-directed language learner faces: once you've worked through the exercises in your textbook, the material feels "done" even though your actual retention may still be weak. The solution is an AI-powered study workspace where users start a long-running study thread, upload pages from any language learning material, chat with the AI about that material, and turn the extracted knowledge into fresh review questions, flashcards, and progress signals.

The system is built around a chat-history metaphor. A new user is presented with a "new study thread" composer, similar to starting a new AI chat. Existing work appears as a study-thread history, and each thread can grow over time with more uploads, AI explanations, generated review sessions, flashcards, and memory summaries. Folder-style organization may exist later as an optional collection layer, but it is not the primary MVP mental model.

The platform is designed from the ground up to be production-grade and multi-tenant, meaning the first user (the product owner) validates the core learning experience while the architecture already supports a full SaaS product with multiple users, billing, and settings personalization.

# **2. Problem Statement**

## **2.1 The Core Learning Gap**

Traditional language textbooks are excellent teaching tools but poor review tools. Once a learner has completed an exercise, the answer is visible on the page, removing the retrieval practice that is essential for long-term retention. Spaced repetition apps like Anki solve the flashcard problem but require manual card creation, which is tedious and creates a barrier to starting.

The gap Memora fills is specifically the bridge between "I have studied this material" and "I can reliably recall and use this material." The product turns any page of a language textbook into an infinite source of fresh, AI-generated review questions that match the exact vocabulary, grammar, and context the learner has been studying.

## **2.2 Validated Problem Constraints**

Through product discovery, the following constraints have been established and locked in as design requirements. File content is never stored permanently — only structured extraction results are persisted in the database, addressing both privacy concerns and copyright risk from third-party educational materials. The study-thread model puts the user in control of context: a thread can represent a chapter, a topic, a week of study, or a broader learning journey. Question variety is controlled via per-thread settings rather than fixed global behavior, allowing each thread to have its own review style.

# **3. Goals & Success Metrics**

## **3.1 MVP Goals**

- Users can upload PDF or image files and receive a structured knowledge base within 5 minutes of uploading.

- AI extraction correctly identifies vocabulary, grammar patterns, and exercise types from multi-layout textbook pages with at least 85% accuracy on German A1 material.

- Users can complete a full 30-minute review session with no repeated questions within that session.

- Flashcard system correctly implements SM-2 spaced repetition and surfaces due cards at each login.

- The system handles file deletion automatically post-extraction with a visible status indicator in the UI.

## **3.2 Product Goals (v2+)**

- Support any target language without code changes — engine is language-agnostic from day one.

- Multi-user support with isolated data, Google OAuth authentication, and role-based settings.

- Monetization-ready architecture with usage tracking per user for future billing implementation.

# **4. User Personas**

## **Persona A — The Self-Directed Learner (Primary, MVP)**

| **Attribute** | **Detail** |
| --- | --- |
| Name | Rafi, 24 |
| Situation | Learning German A1 independently using Netzwerk Neu textbooks |
| Pain Point | Review sessions feel unstructured; finished exercises are useless for testing recall |
| Goal | A tool that generates fresh quiz questions from his own book material |
| Tech Comfort | Developer — comfortable with web apps, no hand-holding needed |
| Session Behavior | Studies 30–60 min/day, prefers focused timed sessions |

## **Persona B — The General Language Learner (Target, v2+)**

| **Attribute** | **Detail** |
| --- | --- |
| Name | Sarah, 31 |
| Situation | Learning Japanese for a relocation, using a mix of workbooks and printed worksheets |
| Pain Point | Existing apps don't know her specific study material — flashcard content feels generic |
| Goal | A review system that knows exactly what she has studied, not what an app thinks she should know |
| Tech Comfort | Non-developer — needs clear UI with minimal setup |
| Session Behavior | Irregular schedule, relies on spaced repetition to remember what needs review |

# **5. Feature Specifications**

## **5.1 Feature Priority Matrix**

| **Feature** | **Priority** | **Notes** |
| --- | --- | --- |
| Dashboard / Study Thread Home | **P0** | First screen after login; new upload composer plus study history |
| Chat-style Study Threads | **P0** | Long-running AI workspace with persisted messages, uploads, memory, and review actions |
| Upload & AI Extraction Pipeline | **P0** | Core of the product — every thread starts or grows from uploaded material |
| Thread-based Knowledge Base | **P0** | User-defined context, language-agnostic; replaces folder-first MVP model |
| Quiz / Review Session (30 min) | **P0** | Core review experience with timer and scoring |
| Flashcard System (SM-2) | **P1** | Spaced repetition for vocabulary retention |
| Score & Progress Dashboard | **P0** | Present from day one as the product home; starts with empty states and becomes data-rich |
| Per-thread Question Type Toggles | **P1** | User controls which question formats are active |
| Google OAuth Authentication | **P0** | Required for multi-user and data isolation |
| Auto file deletion with UI status | **P0** | Privacy and copyright compliance requirement |
| Multi-language engine | **P0** | Designed in from day one — no German-specific logic |
| Billing / Subscription System | **P3** | Out of MVP scope — architecture must support it |
| Mobile App (iOS/Android) | **P3** | Post-MVP — web must be mobile-responsive |

## **5.2 Upload & AI Extraction Pipeline**

### **5.2.1 Accepted Input Formats**

The system accepts JPEG, PNG, WEBP image files and PDF documents. For PDFs, each page is rendered as an image before being sent to the AI model. There is no limit on the number of pages per upload in terms of the data model, but the UI should communicate estimated processing time clearly.

### **5.2.2 Processing Flow**

- User selects one or more files and attaches them to an existing study thread or starts a new one.

- Files are uploaded to Supabase Storage in a temporary bucket with a TTL of 15 minutes.

- A background job (Supabase Edge Function) is triggered per file.

- Each image is sent to GPT-5.4 (multimodal vision) with a structured extraction prompt requesting JSON output.

- The JSON output is validated and written to the knowledge_items table in the database.

- The temporary file is deleted from Supabase Storage immediately after successful extraction.

- If extraction fails, the system retries once. On second failure, the file is deleted and the user is notified.

- The UI polls for job status every 3 seconds and shows a live progress indicator per file.

### **5.2.3 Extraction Output Schema (per page/image)**

| **The AI is instructed to return a structured JSON object. Raw file content is never stored. Only the parsed JSON is persisted to the database.** |
| --- |

Each extracted page produces one or more knowledge items, each classified into one of the following types: vocabulary (a word or phrase with translation and usage context), grammar_pattern (a grammatical structure with example sentences), exercise_type (the format of a practice activity found on the page, e.g. fill_in_the_blank, matching, dialogue), and topic_context (the thematic domain of the content, e.g. Berufe, Familie, Wohnen).

## **5.3 Chat-Style Study Threads**

Study threads are the primary organizational unit. A thread behaves like an AI chat session dedicated to a learning context. It can begin with one upload, but it can continue indefinitely: the user may add more pages, ask explanation questions, generate review sessions, revisit missed items, and build flashcards inside the same thread.

Each thread has a title, detected language, last activity timestamp, upload count, knowledge item counts, review readiness, and a compact AI-generated memory summary. The thread history shown in the dashboard replaces the folder list as the default navigation pattern. Optional folder/collection organization is deferred until after the thread model is proven.

## **5.4 Review Session**

### **5.4.1 Session Start**

The user opens a study thread and clicks Start Review. The session is initialized with a 30-minute countdown timer. The system generates an initial batch of 20 questions using GPT-5.4 Mini, instructed to use the thread knowledge base, recent thread context, and thread-level question settings.

### **5.4.2 Question Types**

| **Question Type** | **Description** |
| --- | --- |
| Multiple Choice | 4 options, one correct. Distractors generated from same knowledge base to be plausible. |
| Fill in the Blank | A sentence with one word removed. The missing word is from the thread's vocabulary or grammar pattern. |
| Translation (L1 → Target) | A word or short phrase in the user's native language, answer in target language. |
| Translation (Target → L1) | A word or short phrase in the target language, answer in native language. |
| Sentence Construction | Given words/fragments, user selects the correct word order. Uses grammar patterns from the thread. |

### **5.4.3 Feedback & Scoring**

After each answer the system immediately shows whether the answer was correct, displays the correct answer if wrong, and provides a one-sentence AI-generated explanation of why the answer is correct (e.g. explaining the grammar rule). Each correct answer is worth 10 points. A time bonus of up to 5 points is awarded for answers submitted within 10 seconds. The session ends when the timer reaches zero or the user manually ends it.

### **5.4.4 No-Repeat Guarantee**

Within a single session, no question prompt will repeat. The system tracks which knowledge items have been used in the current session and excludes them from the generation prompt for subsequent question batches.

## **5.5 Flashcard System**

Flashcards are automatically generated from vocabulary items in the thread knowledge base. Each vocabulary item produces one card (front: target language word, back: translation + example sentence). Users can also manually add cards from within the review session or study chat by clicking a bookmark icon on any useful item.

The spaced repetition algorithm used is SM-2, the same algorithm underlying Anki. Each card stores an easiness factor (starting at 2.5), a repetition count, a current interval in days, and the next due date. After viewing a card, the user rates it on a scale of Again (complete blank), Hard (recalled with difficulty), Good (recalled correctly with effort), and Easy (recalled instantly). These ratings map to SM-2 quality scores of 0, 3, 4, and 5 respectively, and the algorithm updates the interval and easiness factor accordingly.

The flashcard home screen shows the number of cards due today across all study threads. Users can study by thread or study all due cards in one session.

## **5.6 Score & Progress Dashboard**

The dashboard is the first screen a user sees after logging in. Its primary job is to start or continue a study thread, not to behave like a passive analytics page. For new users, the dominant UI is a new upload composer with drag-and-drop support for PDF/image files and a privacy notice. For returning users, the dashboard shows study-thread history, active processing jobs, "ready to review" states, due flashcards, recent sessions, and progress widgets.

## **5.7 Settings**

Global settings include the user's native language (used as L1 for translation questions), the preferred session duration (default 30 minutes, adjustable from 10 to 60), and notification preferences for daily review reminders. Per-thread settings include toggles for each question type (multiple choice, fill in blank, translation L1→target, translation target→L1, sentence construction), difficulty preference, and whether future uploads should automatically update the thread memory summary.

# **6. Technical Architecture**

## **6.1 Tech Stack**

| **Layer** | **Technology** |
| --- | --- |
| Frontend Framework | Next.js 14 (App Router) with TypeScript |
| Styling | Tailwind CSS + shadcn/ui component library |
| State Management | Zustand for client state, React Query for server state |
| Authentication | Google OAuth 2.0 via Supabase Auth |
| Database | Supabase (PostgreSQL) with Row Level Security enabled |
| File Storage | Supabase Storage — temporary bucket, TTL 15 minutes |
| Background Jobs | Supabase Edge Functions (Deno runtime) |
| AI UI Runtime | Vercel AI SDK (`useChat`, `streamText`, UI message persistence) |
| AI State & Memory | Supabase-backed study threads, persisted messages, thread memory summaries, retrieval, and OpenAI Responses/Agents compaction patterns |
| AI Model | GPT-5.4 (extraction) + GPT-5.4 Mini (chat/review/question generation) |
| Deployment | Vercel (frontend + API routes) |

## **6.2 AI Extraction Prompt Strategy**

The extraction prompt sent with each page image instructs the model to act as a structured data extractor for language learning materials. The model is told to identify and classify every learnable element on the page — vocabulary, grammar rules, exercise formats, and thematic context — and return them as a JSON array. Critically, the prompt explicitly instructs the model that it is working with language learning material which may contain tables, dialogue bubbles, caption text, and instruction text, and that it must classify each element by its role on the page, not just its textual content.

The prompt also instructs the model to detect the target language of the material automatically and record it in the output, enabling the language-agnostic architecture.

## **6.3 File Privacy Flow**

| **No raw file content (images, PDFs, or text extracted from them) is stored permanently in Memora's database. Only structured AI-extracted metadata is persisted. This is communicated clearly to users in the upload UI.** |
| --- |

When a user uploads a file, it enters a temporary Supabase Storage bucket configured with a 15-minute expiry. The Edge Function processing the file deletes it immediately upon successful extraction. If the job fails before completing, a cleanup cron job running every 5 minutes purges any files older than 15 minutes from the temporary bucket. This dual-deletion strategy ensures files cannot linger even in failure scenarios.

## **6.4 AI Memory & Context Architecture**

Memora must support long-running study threads without blindly sending the entire chat history to the model on every turn. The production architecture uses layered context:

1. **Static instruction prefix** — stable system/developer instructions, output schemas, and tool definitions. This stays at the beginning of prompts to maximize prompt-cache reuse.
2. **Thread memory summary** — compact, editable summary of the user's learning goals, detected language, uploaded material, weak areas, and prior review outcomes.
3. **Recent turns** — the most recent user/assistant messages needed for conversational continuity.
4. **Retrieved knowledge** — relevant `knowledge_items`, missed items, flashcards, and upload metadata selected by thread_id and semantic/keyword relevance.
5. **Current input** — the user's latest message, uploaded file reference, tool result, or review action.

The frontend should use Vercel AI SDK UI for streaming, message IDs, `useChat`, and persistence callbacks. The backend should persist messages and thread state in Supabase, validate loaded messages before model calls, and send only the current user message from the client when possible. OpenAI Responses API state (`previous_response_id` or Conversations API) may be used for short-term continuation, but Memora still owns canonical memory in Supabase so threads remain portable, auditable, and queryable.

When a thread becomes long, the system updates `thread_memories.summary` and may run compaction between turns. Compaction is not a substitute for structured learning memory: extracted vocabulary, grammar, flashcards, review scores, and missed items remain first-class database rows.

# **7. Data Model Overview**

The following describes the core tables in the Supabase PostgreSQL database. Row Level Security is enabled on all tables — users can only access rows where user_id matches their authenticated session.

| **Table** | **Purpose** |
| --- | --- |
| users | Mirrors Supabase Auth users — stores display name, native language preference, streak data |
| study_threads | Primary user-visible history item — title, detected target language, status, memory summary, last activity |
| thread_messages | Persisted chat-style UI/model messages for each study thread |
| thread_uploads | Upload records attached to a thread — status, temporary storage path, extraction metadata |
| thread_memories | Compact thread summaries, token budgets, compaction metadata, and memory update timestamps |
| knowledge_items | AI-extracted learning units — type (vocab/grammar/exercise/topic), content JSON, thread_id, detected language |
| review_sessions | Records of completed or in-progress review sessions — thread_id used, score, duration, timestamp |
| session_questions | Individual questions within a session — prompt, correct answer, user answer, was_correct, time_taken_ms |
| flashcards | One card per vocabulary knowledge_item — ef (easiness factor), interval, repetitions, due_date |
| flashcard_reviews | Log of each flashcard review — card_id, rating (0-5), reviewed_at |
| upload_jobs | Tracks background extraction jobs — file_name, status (pending/processing/done/failed), thread_id, created_at |

# **8. Key User Flows**

## **8.1 First-Time User Onboarding**

- User lands on marketing page → clicks Get Started.

- Google OAuth flow completes → user record created in Supabase.

- Onboarding modal asks for native language (for translation questions) → saved to users table.

- User is directed to the dashboard, where the primary empty state is a new study thread composer.

- Empty state shows drag-and-drop upload, optional first message, a brief explanation of how extraction works, and the privacy notice about file deletion.

## **8.2 Upload & Extraction Flow**

- User starts a new study thread or opens an existing thread → clicks Upload Pages or drops files into the composer.

- Selects one or more image files or a PDF.

- UI shows a file list with status indicators: Queued → Processing → Done / Failed.

- A persistent banner reads: "Your files are processed and immediately deleted. Only learning data is saved."

- On completion, the thread updates with an extraction summary, knowledge item counts, and a Start Review action.

## **8.3 Review Session Flow**

- User opens a study thread → clicks Start Review (30 min).

- Session screen loads with timer, question card, and answer input.

- After each answer: feedback card slides in showing correct/incorrect + explanation.

- User taps Next → new question loads. Questions are generated in batches of 20 in the background.

- At timer end: session summary screen shows score, accuracy, fastest/slowest answers, and a list of items to review.

- User can bookmark any question to add it to flashcards.

# **9. Out of MVP Scope**

| **The following features are explicitly excluded from v1.0 to keep scope focused. They must not influence the architecture in ways that would complicate MVP delivery.** |
| --- |

- Billing and subscription management (Stripe integration, usage limits).

- Native mobile applications (iOS / Android). Web must be mobile-responsive but native apps are post-MVP.

- Social features (shared study threads, leaderboards, study groups).

- Audio-based questions (pronunciation, listening comprehension).

- Integration with external learning platforms (Duolingo, Anki export/import).

- Admin dashboard for product owner analytics.

- Offline mode or PWA functionality.

# **10. Risks & Mitigations**

| **Risk** | **Severity** | **Mitigation** |
| --- | --- | --- |
| AI extraction misclassifies page elements | **High** | Implement a human-review step in the thread knowledge view where users can edit or delete extracted items before using them in review sessions. |
| OpenAI API costs exceed budget at scale | **Medium** | Track token usage per user from day one. Design the billing system to map cost to usage. Batch extraction jobs during off-peak hours. |
| File cleanup failure leaves orphaned data | **Medium** | Dual-deletion strategy: immediate delete on success + cron cleanup every 5 minutes for files older than TTL. |
| Supabase Row Level Security misconfiguration | **High** | All tables have RLS enabled from migration zero. Integration tests must verify cross-user data isolation before any deployment. |
| LLM generates repeated questions within a session | **Low** | Session tracks used knowledge_item IDs. Generation prompt explicitly lists excluded IDs. Fallback: if fewer than 5 items remain, session ends gracefully with a summary. |

# **11. AI Model Strategy & Cost Estimates**

Memora uses two OpenAI models — one for each distinct AI task. Using a single frontier model for everything would be unnecessarily expensive; the split below matches model capability to task complexity.

## **11.1 Model Assignments**

| **Task** | **Model & Reason** |
| --- | --- |
| Page extraction (OCR + classify) | GPT-5.4 (Vision) — needs multimodal + strong layout understanding for complex textbook pages with tables, dialogues, and mixed content. |
| Quiz question generation | GPT-5.4 Mini — straightforward JSON generation from a structured knowledge base. No vision needed; mini model is ~3x cheaper and more than sufficient. |
| SM-2 flashcard algorithm | No AI — pure deterministic algorithm. Zero LLM cost. |

## **11.2 Pricing Reference (May 2026)**

| **Model / Detail** | **Price** |
| --- | --- |
| GPT-5.4 — Input | $2.50 per 1M tokens |
| GPT-5.4 — Cached Input (auto) | $0.25 per 1M tokens — applies automatically, no code change needed |
| GPT-5.4 — Output | $15.00 per 1M tokens |
| GPT-5.4 Mini — Input | $0.75 per 1M tokens |
| GPT-5.4 Mini — Output | $4.50 per 1M tokens |
| Batch API discount | 50% off — usable for extraction jobs since they are async background tasks |

Cached input applies automatically: since the extraction system prompt is identical across all requests, the $0.25/M cached rate applies on every subsequent call — reducing system prompt input cost by 90% at no extra effort.

## **11.3 Cost Estimate — Personal MVP**

| **Estimates for one user (the product owner) during development and personal use.** |
| --- |

| **Scenario** | **Estimated Cost** |
| --- | --- |
| Upload & extract 50 book pages (one-time) | ~$0.25  (100K tokens x GPT-5.4) |
| 1 review session — 20 questions generated | ~$0.01  (3K in + 2K out x GPT-5.4 Mini) |
| 30 sessions in a month | ~$0.30  (90K in + 60K out x GPT-5.4 Mini) |
| Total per month (personal use) | < $1.00 / month |

## **11.4 Cost Estimate — Product Scale (100 active users/month)**

| **Scenario** | **Estimated Cost** |
| --- | --- |
| Extraction: avg 20 pages/user x 100 users | ~$5.00  (2M tokens x GPT-5.4) |
| Quiz gen: 30 sessions/user x 100 users | ~$34.00  (9M in + 6M out x GPT-5.4 Mini) |
| Total AI cost per month (100 users) | ~$39.00 / month |
| AI cost per user per month | ~$0.39 / user — leaves healthy margin at $5-8/mo subscription |

At $0.39/user/month AI cost, a subscription price of $5-8/month gives healthy unit economics. The usage_events table (planned for post-MVP) will enable per-user cost tracking for accurate billing design.

# **12. Suggested Sprint Plan**

| **Sprint** | **Focus** | **Deliverable** |
| --- | --- | --- |
| **Sprint 1** | **Dashboard, Auth & Thread Shell** | Next.js project, Supabase setup with RLS, Google OAuth, dashboard-first layout, new study thread composer, thread history shell. |
| **Sprint 2** | **Chat Persistence & Memory Foundation** | Vercel AI SDK route, persisted thread_messages, study_threads, thread_memories, server-side message validation, basic streaming chat. |
| **Sprint 3** | **Upload & Extraction Pipeline** | File upload to temp bucket inside a thread, Edge Function with GPT-5.4 multimodal extraction, knowledge_items populated, file auto-deletion verified. |
| **Sprint 4** | **Thread Knowledge UI** | Extracted item display, thread summary, memory summary updates, upload status polling, ready-to-review dashboard states. |
| **Sprint 5** | **Review Session Engine** | Question generation from thread knowledge, 30-min timer, all 5 question types, feedback UI, session scoring, session_questions logged. |
| **Sprint 6** | **Flashcards & Dashboard Metrics** | Auto-card generation from vocab items, SM-2 algorithm, due-today count, recent sessions, streak, accuracy, missed items. |
| **Sprint 7** | **Context Optimization & Production Hardening** | Token budgeting, compaction jobs, prompt-cache optimization, error handling, mobile responsiveness, RLS integration tests, deploy to Vercel. |

# **13. Open Questions for Next Session**

| **These questions are not blockers for starting Sprint 1, but must be answered before Sprint 2 begins.** |
| --- |

- What is the exact JSON schema for knowledge_items.content? This needs to be locked before the extraction prompt is written.

- Should the system support multiple native languages per user (for multilingual users), or is one native language per account sufficient for MVP?

- What happens when a user uploads material in a language the AI cannot reliably process (e.g. a rare script)? Define the failure UX.

- Is there a maximum study thread count or knowledge item count per user in MVP, or is it unlimited?

- Should users be able to export their knowledge base (e.g. as an Anki deck) in MVP, or is that a post-MVP feature?

- Should Memora use OpenAI server-managed Conversations for short-term state, or only Supabase-managed messages plus per-request context assembly for MVP?

- What token budget should be enforced per study-thread turn before compaction or retrieval trimming is triggered?

| **This document represents the complete product specification agreed upon through product discovery. Any changes to P0 features require explicit sign-off before implementation begins.** |
| --- |

v1.0 — May 2026
