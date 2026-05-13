# Sprint 6 - Dashboard Metrics + Production Hardening

Status: **Planned**

## Goal

Make dashboard metrics real and prepare the app for reliable deployment.

## Scope

- Replace mock progress widgets with real queries.
- Add metrics:
  - due flashcards
  - recent sessions
  - accuracy
  - streak
  - missed items
  - active processing jobs
- Add usage tracking for AI calls.
- Add rate limit strategy for AI and upload endpoints.
- Add production error handling.
- Add loading, empty, retry, and failure states across key flows.
- Prepare Vercel deployment configuration.

## Not In Scope

- Billing/subscriptions.
- Social sharing.
- Native mobile app.

## Acceptance Criteria

- Dashboard reflects real user data.
- Failed upload/extraction/review states are recoverable.
- App can be deployed to Vercel.
- Environment validation catches missing required keys.
- Core flows have smoke tests.

## Test Plan

- Metrics query tests.
- Error state tests.
- Rate-limit behavior tests if implemented.
- `pnpm lint`
- `pnpm test`
- `pnpm build`
- `pnpm test:e2e`
- Vercel preview deployment smoke check.

## Dependencies

- Sprint 2 auth/persistence.
- Sprint 3 uploads/extraction.
- Sprint 4 review sessions.
- Sprint 5 flashcards.
