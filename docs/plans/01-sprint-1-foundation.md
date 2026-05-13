# Sprint 1 - Foundation

Status: **Done**

## Goal

Create the production-grade Next.js foundation for Memora and build the first chat-first UI shell using mock/data-contract-ready state.

## Completed Scope

- Next.js 16.2.6 App Router in project root.
- pnpm, TypeScript strict, Tailwind CSS, ESLint, Prettier.
- Vitest and Playwright configured.
- Production-style folder structure under `src/`.
- Routes created:
  - `/`
  - `/dashboard`
  - `/threads/new`
  - `/threads/[threadId]`
  - `/review/[sessionId]`
  - `/review/[sessionId]/summary`
  - `/flashcards`
  - `/settings`
- API contract placeholders:
  - `/api/chat`
  - `/api/uploads`
  - `/api/review`
- UI components created:
  - App shell
  - Sidebar study thread history
  - New Study Composer
  - Study Thread Workspace
  - Right panel memory/progress/upload summary
  - Review session mock
  - Flashcards mock
- TypeScript contracts for thread-first tables:
  - `StudyThread`
  - `ThreadMessage`
  - `ThreadUpload`
  - `ThreadMemory`
  - `KnowledgeItem`

## Verification Completed

- `pnpm lint` passed.
- `pnpm test` passed.
- `pnpm build` passed.
- `pnpm format` passed.
- `pnpm test:e2e` passed with 10 Playwright tests.

## Notes

- Current UI data is mock data.
- No real Supabase persistence yet.
- No real Google OAuth yet.
- No real upload or AI extraction yet.
- No real review question generation yet.

## Handoff To Sprint 2

Sprint 2 should replace mock study-thread data with authenticated Supabase-backed persistence for users, study threads, thread messages, and thread memories.
