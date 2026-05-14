alter table public.thread_uploads
  drop constraint if exists thread_uploads_status_check;

alter table public.thread_uploads
  add constraint thread_uploads_status_check
  check (status in ('queued', 'uploaded', 'processing', 'extracted', 'done', 'failed', 'deleted'));

alter table public.thread_uploads
  add column if not exists ai_model text,
  add column if not exists extraction_version text,
  add column if not exists source_chunk_count integer not null default 0 check (source_chunk_count >= 0);

alter table public.knowledge_items
  drop constraint if exists knowledge_items_item_type_check;

alter table public.knowledge_items
  add constraint knowledge_items_item_type_check
  check (
    item_type in (
      'vocabulary',
      'grammar_pattern',
      'exercise_type',
      'topic_context',
      'concept',
      'example',
      'misconception',
      'assessment_target'
    )
  );

alter table public.knowledge_items
  add column if not exists difficulty text not null default 'medium'
    check (difficulty in ('easy', 'medium', 'hard')),
  add column if not exists confidence numeric(4, 3) not null default 0.75
    check (confidence >= 0 and confidence <= 1),
  add column if not exists mastery_score numeric(5, 2) not null default 0
    check (mastery_score >= 0 and mastery_score <= 100);

alter table public.session_questions
  drop constraint if exists session_questions_question_type_check;

alter table public.session_questions
  add constraint session_questions_question_type_check
  check (
    question_type in (
      'multiple_choice',
      'fill_in_blank',
      'translation_l1_to_tl',
      'translation_tl_to_l1',
      'sentence_construction',
      'cloze',
      'matching',
      'ordering',
      'short_answer',
      'explain_why',
      'error_correction'
    )
  );

create table if not exists public.source_chunks (
  id uuid primary key default gen_random_uuid(),
  thread_id uuid not null references public.study_threads(id) on delete cascade,
  upload_id uuid not null references public.thread_uploads(id) on delete cascade,
  user_id uuid not null references public.users(id) on delete cascade,
  chunk_index integer not null check (chunk_index >= 0),
  source_page_hint text,
  content_text text not null check (char_length(content_text) between 1 and 12000),
  visual_description text,
  confidence numeric(4, 3) not null default 0.75 check (confidence >= 0 and confidence <= 1),
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  unique (upload_id, chunk_index)
);

create index if not exists source_chunks_thread_idx
  on public.source_chunks (thread_id, chunk_index);

create index if not exists source_chunks_user_created_idx
  on public.source_chunks (user_id, created_at desc);

create table if not exists public.external_contexts (
  id uuid primary key default gen_random_uuid(),
  thread_id uuid not null references public.study_threads(id) on delete cascade,
  upload_id uuid references public.thread_uploads(id) on delete set null,
  knowledge_item_id uuid references public.knowledge_items(id) on delete set null,
  user_id uuid not null references public.users(id) on delete cascade,
  source_url text not null check (source_url ~* '^https?://'),
  source_title text not null check (char_length(source_title) between 1 and 300),
  summary text not null check (char_length(summary) between 1 and 2000),
  linked_topic text,
  confidence numeric(4, 3) not null default 0.7 check (confidence >= 0 and confidence <= 1),
  created_at timestamptz not null default now()
);

create index if not exists external_contexts_thread_idx
  on public.external_contexts (thread_id, created_at desc);

create index if not exists external_contexts_user_idx
  on public.external_contexts (user_id, created_at desc);

alter table public.source_chunks enable row level security;
alter table public.external_contexts enable row level security;

alter table public.source_chunks force row level security;
alter table public.external_contexts force row level security;

create policy source_chunks_select_own on public.source_chunks
for select using (user_id = (select auth.uid()));

create policy source_chunks_insert_own on public.source_chunks
for insert with check (user_id = (select auth.uid()));

create policy source_chunks_update_own on public.source_chunks
for update using (user_id = (select auth.uid()))
with check (user_id = (select auth.uid()));

create policy source_chunks_delete_own on public.source_chunks
for delete using (user_id = (select auth.uid()));

create policy external_contexts_select_own on public.external_contexts
for select using (user_id = (select auth.uid()));

create policy external_contexts_insert_own on public.external_contexts
for insert with check (user_id = (select auth.uid()));

create policy external_contexts_update_own on public.external_contexts
for update using (user_id = (select auth.uid()))
with check (user_id = (select auth.uid()));

create policy external_contexts_delete_own on public.external_contexts
for delete using (user_id = (select auth.uid()));
