# Sprint 3 - Upload + Extraction Pipeline

Status: **Planned**

## Goal

Allow users to attach PDF/image learning material to a study thread and process it through a safe upload/extraction pipeline.

## Scope

- Add migrations for:
  - `thread_uploads`
  - `upload_jobs`
  - `knowledge_items`
- Configure private `temp-uploads` Supabase Storage bucket.
- Implement upload inside New Study Composer and thread composer.
- Create `thread_uploads` rows.
- Create `upload_jobs` rows.
- Store files temporarily under `{user_id}/{thread_id}/{upload_id}/{filename}`.
- Add processing status UI in thread transcript and sidebar.
- Add extraction result placeholder or structured stub first.
- Add cleanup path that removes temporary files after processing.

## Not In Scope

- Full production-grade OCR tuning.
- Perfect AI extraction accuracy.
- Review question generation.
- Flashcard SM-2.

## Acceptance Criteria

- User can upload allowed files to a thread.
- Upload status appears in UI.
- Upload metadata persists in Supabase.
- Temporary storage path is cleared after job completion.
- Extracted knowledge placeholder writes valid `knowledge_items`.
- Thread status updates to `ready` when knowledge exists.

## Test Plan

- File type validation tests.
- File size validation tests.
- Upload job state transition tests.
- RLS access test for uploads and knowledge items.
- `pnpm lint`
- `pnpm test`
- `pnpm build`
- Playwright:
  - upload state appears
  - processing state appears
  - ready-to-review CTA appears after extraction stub

## Dependencies

- Sprint 2 authenticated thread persistence.
- Supabase Storage configured.
- Exact `knowledge_items.content` schema locked before real AI extraction.
