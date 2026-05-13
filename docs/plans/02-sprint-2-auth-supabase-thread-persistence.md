# Sprint 2 - Auth + Supabase Thread Persistence

Status: **Done**

## Goal

Turn the Sprint 1 shell into a real authenticated app where users can create, view, and continue study threads from Supabase.

## Supabase Target

- Project URL: `https://anmfeqovegstkpexpymy.supabase.co`
- Project ref: `anmfeqovegstkpexpymy`
- Project operations should use the `@supabase` plugin/connector before falling back to manual SQL or dashboard steps.

## Scope

- Configure Supabase environment variables.
- Add Supabase migrations for:
  - `users`
  - `study_threads`
  - `thread_messages`
  - `thread_memories`
- Enable RLS policies for all Sprint 2 tables.
- Add Google OAuth via Supabase Auth.
- Add auth callback route.
- Add protected app routes for dashboard/thread pages.
- Add onboarding redirect for new users.
- Replace mock sidebar history with real `study_threads` query.
- Implement create new study thread flow.
- Persist basic user and assistant messages as `thread_messages`.
- Create default `thread_memories` row for each new thread.

## Not In Scope

- Real file upload.
- AI vision extraction.
- Review question generation.
- Flashcard scheduling.
- Billing.
- Production monitoring.

## Technical Interfaces

- `src/lib/supabase/client.ts` remains browser client entry.
- `src/lib/supabase/server.ts` remains server client entry.
- `src/server/queries/study-threads.ts` should switch from mock data to Supabase queries.
- `src/server/actions/create-study-thread.ts` should create real rows.
- `/api/chat` may persist messages, but model response can remain basic until AI prompt contracts are locked.

## Implementation Notes

- Applied Supabase migrations:
  - `sprint_2_auth_thread_persistence`
  - `harden_sprint_2_functions`
  - `revoke_public_function_execute`
  - `revoke_rls_auto_enable_execute`
- Public tables now exist with RLS enabled:
  - `users`
  - `study_threads`
  - `thread_messages`
  - `thread_memories`
- Local app env file uses:
  - `NEXT_PUBLIC_SUPABASE_URL`
  - `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`
- Auth flow implemented:
  - Google OAuth server action.
  - `/auth/callback` code exchange.
  - protected app routes.
  - onboarding completion action.
- Thread persistence implemented:
  - create study thread action.
  - sidebar reads `study_threads`.
  - thread workspace reads persisted thread/messages/memory.
  - thread composer stores user + assistant stub messages.
  - `/api/chat` persists user and assistant messages when used.

## Remaining Manual Validation

- Production Google OAuth validated.
- Redirect to onboarding validated.
- Redirect to dashboard after onboarding validated.

## Acceptance Criteria

- User can sign in with Google.
- New user gets a `users` row.
- New user can complete onboarding.
- Dashboard only loads for authenticated users.
- User can create a study thread.
- Sidebar lists that user's study threads from Supabase.
- Opening `/threads/[threadId]` loads real thread data.
- Cross-user access is blocked by RLS.

## Test Plan

- Supabase migration applies cleanly.
- RLS tests verify user A cannot read user B rows.
- `pnpm lint`
- `pnpm test`
- `pnpm build`
- Playwright smoke:
  - unauthenticated user redirects from `/dashboard`
  - authenticated user sees dashboard
  - create thread creates sidebar row
  - thread route loads persisted thread

## Dependencies

- Sprint 1 foundation complete.
- Supabase project credentials available.
- Google OAuth credentials configured in Supabase.
