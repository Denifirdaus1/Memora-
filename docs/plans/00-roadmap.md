# Memora Implementation Roadmap

Last updated: May 12, 2026

## Current Status

Memora is currently in **Sprint 2 - Auth + Supabase Thread Persistence**.

The product direction is locked as:

- Chat-first AI study workspace.
- Dashboard as the main app shell, not analytics-first.
- Study threads as the primary user-visible unit.
- Upload/extraction/review/flashcards all scoped to `study_threads`.

## External Project Targets

- Supabase project URL: `https://anmfeqovegstkpexpymy.supabase.co`
- Supabase project ref: `anmfeqovegstkpexpymy`
- Supabase operations should use the `@supabase` plugin/connector as the primary project access path.

## Sprint Sequence

| Sprint | Plan | Status | Goal |
| --- | --- | --- | --- |
| 1 | [Foundation](./01-sprint-1-foundation.md) | Done | Next.js app, UI shell, routes, contracts, tests |
| 2 | [Auth + Supabase Thread Persistence](./02-sprint-2-auth-supabase-thread-persistence.md) | In Progress | Real auth, users, study threads, thread messages |
| 3 | [Upload + Extraction Pipeline](./03-sprint-3-upload-extraction-pipeline.md) | Planned | File upload, temp storage, upload jobs, extraction contract |
| 4 | [Review Engine](./04-sprint-4-review-engine.md) | Planned | Generate varied review questions from extracted knowledge |
| 5 | [Flashcards + SM-2](./05-sprint-5-flashcards-sm2.md) | Planned | Due cards, review ratings, spaced repetition state |
| 6 | [Dashboard Metrics + Production Hardening](./06-sprint-6-dashboard-metrics-hardening.md) | Planned | Real metrics, usage tracking, reliability, deployment readiness |

## Execution Rule

Before starting a sprint:

1. Read its plan file.
2. Confirm dependencies from earlier sprints are complete.
3. Implement only the sprint scope.
4. Run the listed acceptance tests.
5. Update the sprint status at the end.

## Important Product Constraints

- No folder-first UI in MVP.
- Raw uploaded files are temporary and must not be stored permanently.
- Supabase remains canonical memory; model-side state is optional optimization.
- Chat history alone is not learning memory. Structured data lives in tables.
- Direct OpenAI is acceptable for MVP; Vercel AI Gateway can be added later.
