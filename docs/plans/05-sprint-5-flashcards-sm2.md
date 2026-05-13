# Sprint 5 - Flashcards + SM-2

Status: **Planned**

## Goal

Turn extracted vocabulary into spaced repetition flashcards with SM-2 scheduling.

## Scope

- Add/finish migrations for:
  - `flashcards`
  - `flashcard_reviews`
- Auto-create cards from vocabulary `knowledge_items`.
- Allow manual bookmark from chat/review into flashcards.
- Implement SM-2 rating flow:
  - Again
  - Hard
  - Good
  - Easy
- Update due dates, interval, repetitions, and easiness factor.
- Show due cards across all threads and per active thread.

## Not In Scope

- Anki export.
- Custom deck sharing.
- Advanced leech handling.

## Acceptance Criteria

- Vocabulary item creates one flashcard per user.
- User can study due cards.
- Rating updates SM-2 state.
- Due count updates in sidebar/dashboard.
- User can filter flashcards by active thread.

## Test Plan

- SM-2 algorithm unit tests.
- Unique flashcard per knowledge item/user test.
- Due card query test.
- `pnpm lint`
- `pnpm test`
- `pnpm build`
- Playwright:
  - open flashcards
  - flip card
  - rate card
  - due count changes

## Dependencies

- Sprint 3 knowledge extraction.
- Sprint 4 review bookmark behavior if manual add is included.
