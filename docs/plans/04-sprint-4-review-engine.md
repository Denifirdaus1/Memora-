# Sprint 4 - Review Engine

Status: **Planned**

## Goal

Generate varied review questions from a study thread's extracted learning material.

## Scope

- Add/finish migrations for:
  - `review_sessions`
  - `session_questions`
- Generate review sessions from `knowledge_items`.
- Support initial question types:
  - multiple choice
  - fill in the blank
  - translation L1 to target language
  - translation target language to L1
  - sentence construction
- Enforce no-repeat within a session.
- Persist every question and answer.
- Show feedback after each answer.
- Show session summary.

## Not In Scope

- Advanced adaptive learning.
- Teacher-grade grading for long free-text answers.
- Multiplayer/shared review.

## Acceptance Criteria

- User can start review from a ready thread.
- System generates at least 10 varied questions.
- User can answer questions.
- Correctness and explanation are shown.
- Session summary shows score, accuracy, and missed items.
- No question prompt repeats in the same session.

## Test Plan

- Question generation schema validation.
- No-repeat unit test.
- Session scoring unit test.
- `pnpm lint`
- `pnpm test`
- `pnpm build`
- Playwright:
  - start review
  - answer question
  - see feedback
  - complete summary

## Dependencies

- Sprint 3 produces reliable `knowledge_items`.
- AI review question JSON schema locked.
- Token/context strategy for review generation confirmed.
