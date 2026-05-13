# Memora AI Memory & Context Architecture Research

Version: 2026-05-12

## Decision Summary

Memora should use a hybrid architecture:

- **Vercel AI SDK** for the Next.js chat runtime: `useChat`, streaming responses, UI message persistence, message IDs, and tool-call streaming.
- **Supabase** as the canonical product memory store: study threads, messages, uploads, extracted learning items, flashcards, review sessions, and thread memory summaries.
- **OpenAI Responses / Agents patterns** for model-side state, compaction, prompt caching, structured output, and optional short-term continuation.

The product should not rely on one giant conversation history as memory. A long-running study thread needs layered context assembly: stable instructions, compact thread summary, recent messages, retrieved learning items, and the current user input.

## Product Implication

The primary visible unit is now a **study thread**, similar to a chat history item. A thread can contain multiple uploads and can continue indefinitely. The dashboard is the first screen and should behave like an AI study workspace:

1. New user sees a new upload/study composer.
2. Returning user sees study-thread history.
3. Each thread has chat messages, uploads, extracted knowledge, review sessions, flashcards, progress, and a memory summary.
4. Folder organization is optional post-MVP, not the MVP's primary mental model.

## Recommended Runtime Pattern

### 1. Client and API Layer

Use Vercel AI SDK UI:

- `useChat` on the client for chat state and streaming UI.
- `DefaultChatTransport` configured to send only the latest message plus `threadId` for long conversations.
- Route handler with `streamText`.
- `convertToModelMessages` to convert UI messages to model-compatible messages.
- `validateUIMessages` before model calls when tool calls, custom metadata, or data parts are present.
- `onFinish` to persist the final assistant message and usage metadata.

Vercel's docs emphasize message persistence patterns where the server loads prior messages, validates them, streams the response, and saves the completed message set after streaming finishes.

### 2. Canonical Memory Store

Supabase remains the source of truth. Recommended MVP tables:

- `study_threads`
- `thread_messages`
- `thread_uploads`
- `thread_memories`
- `knowledge_items`
- `review_sessions`
- `session_questions`
- `flashcards`
- `flashcard_reviews`
- `upload_jobs`

This prevents vendor lock-in and keeps learning data queryable for dashboard metrics, review generation, and flashcards.

### 3. Per-Turn Context Assembly

Each model call should assemble context in this order:

1. Static system/developer instructions and JSON schemas.
2. Thread memory summary.
3. Recent N messages.
4. Retrieved knowledge items and missed items.
5. Current user message or upload event.

Static instructions should stay stable and first in the prompt because OpenAI prompt caching works best when repeated content appears at the beginning of the prompt. Dynamic user-specific content should come later.

### 4. Long Context Strategy

Do not send the full thread forever. Use thresholds:

- If recent messages are within budget, include them directly.
- If the thread grows, update `thread_memories.summary`.
- If the model-side context chain grows too long, use compaction between turns.
- Always keep structured learning state outside the LLM transcript: vocabulary, grammar, review performance, flashcard scheduling, and missed items are database records, not chat-only memory.

OpenAI documents multiple state options: manually passing messages, `previous_response_id`, Conversations API, and compaction. `previous_response_id` is useful for short chains, but prior inputs are still billed as input tokens in a chain, so it is not a complete cost-control strategy.

### 5. Tooling Model

Expose backend actions as tools or server-side functions:

- `extract_uploaded_material`
- `summarize_thread_memory`
- `retrieve_thread_knowledge`
- `generate_review_questions`
- `create_or_update_flashcards`
- `record_review_result`

For MVP, these can be server-side route/Edge Function calls orchestrated by the app. Full agent orchestration can be added later if the workflow becomes more autonomous.

## OpenAI vs Vercel AI SDK

### Use Vercel AI SDK For

- Next.js-first streaming UI.
- Chat transport and `useChat`.
- Persisting UI messages.
- Tool-call streaming to React.
- Provider abstraction if Memora later tests non-OpenAI models.

### Use OpenAI APIs / Agents Patterns For

- Structured extraction with multimodal models.
- Responses API state primitives.
- Prompt caching.
- Context compaction.
- Agents SDK session concepts if Memora later needs richer tool orchestration.

### Do Not Do

- Do not store only `previous_response_id` and assume that is product memory.
- Do not send the entire thread history on every turn after the thread becomes long.
- Do not store raw uploaded textbook files permanently.
- Do not treat compaction as a replacement for structured learning records.

## MVP Architecture Recommendation

Build MVP with:

1. Vercel AI SDK UI route for chat streaming.
2. Supabase persisted `study_threads` and `thread_messages`.
3. Supabase `thread_memories.summary` updated after meaningful turns/uploads.
4. Retrieval from `knowledge_items` for review/chat context.
5. OpenAI Responses API for extraction, structured output, and generation.
6. Prompt-cache-friendly context order.
7. Compaction as a later optimization once threads exceed a configured token budget.

This is the most practical architecture for Memora because it keeps the app fast and familiar like a chat product, while keeping learning state durable, queryable, and independent of the model transcript.

## Sources

- OpenAI Conversation State: https://platform.openai.com/docs/guides/conversation-state
- OpenAI Prompt Caching: https://platform.openai.com/docs/guides/prompt-caching/overview
- OpenAI Agents JS Sessions: https://openai.github.io/openai-agents-js/guides/sessions/
- Vercel AI SDK Message Persistence: https://v5.ai-sdk.dev/docs/ai-sdk-ui/chatbot-message-persistence
- Vercel AI Gateway Responses API: https://vercel.com/docs/ai-gateway/sdks-and-apis/responses/
